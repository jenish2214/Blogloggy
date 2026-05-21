import { NextResponse } from "next/server";
import { fromCache, toCache, fmt } from "@/lib/market-fetch";

const GAINERS = ["NVDA","TSLA","PLTR","SMCI","AMD","MSTR","COIN","SOFI"];
const LOSERS = ["INTC","BA","WBA","PFE","PARA","MPW","LUMN","T"];
const ACTIVE = ["AAPL","AMZN","META","MSFT","GOOGL","TSLA","NVDA","SPY"];

async function fetchMover(sym: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    const price = meta.regularMarketPrice;
    return { symbol: sym, name: meta.shortName ?? sym, price: fmt(price), changePct: fmt(((price - prev) / prev) * 100), volume: meta.regularMarketVolume ?? 0 };
  } catch { return null; }
}

export async function GET() {
  const key = "movers";
  const cached = fromCache<unknown>(key);
  if (cached) return NextResponse.json({ ...cached as object, cached: true });

  const [g, l, a] = await Promise.all([
    Promise.allSettled(GAINERS.map(fetchMover)),
    Promise.allSettled(LOSERS.map(fetchMover)),
    Promise.allSettled(ACTIVE.map(fetchMover)),
  ]);
  const clean = (arr: PromiseSettledResult<unknown>[]) => arr.filter((r) => r.status === "fulfilled" && r.value).map((r) => (r as PromiseFulfilledResult<unknown>).value);
  type M = { changePct: number; volume: number };
  const movers = {
    gainers: clean(g).sort((a, b) => ((b as M).changePct??0) - ((a as M).changePct??0)),
    losers: clean(l).sort((a, b) => ((a as M).changePct??0) - ((b as M).changePct??0)),
    mostActive: clean(a).sort((a, b) => ((b as M).volume??0) - ((a as M).volume??0)),
  };
  toCache(key, movers, 120_000);
  return NextResponse.json({ ...movers, cached: false });
}
