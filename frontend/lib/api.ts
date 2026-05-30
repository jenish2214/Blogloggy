/**
 * QuantDesk API client — calls Next.js API routes (deploys natively on Vercel).
 * Falls back to Express backend for local dev if NEXT_PUBLIC_API_BASE is set.
 */

import { cachedFetch } from "@/lib/clientFetchCache";

const MARKET_CACHE_MS = 20_000;
const MARKET_SLOW_CACHE_MS = 60_000;
const INDIA_CACHE_MS = 90_000;

/** User-specific data — reuse across page navigations */
const PORTFOLIO_CACHE_MS = 30_000;
const WEALTH_CACHE_MS = 30_000;
const DASHBOARD_CACHE_MS = 15_000;
const PROFILE_CACHE_MS = 5 * 60_000;
const WALLET_CACHE_MS = 30_000;
const SUGGESTIONS_CACHE_MS = 60_000;
const ORDERS_CACHE_MS = 30_000;
const WATCHLIST_CACHE_MS = 120_000;
const CLIENT_DETAIL_CACHE_MS = 60_000;

function apiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

async function apiFetchRaw<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  const url = `${base}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    const hint =
      typeof window !== "undefined" && !navigator.onLine
        ? "You appear to be offline."
        : "Check that the dev server is running.";
    const msg = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`${msg}. ${hint}`);
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    const body = await res.text().catch(() => "");
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: string };
      message = parsed.message ?? parsed.error ?? body;
    } catch {
      /* plain text */
    }
    throw new Error(message || `API ${res.status}`);
  }
  return res.json();
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { cacheTtlMs?: number; force?: boolean }
): Promise<T> {
  const method = init?.method ?? "GET";
  if (method !== "GET" || !options?.cacheTtlMs) {
    return apiFetchRaw<T>(path, init);
  }
  const key = `GET:${path}`;
  return cachedFetch<T>(key, options.cacheTtlMs, () => apiFetchRaw<T>(path, init), {
    force: options.force,
  });
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
  country?: string;
  type: "stock" | "crypto";
  updatedAt: string;
  error?: string;
}

export type MarketRegion = "us" | "india" | "uk" | "europe" | "asia" | "indices";

export interface MarketRegionInfo {
  id: MarketRegion;
  label: string;
  flag: string;
  currency: string;
  exchange: string;
  count: number;
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

export interface ForexQuote {
  symbol: string;
  label: string;
  base: string;
  quote: string;
  flag: string;
  price: number;
  change: number;
  changePct: number;
  bid: number;
  ask: number;
  updatedAt: string;
}

export const marketApi = {
  getQuotes: (symbols: string[], fresh = false) => {
    const list = symbols.filter(Boolean).slice(0, 30);
    if (list.length === 0) {
      return Promise.resolve({ quotes: [] as Quote[] });
    }
    const freshParam = fresh ? "&fresh=1" : "";
    const path = `/api/market/quotes?symbols=${encodeURIComponent(list.join(","))}${freshParam}`;
    return apiFetch<{ quotes: Quote[] }>(path, undefined, {
      cacheTtlMs: MARKET_CACHE_MS,
      force: fresh,
    });
  },
  getQuotesByRegion: (region: MarketRegion, fresh = false) => {
    const path = `/api/market/quotes?region=${region}${fresh ? "&fresh=1" : ""}`;
    return apiFetch<{ quotes: Quote[]; region: string }>(path, undefined, {
      cacheTtlMs: MARKET_CACHE_MS,
      force: fresh,
    });
  },
  getIndiaMarket: (fresh = false) => {
    const path = `/api/market/india${fresh ? "?fresh=1" : ""}`;
    return apiFetch<{
      quotes: import("@/types/india-market").IndiaMarketQuote[];
      cached?: boolean;
      provider?: string;
      fundamentalsAvailable?: boolean;
    }>(path, undefined, { cacheTtlMs: INDIA_CACHE_MS, force: fresh });
  },
  getIndiaCompany: (symbol: string) =>
    apiFetch<{ company: import("@/types/india-market").IndiaCompanyDetail; cached?: boolean }>(
      `/api/market/india/${encodeURIComponent(symbol.replace(/\.(NS|BO)$/i, ""))}`
    ),
  getRegions: () =>
    apiFetch<{ regions: MarketRegionInfo[] }>("/api/market/regions", undefined, {
      cacheTtlMs: 300_000,
    }),
  getForex: () =>
    apiFetch<{ pairs: ForexQuote[]; cached?: boolean }>("/api/market/forex", undefined, {
      cacheTtlMs: MARKET_SLOW_CACHE_MS,
    }),
  getChart: (symbol: string, range = "1d", interval = "5m") =>
    apiFetch<{ chart: ChartData }>(
      `/api/market/chart/${symbol}?range=${range}&interval=${interval}`,
      undefined,
      { cacheTtlMs: 30_000 }
    ),
  getCrypto: () =>
    apiFetch<{ coins: CoinQuote[] }>("/api/market/crypto", undefined, {
      cacheTtlMs: MARKET_SLOW_CACHE_MS,
    }),
  getIndices: () =>
    apiFetch<{ indices: IndexItem[] }>("/api/market/indices", undefined, {
      cacheTtlMs: MARKET_CACHE_MS,
    }),
  getMovers: () =>
    apiFetch<{ gainers: MoverItem[]; losers: MoverItem[]; mostActive: MoverItem[] }>(
      "/api/market/movers",
      undefined,
      { cacheTtlMs: MARKET_SLOW_CACHE_MS }
    ),
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

export interface AlgoSignalsResult {
  symbol: string;
  currentPrice: number;
  rsi: { value: number; signal: "buy" | "sell" | "neutral" };
  sma: { sma20: number; sma50: number; signal: "buy" | "sell" | "neutral" };
  macd: { macd: number; signal_line: number; histogram: number; signal: "buy" | "sell" };
  bollingerBands: { upper: number; middle: number; lower: number; pct: number; signal: "buy" | "sell" | "neutral" };
  volume: { ratio: number; avgVol: number; lastVol: number };
  composite: "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";
  change5d: number;
  change20d: number;
  dataPoints: number;
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

  getSignals: (symbol: string) =>
    apiFetch<AlgoSignalsResult>(`/api/trading/signals/${encodeURIComponent(symbol)}`),
};

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface ActiveBookPayload {
  portfolioId: string;
  clientId: string | null;
  accountType: "personal" | "client";
  label: string;
}

export interface BookMetrics {
  cash: number;
  /** Market value of open holdings (live price × qty). */
  invested: number;
  /** Sum of avg buy price × qty (cost basis in stocks). */
  costBasis: number;
  totalValue: number;
  startingCapital: number;
  totalPnl: number;
  totalPnlPct: number;
  unrealizedPnl: number;
  openPositions: number;
  orderCount: number;
}

export interface WealthBookSummary {
  portfolioId: string;
  clientId: string | null;
  accountType: "personal" | "client";
  accountLabel: string;
  clientCode: string | null;
  clientName: string | null;
  tier: string | null;
  riskProfile: string | null;
  status: string;
  metrics: BookMetrics;
  lastUpdated: string;
}

export interface WealthClient {
  id: string;
  client_code: string;
  display_name: string;
  email: string | null;
  tier: string;
  risk_profile: string;
  status: string;
  initial_capital: number;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ClientFormPayload {
  displayName: string;
  clientCode: string;
  email?: string;
  tier?: string;
  riskProfile?: string;
  status?: string;
  initialCapital?: number;
  notes?: string;
}

export interface ClientDetailResponse {
  client: WealthClient;
  portfolio: Record<string, unknown> | null;
  stats: { orderCount: number };
}

function bookQuery(book?: { portfolioId?: string; clientId?: string | null }) {
  if (!book?.portfolioId && !book?.clientId) return "";
  const q = new URLSearchParams();
  if (book.portfolioId) q.set("portfolioId", book.portfolioId);
  if (book.clientId) q.set("clientId", book.clientId);
  return `?${q.toString()}`;
}

export const portfolioApi = {
  get: (book?: { portfolioId?: string; clientId?: string | null }, force = false) =>
    apiFetch<{
      portfolio: Record<string, unknown>;
      positions: Record<string, unknown>[];
      orders: Record<string, unknown>[];
      activeBook?: ActiveBookPayload;
    }>(`/api/portfolio${bookQuery(book)}`, undefined, {
      cacheTtlMs: PORTFOLIO_CACHE_MS,
      force,
    }),
  placeOrder: (body: Record<string, unknown>) =>
    apiFetch<{ success: boolean; message: string; order?: Record<string, unknown> }>(
      "/api/portfolio",
      { method: "POST", body: JSON.stringify({ action: "place_order", ...body }) }
    ),
  syncPrices: (prices: Record<string, number>, book?: { portfolioId?: string; clientId?: string | null }) =>
    apiFetch<{ success: boolean; updated: number }>("/api/portfolio", {
      method: "POST",
      body: JSON.stringify({ action: "sync_prices", prices, ...book }),
    }),
};

export const wealthApi = {
  getBooks: (force = false) =>
    apiFetch<{
      books: WealthBookSummary[];
      summary: {
        firmAum: number;
        clientCount: number;
        personalAum: number;
        clientAum: number;
        totalCash: number;
        totalUnrealized: number;
        openPositions: number;
        lastUpdated: string;
      };
    }>("/api/wealth/books", undefined, { cacheTtlMs: WEALTH_CACHE_MS, force }),
  getBook: (book: { portfolioId?: string; clientId?: string | null }, force = false) =>
    apiFetch<{ book: Record<string, unknown> }>(`/api/wealth/books${bookQuery(book)}`, undefined, {
      cacheTtlMs: WEALTH_CACHE_MS,
      force,
    }),
  getClients: (force = false) =>
    apiFetch<{ clients: WealthClient[] }>("/api/wealth/clients", undefined, {
      cacheTtlMs: WEALTH_CACHE_MS,
      force,
    }),
  getClient: (id: string, force = false) =>
    apiFetch<ClientDetailResponse>(`/api/wealth/clients/${id}`, undefined, {
      cacheTtlMs: CLIENT_DETAIL_CACHE_MS,
      force,
    }),
  createClient: (body: ClientFormPayload) =>
    apiFetch<{ client: WealthClient; portfolio: Record<string, unknown> }>("/api/wealth/clients", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateClient: (id: string, body: Partial<ClientFormPayload>) =>
    apiFetch<{ client: WealthClient }>(`/api/wealth/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteClient: (id: string) =>
    apiFetch<{ success: boolean; deletedId: string }>(`/api/wealth/clients/${id}`, {
      method: "DELETE",
    }),
  seedDemoClients: () =>
    apiFetch<{ success: boolean; seeded: number }>("/api/wealth/clients/seed", { method: "POST" }),
};

