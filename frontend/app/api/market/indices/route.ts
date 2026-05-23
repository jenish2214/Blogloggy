import { NextResponse } from "next/server";
import { fromCache, toCache, fmt } from "@/lib/market-fetch";

const INDICES = ["^GSPC","^DJI","^IXIC","^RUT","^VIX","GC=F","CL=F","BTC-USD"];
const NAMES: Record<string,string> = { "^GSPC":"S&P 500","^DJI":"Dow Jones","^IXIC":"Nasdaq","^RUT":"Russell 2000","^VIX":"VIX","GC=F":"Gold","CL=F":"Crude Oil","BTC-USD":"Bitcoin" };

export async function GET() {
  const key = "indices";
  const cached = fromCache<unknown>(key);
  if (cached) return NextResponse.json({ indices: cached, cached: true });

  const results = await Promise.allSettled(INDICES.map(async (sym) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    const price = meta.regularMarketPrice;
    return { symbol: sym, name: NAMES[sym] ?? sym, price: fmt(price), change: fmt(price - prev), changePct: fmt(((price - prev) / prev) * 100), currency: meta.currency };
  }));

  const indices = results.filter((r) => r.status === "fulfilled" && r.value).map((r) => (r as PromiseFulfilledResult<unknown>).value);
  toCache(key, indices, 20_000);
  return NextResponse.json({ indices, cached: false });
}
