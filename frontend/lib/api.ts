/**
 * QuantDesk API client — calls Next.js API routes (deploys natively on Vercel).
 * Falls back to Express backend for local dev if NEXT_PUBLIC_API_BASE is set.
 */

function apiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Market ────────────────────────────────────────────────────────────────────

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  mktCap: number | null;
  currency: string;
  exchange: string;
  type: "stock" | "crypto";
  updatedAt: string;
  error?: string;
}

export interface CoinQuote {
  symbol: string;
  name: string;
  coingeckoId: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  image: string;
}

export interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }

export interface ChartData {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  currentPrice: number;
  previousClose: number;
  candles: Candle[];
}

export interface MoverItem { symbol: string; name: string; price: number; changePct: number; volume: number; }
export interface IndexItem { symbol: string; name: string; price: number; change: number; changePct: number; currency: string; }

export const marketApi = {
  getQuotes: (symbols: string[]) => apiFetch<{ quotes: Quote[] }>(`/api/market/quotes?symbols=${symbols.join(",")}`),
  getChart: (symbol: string, range = "1d", interval = "5m") => apiFetch<{ chart: ChartData }>(`/api/market/chart/${symbol}?range=${range}&interval=${interval}`),
  getCrypto: () => apiFetch<{ coins: CoinQuote[] }>("/api/market/crypto"),
  getIndices: () => apiFetch<{ indices: IndexItem[] }>("/api/market/indices"),
  getMovers: () => apiFetch<{ gainers: MoverItem[]; losers: MoverItem[]; mostActive: MoverItem[] }>("/api/market/movers"),
  search: (q: string) => apiFetch<{ results: Array<{ symbol: string; name: string; exchange: string; type: string }> }>(`/api/market/search?q=${encodeURIComponent(q)}`),
};

// ── Trading ───────────────────────────────────────────────────────────────────

export interface OptionsChain {
  symbol: string;
  spotPrice: number;
  expirations: number[];
  calls: OptionsContract[];
  puts: OptionsContract[];
}

export interface OptionsContract {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  midpoint?: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number | null;
  inTheMoney: boolean;
}

export interface GreeksResult { price: number; delta: number; gamma: number; theta: number; vega: number; }

export interface BacktestResult {
  symbol: string;
  range: string;
  startPrice: number;
  endPrice: number;
  totalReturn: number;
  annualReturn: number;
  annualVolatility: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  maxDrawdown: number;
  var95Day?: number;
  cvar95Day?: number;
  tradingDays: number;
  equityCurve: { time: number; value: number }[];
}

export const tradingApi = {
  getOptionsChain: (symbol: string, expiry?: string) =>
    apiFetch<OptionsChain>(`/api/trading/options-chain/${symbol}${expiry ? `?expiry=${expiry}` : ""}`),

  priceOption: (params: { S: number; K: number; T: number; r?: number; sigma: number; type: "call" | "put" }) =>
    apiFetch<{ result: GreeksResult }>("/api/trading/price-option", { method: "POST", body: JSON.stringify(params) }),

  backtest: (symbol: string, range = "1y") =>
    apiFetch<BacktestResult>(`/api/trading/backtest?symbol=${symbol}&range=${range}`),

  getVolatility: (symbol: string) =>
    apiFetch<{ symbol: string; historicalVolatility30d: number }>(`/api/trading/volatility/${symbol}`),
};

// ── Portfolio ─────────────────────────────────────────────────────────────────

export const portfolioApi = {
  get: () => apiFetch<{ portfolio: Record<string,unknown>; positions: Record<string,unknown>[]; orders: Record<string,unknown>[] }>("/api/portfolio"),
  placeOrder: (body: Record<string, unknown>) => apiFetch<{ success: boolean; message: string }>("/api/portfolio", { method: "POST", body: JSON.stringify({ action: "place_order", ...body }) }),
};

// ── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  getAll: () => apiFetch<{ messages: Message[] }>("/api/messages"),
  markRead: (id?: string) => apiFetch("/api/messages", { method: "PATCH", body: JSON.stringify(id ? { id } : { readAll: true }) }),
};

export interface Message {
  id: string;
  type: "trade" | "alert" | "system" | "info";
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}
