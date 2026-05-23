/**
 * Massive.com market data (formerly Polygon.io).
 * @see https://massive.com/docs/rest/stocks/aggregates/previous-day-bar
 */

import { fmt } from "@/lib/market-fetch";
import { inferCountryFromSymbol } from "@/lib/markets/world-markets";
import type { MarketQuoteRow } from "@/lib/market/alphaVantage";
import { toMassiveSymbol } from "@/lib/market/massiveSymbols";

const BASE_URL = process.env.MASSIVE_API_BASE_URL?.trim() || "https://api.massive.com";
const CACHE_TTL_MS = 20_000;

interface AggBar {
  o?: number;
  c?: number;
  h?: number;
  l?: number;
  v?: number;
  vw?: number;
}

interface PrevAggResponse {
  status?: string;
  results?: AggBar[];
  ticker?: string;
}

const quoteCache = new Map<string, { quote: MarketQuoteRow; expiresAt: number }>();

function apiKey(): string | undefined {
  return (
    process.env.MASSIVE_API_KEY?.trim() ||
    process.env.POLYGON_API_KEY?.trim()
  );
}

export function isMassiveConfigured(): boolean {
  return !!apiKey();
}

async function fetchPrevBar(massiveTicker: string): Promise<AggBar | null> {
  const key = apiKey();
  if (!key) return null;

  const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(massiveTicker)}/prev?adjusted=true&apiKey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as PrevAggResponse;
  if (data.status !== "OK" || !data.results?.[0]) return null;

  return data.results[0];
}

function barToQuote(portfolioSymbol: string, bar: AggBar): MarketQuoteRow | null {
  const close = bar.c ?? 0;
  const open = bar.o ?? close;
  if (close <= 0) return null;

  const change = close - open;
  const changePct = open > 0 ? (change / open) * 100 : 0;

  return {
    symbol: portfolioSymbol,
    name: portfolioSymbol,
    price: fmt(close) ?? close,
    change: fmt(change) ?? change,
    changePct: fmt(changePct) ?? changePct,
    open: fmt(open),
    high: fmt(bar.h),
    low: fmt(bar.l),
    volume: bar.v ?? null,
    mktCap: null,
    currency: portfolioSymbol.includes("=X") ? "FX" : "USD",
    exchange: "Massive",
    country: inferCountryFromSymbol(portfolioSymbol),
    type: portfolioSymbol.endsWith("-USD")
      ? "crypto"
      : portfolioSymbol.includes("=X")
        ? "forex"
        : "stock",
    updatedAt: new Date().toISOString(),
    provider: "massive",
  };
}

async function fetchOneQuote(portfolioSymbol: string): Promise<MarketQuoteRow | null> {
  const cached = quoteCache.get(portfolioSymbol);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const massiveTicker = toMassiveSymbol(portfolioSymbol);
  if (!massiveTicker) return null;

  try {
    const bar = await fetchPrevBar(massiveTicker);
    if (!bar) return null;
    const quote = barToQuote(portfolioSymbol, bar);
    if (quote) {
      quoteCache.set(portfolioSymbol, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return quote;
  } catch {
    return null;
  }
}

/** Fetch quotes via Massive REST (previous-day / latest available bar on your plan). */
export async function fetchMassiveQuotes(symbols: string[]): Promise<{
  quotes: MarketQuoteRow[];
  skipped: string[];
}> {
  if (!isMassiveConfigured()) {
    return { quotes: [], skipped: symbols };
  }

  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  const quotes: MarketQuoteRow[] = [];
  const skipped: string[] = [];

  await Promise.all(
    unique.map(async (ps) => {
      if (!toMassiveSymbol(ps)) {
        skipped.push(ps);
        return;
      }
      const q = await fetchOneQuote(ps);
      if (q) quotes.push(q);
      else skipped.push(ps);
    })
  );

  return { quotes, skipped };
}
