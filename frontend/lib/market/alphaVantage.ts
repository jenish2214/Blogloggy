/**
 * Alpha Vantage market data (server-only).
 * @see https://www.alphavantage.co/documentation/
 */

import { fmt } from "@/lib/market-fetch";
import { inferCountryFromSymbol } from "@/lib/markets/world-markets";

const BASE_URL = "https://www.alphavantage.co/query";

/** Free tier: ~1 req/s and limited daily calls — we throttle and cache aggressively. */
const MIN_INTERVAL_MS = 1_100;
const MAX_CALLS_PER_DAY = 22;
const SYMBOL_CACHE_TTL_MS = 120_000;

export interface MarketQuoteRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  mktCap: number | null;
  currency: string;
  exchange: string;
  country: string;
  type: "stock" | "crypto" | "forex";
  updatedAt: string;
  provider?: "massive" | "finnhub" | "alphavantage" | "yahoo";
}

type AvKind = "equity" | "forex" | "crypto";

interface AvRoute {
  kind: AvKind;
  /** GLOBAL_QUOTE symbol */
  equity?: string;
  from?: string;
  to?: string;
}

let lastRequestAt = 0;
let dailyDate = "";
let dailyCount = 0;
const symbolCache = new Map<string, { quote: MarketQuoteRow; expiresAt: number }>();

function apiKey(): string | undefined {
  return process.env.ALPHAVANTAGE_API_KEY?.trim();
}

export function isAlphaVantageConfigured(): boolean {
  return !!apiKey();
}

function resetDailyIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyDate !== today) {
    dailyDate = today;
    dailyCount = 0;
  }
}

function canCallToday(): boolean {
  resetDailyIfNeeded();
  return dailyCount < MAX_CALLS_PER_DAY;
}

