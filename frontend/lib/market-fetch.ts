/**
 * Server-side market data fetching utilities.
 * Used by Next.js API route handlers (edge-compatible).
 */

export function fmt(n: number | null | undefined, dec = 2): number | null {
  if (n == null || isNaN(n as number)) return null;
  return parseFloat((n as number).toFixed(dec));
}

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function fromCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  return null;
}

/** Expired server cache — used when upstream APIs fail (stale-while-revalidate). */
export function fromCacheStale<T>(key: string): T | null {
  const hit = cache.get(key);
  return hit ? (hit.data as T) : null;
}

export function toCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function fetchYahoo(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "QuantDesk/1.0" },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${symbol}`);
  return res.json();
}

export function parseQuote(symbol: string, data: Record<string, unknown>) {
  const q = (data as { chart?: { result?: unknown[] } })?.chart?.result?.[0] as Record<string, unknown> | undefined;
  if (!q) return { symbol, error: "no_data" };
  const meta = q.meta as Record<string, unknown>;
  const prev = (meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose) as number;
  const price = meta.regularMarketPrice as number;
  const change = price - prev;
  const changePct = (change / prev) * 100;
  return {
    symbol,
    name: meta.shortName ?? meta.longName ?? symbol,
    price: fmt(price),
    change: fmt(change),
    changePct: fmt(changePct),
    open: fmt(meta.regularMarketOpen as number),
    high: fmt(meta.regularMarketDayHigh as number),
    low: fmt(meta.regularMarketDayLow as number),
    volume: meta.regularMarketVolume ?? null,
    mktCap: meta.marketCap ?? null,
    currency: meta.currency ?? "USD",
    exchange: meta.exchangeName ?? "",
    type: symbol.endsWith("-USD") ? "crypto" : "stock",
    updatedAt: new Date().toISOString(),
  };
}

// Black-Scholes
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

export function blackScholes(S: number, K: number, T: number, r: number, sigma: number, type: "call" | "put") {
  if (T <= 0) return { price: Math.max(0, type === "call" ? S - K : K - S), delta: type === "call" ? 1 : -1, gamma: 0, theta: 0, vega: 0 };
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normalCDF(d1), Nd2 = normalCDF(d2);
  const price = type === "call"
    ? S * Nd1 - K * Math.exp(-r * T) * Nd2
    : K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  const delta = type === "call" ? Nd1 : Nd1 - 1;
  const gamma = Math.exp(-0.5 * d1 * d1) / (S * sigma * sqrtT * Math.sqrt(2 * Math.PI));
  const theta = (-(S * sigma * Math.exp(-0.5 * d1 * d1)) / (2 * sqrtT * Math.sqrt(2 * Math.PI))
    - r * K * Math.exp(-r * T) * (type === "call" ? Nd2 : normalCDF(-d2))) / 365;
  const vega = S * sqrtT * Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI) / 100;
  return { price: Math.max(0, price), delta, gamma, theta, vega, d1, d2 };
}