export interface OrderHistoryResponse {
  orders: Record<string, unknown>[];
  stats: {
    total: number;
    returned: number;
    buyCount: number;
    sellCount: number;
    totalVolume: number;
    truncated: boolean;
  };
}

export interface StockSuggestionItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  suggestedShares: number;
  estimatedCost: number;
  pctOfCash: number;
  reason: string;
}

export const suggestionsApi = {
  getStocks: (book?: { portfolioId?: string; clientId?: string | null }, force = false) =>
    apiFetch<{
      cash: number;
      bookLabel: string;
      isNewUser: boolean;
      suggestions: StockSuggestionItem[];
      totalSuggested?: number;
      cashAfterSuggestions?: number;
    }>(`/api/suggestions/stocks${bookQuery(book)}`, undefined, {
      cacheTtlMs: SUGGESTIONS_CACHE_MS,
      force,
    }),
};

export const ordersApi = {
  getAll: (book?: { portfolioId?: string; clientId?: string | null }, force = false) =>
    apiFetch<OrderHistoryResponse>(`/api/orders${bookQuery(book)}`, undefined, {
      cacheTtlMs: ORDERS_CACHE_MS,
      force,
    }),
};

export const dashboardApi = {
  get: (
    opts?: { portfolioId?: string; clientId?: string | null; force?: boolean }
  ) => {
    const params = new URLSearchParams();
    if (opts?.portfolioId) params.set("portfolioId", opts.portfolioId);
    if (opts?.clientId) params.set("clientId", opts.clientId);
    const qs = params.toString();
    const path = qs ? `/api/dashboard?${qs}` : "/api/dashboard";
    return apiFetch<import("@/lib/dashboard/types").DashboardSummaryPayload>(path, undefined, {
      cacheTtlMs: DASHBOARD_CACHE_MS,
      force: opts?.force,
    });
  },
};

