import { NextRequest, NextResponse } from "next/server";
import { fromCache, toCache, fetchYahoo, parseQuote } from "@/lib/market-fetch";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") ?? "AAPL,TSLA,MSFT,AMZN,NVDA";
  const symbols = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 30);

  const key = `quotes:${symbols.join(",")}`;
  const cached = fromCache<unknown[]>(key);
  if (cached) return NextResponse.json({ quotes: cached, cached: true });

  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      try {
        const data = await fetchYahoo(sym);
        return parseQuote(sym, data);
      } catch {
        return { symbol: sym, error: "fetch_failed" };
      }
    })
  );

  const quotes = results.map((r) => r.status === "fulfilled" ? r.value : { error: "failed" });
  toCache(key, quotes, 30_000);
  return NextResponse.json({ quotes, cached: false });
}
