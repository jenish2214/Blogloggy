import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/fetchMarketQuotes";
import { isMassiveConfigured } from "@/lib/market/massive";
import { getRegionSymbols } from "@/lib/markets/world-markets";
import { fromCache, fromCacheStale, toCache } from "@/lib/market-fetch";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
};

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region");
  const raw = req.nextUrl.searchParams.get("symbols");

  let symbols: string[];
  if (region) {
    const regionSymbols = getRegionSymbols(region);
    if (!regionSymbols) {
      return NextResponse.json({ error: "unknown_region" }, { status: 400 });
    }
    symbols = regionSymbols;
  } else {
    symbols = (raw ?? "AAPL,TSLA,MSFT,AMZN,NVDA")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 30);
  }

  const cacheKey = `quotes:v5:${symbols.join(",")}`;
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  if (!fresh) {
    const cached = fromCache<{ quotes: unknown[]; provider: string }>(cacheKey);
    if (cached) {
      return NextResponse.json(
        {
          quotes: cached.quotes,
          cached: true,
          provider: cached.provider,
          region: region ?? null,
        },
        { headers: CACHE_HEADERS }
      );
    }
  }

  try {
    const { quotes, provider } = await fetchMarketQuotes(symbols);
    const ttl = fresh ? 10_000 : isMassiveConfigured() ? 25_000 : 45_000;
    toCache(cacheKey, { quotes, provider }, ttl);

    return NextResponse.json(
      {
        quotes,
        cached: false,
        provider,
        region: region ?? null,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (err) {
    const stale = fromCacheStale<{ quotes: unknown[]; provider: string }>(cacheKey);
    if (stale) {
      return NextResponse.json(
        {
          quotes: stale.quotes,
          cached: true,
          stale: true,
          provider: stale.provider,
          region: region ?? null,
        },
        { headers: CACHE_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "fetch_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