export const userApi = {
  getProfile: (force = false) =>
    apiFetch<{
      profile: Record<string, unknown> | null;
      feature_access?: import("@/lib/user/featureAccess").FeatureAccessMap;
      source?: string;
    }>("/api/user/profile", undefined, { cacheTtlMs: PROFILE_CACHE_MS, force }),
};

export interface WalletTransaction {
  id: string;
  portfolio_id: string;
  client_id: string | null;
  tx_type: "deposit" | "withdrawal";
  amount: number;
  status: string;
  note: string | null;
  balance_after: number | null;
  created_at: string;
}

export interface WalletSummaryResponse {
  book: {
    portfolioId: string;
    clientId: string | null;
    accountType: string;
    label: string;
    cash: number;
  };
  limits: {
    maxDepositPerTx: number;
    maxWithdrawal24h: number;
    withdrawn24h: number;
    withdrawalRemaining24h: number;
  };
  stats: {
    totalDeposits: number;
    totalWithdrawals: number;
    depositCount: number;
    withdrawalCount: number;
  };
  transactions: WalletTransaction[];
}

export const walletApi = {
  get: (book?: { portfolioId?: string; clientId?: string | null }, force = false) =>
    apiFetch<WalletSummaryResponse>(`/api/wallet${bookQuery(book)}`, undefined, {
      cacheTtlMs: WALLET_CACHE_MS,
      force,
    }),
  deposit: (body: {
    amount: number;
    note?: string;
    portfolioId?: string;
    clientId?: string | null;
  }) =>
    apiFetch<{ success: boolean; message: string; cash?: number }>("/api/wallet", {
      method: "POST",
      body: JSON.stringify({ action: "deposit", ...body }),
    }),
  withdraw: (body: {
    amount: number;
    note?: string;
    portfolioId?: string;
    clientId?: string | null;
  }) =>
    apiFetch<{ success: boolean; message: string; cash?: number }>("/api/wallet", {
      method: "POST",
      body: JSON.stringify({ action: "withdraw", ...body }),
    }),
};

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string | null;
  asset_class: string;
  added_at: string;
}

export const watchlistApi = {
  getAll: (force = false) =>
    apiFetch<{ items: WatchlistItem[] }>("/api/watchlist", undefined, {
      cacheTtlMs: WATCHLIST_CACHE_MS,
      force,
    }),
  add: (body: { symbol: string; name?: string; assetClass?: string }) =>
    apiFetch<{ item: WatchlistItem }>("/api/watchlist", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  remove: (symbol: string) =>
    apiFetch<{ success: boolean }>(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    }),
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