async function throttle(): Promise<void> {
  const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function parsePct(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(String(raw).replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function num(raw: string | undefined): number {
  const n = parseFloat(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Map app symbols to Alpha Vantage request shape. Returns null if unsupported. */
export function resolveAlphaVantageRoute(symbol: string): AvRoute | null {
  const s = symbol.toUpperCase().trim();

  if (s.endsWith("-USD") || s === "BTC-USD" || s === "ETH-USD") {
    const base = s.replace("-USD", "");
    return { kind: "crypto", from: base, to: "USD" };
  }

  if (s.includes("=X")) {
    const pair = s.replace("=X", "").replace("/", "");
    if (pair.length >= 6) {
      return { kind: "forex", from: pair.slice(0, 3), to: pair.slice(3, 6) };
    }
    if (pair.length === 6) {
      return { kind: "forex", from: pair.slice(0, 3), to: pair.slice(3) };
    }
  }

  if (s.includes("=F") || s === "CRUDE_OIL" || s === "NATURAL_GAS") {
    return null;
  }

  if (s === "GOLD") {
    return { kind: "equity", equity: "GLD" };
  }

  return { kind: "equity", equity: s };
}

async function avFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
  const key = apiKey();
  if (!key) throw new Error("ALPHAVANTAGE_API_KEY not set");

  if (!canCallToday()) {
    throw new Error("alpha_vantage_daily_limit");
  }

  await throttle();
  dailyCount += 1;

  const url = new URL(BASE_URL);
  url.searchParams.set("apikey", key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

  const data = (await res.json()) as Record<string, unknown>;

  if (data.Note || data.Information) {
    throw new Error(String(data.Note ?? data.Information));
  }
  if (data["Error Message"]) {
    throw new Error(String(data["Error Message"]));
  }

  return data;
}

function parseGlobalQuote(symbol: string, gq: Record<string, string>): MarketQuoteRow | null {
  const price = num(gq["05. price"]);
  if (price <= 0) return null;

  const change = num(gq["09. change"]);
  const changePct = parsePct(gq["10. change percent"]);

  return {
    symbol,
    name: gq["01. symbol"] ?? symbol,
    price: fmt(price) ?? price,
    change: fmt(change) ?? change,
    changePct: fmt(changePct) ?? changePct,
    open: fmt(num(gq["02. open"])),
    high: fmt(num(gq["03. high"])),
    low: fmt(num(gq["04. low"])),
    volume: parseInt(String(gq["06. volume"] ?? "0").replace(/,/g, ""), 10) || null,
    mktCap: null,
    currency: "USD",
    exchange: "Alpha Vantage",
    country: inferCountryFromSymbol(symbol),
    type: symbol.endsWith("-USD") ? "crypto" : "stock",
    updatedAt: new Date().toISOString(),
    provider: "alphavantage",
  };
}

async function fetchEquityQuote(symbol: string, avSymbol: string): Promise<MarketQuoteRow | null> {
  const data = await avFetch({ function: "GLOBAL_QUOTE", symbol: avSymbol });
  const gq = data["Global Quote"] as Record<string, string> | undefined;
  if (!gq) return null;
  return parseGlobalQuote(symbol, gq);
}

async function fetchForexQuote(symbol: string, from: string, to: string): Promise<MarketQuoteRow | null> {
  const data = await avFetch({
    function: "CURRENCY_EXCHANGE_RATE",
    from_currency: from,
    to_currency: to,
  });
  const rate = data["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
  if (!rate) return null;

  const price = num(rate["5. Exchange Rate"]);
  if (price <= 0) return null;

  return {
    symbol,
    name: `${from}/${to}`,
    price: fmt(price) ?? price,
    change: 0,
    changePct: 0,
    open: null,
    high: null,
    low: null,
    volume: null,
    mktCap: null,
    currency: to,
    exchange: "Alpha Vantage FX",
    country: "FX",
    type: "forex",
    updatedAt: rate["6. Last Refreshed"] ?? new Date().toISOString(),
    provider: "alphavantage",
  };
}

async function fetchCryptoQuote(symbol: string, from: string, to: string): Promise<MarketQuoteRow | null> {
  const data = await avFetch({
    function: "CURRENCY_EXCHANGE_RATE",
    from_currency: from,
    to_currency: to,
  });
  const rate = data["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
  if (!rate) return null;

  const price = num(rate["5. Exchange Rate"]);
  if (price <= 0) return null;

  return {
    symbol,
    name: `${from}/${to}`,
    price: fmt(price) ?? price,
    change: 0,
    changePct: 0,
    open: null,
    high: null,
    low: null,
    volume: null,
    mktCap: null,
    currency: to,
    exchange: "Alpha Vantage Crypto",
    country: "Crypto",
    type: "crypto",
    updatedAt: rate["6. Last Refreshed"] ?? new Date().toISOString(),
    provider: "alphavantage",
  };
}

async function fetchOneQuote(symbol: string): Promise<MarketQuoteRow | null> {
  const cached = symbolCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const route = resolveAlphaVantageRoute(symbol);
  if (!route) return null;

  let quote: MarketQuoteRow | null = null;

  if (route.kind === "equity" && route.equity) {
    quote = await fetchEquityQuote(symbol, route.equity);
  } else if (route.kind === "forex" && route.from && route.to) {
    quote = await fetchForexQuote(symbol, route.from, route.to);
  } else if (route.kind === "crypto" && route.from && route.to) {
    quote = await fetchCryptoQuote(symbol, route.from, route.to);
  }

  if (quote) {
    symbolCache.set(symbol, { quote, expiresAt: Date.now() + SYMBOL_CACHE_TTL_MS });
  }

  return quote;
}

/**
 * Fetch quotes via Alpha Vantage (sequential, rate-limited).
 * Skips symbols that are unsupported; returns partial results.
 */
export async function fetchAlphaVantageQuotes(
  symbols: string[]
): Promise<{ quotes: MarketQuoteRow[]; skipped: string[] }> {
  if (!isAlphaVantageConfigured()) {
    return { quotes: [], skipped: symbols };
  }

  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  const quotes: MarketQuoteRow[] = [];
  const skipped: string[] = [];

  for (const sym of unique) {
    if (!resolveAlphaVantageRoute(sym)) {
      skipped.push(sym);
      continue;
    }

    try {
      const q = await fetchOneQuote(sym);
      if (q) quotes.push(q);
      else skipped.push(sym);
    } catch {
      skipped.push(sym);
      if (!canCallToday()) break;
    }
  }

  return { quotes, skipped };
}
