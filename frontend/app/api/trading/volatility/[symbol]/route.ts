import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`;
  const res = await fetch(url, { headers: { "User-Agent": "QuantDesk/1.0" } });
  const data = await res.json();
  const closes: number[] = (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((c: number | null) => c != null);
  if (closes.length < 10) return NextResponse.json({ error: "insufficient_data" }, { status: 404 });
  const returns = [];
  for (let i = 1; i < closes.length; i++) returns.push(Math.log(closes[i] / closes[i - 1]));
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const hv = parseFloat((Math.sqrt(variance * 252) * 100).toFixed(2));
  return NextResponse.json({ symbol: sym, historicalVolatility30d: hv, sampleSize: closes.length });
}
