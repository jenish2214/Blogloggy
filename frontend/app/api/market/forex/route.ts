import { NextResponse } from "next/server";
import { FOREX_PAIRS } from "@/lib/markets/forex-pairs";
import { fetchMarketQuotes } from "@/lib/market/fetchMarketQuotes";
import { fromCache, toCache, fmt } from "@/lib/market-fetch";

export const runtime = "nodejs";

export async function GET() {
  const cacheKey = "forex:v3";
  const cached = fromCache<{ pairs: unknown[]; provider: string }>(cacheKey);
  if (cached) {
    return NextResponse.json({ pairs: cached.pairs, cached: true, provider: cached.provider });
  }

  try {
    const { quotes, provider } = await fetchMarketQuotes(FOREX_PAIRS.map((p) => p.symbol));
    const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

    const pairs = FOREX_PAIRS.map((meta) => {
      const q = bySymbol.get(meta.symbol);
      const price = q?.price ?? 0;
      const change = q?.change ?? 0;
      const changePct = q?.changePct ?? 0;

      return {
        ...meta,
        price: fmt(price, price < 10 ? 5 : 3),
        change: fmt(change, 5),
        changePct: fmt(changePct, 3),
        bid: fmt(price, 5),
        ask: fmt(price, 5),
        updatedAt: q?.updatedAt ?? new Date().toISOString(),
        provider: q?.provider ?? "yahoo",
      };
    });

    toCache(cacheKey, { pairs, provider }, 60_000);
    return NextResponse.json({ pairs, cached: false, provider });
  } catch (err) {
    return NextResponse.json(
      { error: "fetch_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
