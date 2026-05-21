import { NextRequest, NextResponse } from "next/server";
import { fromCache, toCache, fmt } from "@/lib/market-fetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const range = req.nextUrl.searchParams.get("range") ?? "1d";
  const interval = req.nextUrl.searchParams.get("interval") ?? "5m";
  const key = `chart:${sym}:${range}:${interval}`;
  const cached = fromCache<unknown>(key);
  if (cached) return NextResponse.json({ chart: cached, symbol: sym, cached: true });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "symbol_not_found" }, { status: 404 });

    const times: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const candles = times.map((t: number, i: number) => ({
      time: t,
      open: fmt(q.open?.[i]),
      high: fmt(q.high?.[i]),
      low: fmt(q.low?.[i]),
      close: fmt(q.close?.[i]),
      volume: q.volume?.[i] ?? null,
    })).filter((c: { close: number | null }) => c.close != null);

    const meta = result.meta;
    const chart = {
      symbol: sym,
      name: meta.shortName ?? sym,
      currency: meta.currency ?? "USD",
      exchange: meta.exchangeName ?? "",
      currentPrice: fmt(meta.regularMarketPrice),
      previousClose: fmt(meta.chartPreviousClose ?? meta.previousClose),
      candles,
    };

    const ttl = range === "1d" ? 30_000 : range === "5d" ? 120_000 : 600_000;
    toCache(key, chart, ttl);
    return NextResponse.json({ chart, symbol: sym, cached: false });
  } catch (err) {
    return NextResponse.json({ error: "fetch_failed", detail: (err as Error).message }, { status: 500 });
  }
}
