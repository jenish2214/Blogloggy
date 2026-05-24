import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/fetchMarketQuotes";
import {
  fetchIndiaCompare,
  summaryToFundamentals,
  toScreenerSymbol,
} from "@/lib/market/screenerIndia";
import { getRegionSymbols } from "@/lib/markets/world-markets";
import { fromCache, fromCacheStale, toCache } from "@/lib/market-fetch";
import type { IndiaMarketQuote } from "@/types/india-market";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=45, stale-while-revalidate=120",
};

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_KEY = "market:india:v1";
const CACHE_TTL = 120_000;
const SCREENER_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("screener_timeout")), ms)
    ),
  ]);
}

function liveQuotesOnly(
  liveQuotes: Awaited<ReturnType<typeof fetchMarketQuotes>>["quotes"],
  provider: string
): IndiaMarketQuote[] {
  return liveQuotes.map((q) => ({
    symbol: q.symbol,
    name: q.name?.replace(/\s+share price$/i, "") || q.symbol,
    price: q.price,
    change: q.change,
    changePct: q.changePct,
    open: q.open,
    high: q.high,
    low: q.low,
    volume: q.volume,
    mktCap: q.mktCap,
    currency: q.currency ?? "INR",
    exchange: q.exchange ?? "NSE",
    country: "India",
    type: "stock" as const,
    updatedAt: q.updatedAt,
    provider,
  }));
}

export async function GET(req: NextRequest) {
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";

  if (!fresh) {
    const cached = fromCache<{
      quotes: IndiaMarketQuote[];
      provider: string;
      fundamentalsAt: string | null;
      fundamentalsAvailable: boolean;
    }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true }, { headers: CACHE_HEADERS });
    }
  }

  const symbols = getRegionSymbols("india");
  if (!symbols?.length) {
    return NextResponse.json({ error: "india_symbols_missing" }, { status: 500 });
  }

  try {
    const livePromise = fetchMarketQuotes(symbols);
    const screenerPromise = withTimeout(fetchIndiaCompare(symbols), SCREENER_TIMEOUT_MS).catch(
      () => [] as Awaited<ReturnType<typeof fetchIndiaCompare>>
    );

    const [{ quotes: liveQuotes, provider }, summaries] = await Promise.all([
      livePromise,
      screenerPromise,
    ]);

    const fundamentalsAvailable = summaries.length > 0;

    if (!fundamentalsAvailable || summaries.length === 0) {
      const payload = {
        quotes: liveQuotesOnly(liveQuotes, provider),
        provider,
        fundamentalsAt: null as string | null,
        fundamentalsAvailable: false,
      };
      toCache(CACHE_KEY, payload, CACHE_TTL);
      return NextResponse.json({ ...payload, cached: false }, { headers: CACHE_HEADERS });
    }

    const summaryBySymbol = new Map(
      summaries.map((s) => [s.symbol.toUpperCase(), s])
    );

    const quotes: IndiaMarketQuote[] = liveQuotes.map((q) => {
      const summary = summaryBySymbol.get(toScreenerSymbol(q.symbol));
      const fundamentals = summary ? summaryToFundamentals(summary) : undefined;

      return {
        symbol: q.symbol,
        name: q.name?.replace(/\s+share price$/i, "") || summary?.name || q.symbol,
        price: q.price,
        change: q.change,
        changePct: q.changePct,
        open: q.open,
        high: q.high,
        low: q.low,
        volume: q.volume,
        mktCap: q.mktCap,
        currency: q.currency ?? "INR",
        exchange: q.exchange ?? "NSE",
        country: "India",
        type: "stock" as const,
        updatedAt: q.updatedAt,
        provider: `${provider}+screener.in`,
        fundamentals,
      };
    });

    for (const s of summaries) {
      const yahooSym = symbols.find((sym) => toScreenerSymbol(sym) === s.symbol.toUpperCase());
      if (!yahooSym) continue;
      if (quotes.some((q) => toScreenerSymbol(q.symbol) === s.symbol.toUpperCase())) continue;
      quotes.push({
        symbol: yahooSym,
        name: s.name,
        price: 0,
        change: 0,
        changePct: 0,
        open: null,
        high: null,
        low: null,
        volume: null,
        mktCap: null,
        currency: "INR",
        exchange: "NSE",
        country: "India",
        type: "stock",
        updatedAt: new Date().toISOString(),
        provider: "screener.in",
        fundamentals: summaryToFundamentals(s),
      });
    }

    const payload = {
      quotes,
      provider: `${provider}+screener.in`,
      fundamentalsAt: new Date().toISOString(),
      fundamentalsAvailable: true,
    };

    toCache(CACHE_KEY, payload, CACHE_TTL);

    return NextResponse.json({ ...payload, cached: false }, { headers: CACHE_HEADERS });
  } catch (err) {
    const stale = fromCacheStale<{
      quotes: IndiaMarketQuote[];
      provider: string;
      fundamentalsAt: string | null;
      fundamentalsAvailable: boolean;
    }>(CACHE_KEY);
    if (stale) {
      return NextResponse.json(
        { ...stale, cached: true, stale: true },
        { headers: CACHE_HEADERS }
      );
    }
    return NextResponse.json(
      {
        error: "india_market_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
