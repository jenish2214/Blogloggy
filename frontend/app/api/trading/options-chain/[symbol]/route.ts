import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const expiry = req.nextUrl.searchParams.get("expiry");
  try {
    const url = expiry
      ? `https://query2.finance.yahoo.com/v7/finance/options/${sym}?date=${expiry}`
      : `https://query2.finance.yahoo.com/v7/finance/options/${sym}`;
    const res = await fetch(url, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const result = data?.optionChain?.result?.[0];
    if (!result) return NextResponse.json({ error: "No options data" }, { status: 404 });
    const { calls, puts } = result.options?.[0] ?? { calls: [], puts: [] };
    const spot = result.quote?.regularMarketPrice ?? 0;
    const fmt2 = (n: number | null) => (n == null ? null : parseFloat(n.toFixed(2)));
    const formatC = (c: Record<string, unknown>) => ({
      contractSymbol: c.contractSymbol,
      strike: c.strike,
      lastPrice: fmt2(c.lastPrice as number),
      bid: fmt2(c.bid as number),
      ask: fmt2(c.ask as number),
      midpoint: fmt2(((c.bid as number) + (c.ask as number)) / 2),
      change: fmt2(c.change as number),
      percentChange: fmt2(c.percentChange as number),
      volume: c.volume ?? 0,
      openInterest: c.openInterest ?? 0,
      impliedVolatility: c.impliedVolatility ? parseFloat(((c.impliedVolatility as number) * 100).toFixed(1)) : null,
      inTheMoney: c.inTheMoney,
    });
    return NextResponse.json({ symbol: sym, spotPrice: spot, expirations: result.expirationDates ?? [], calls: (calls ?? []).map(formatC), puts: (puts ?? []).map(formatC) });
  } catch (err) {
    return NextResponse.json({ error: "fetch_failed", detail: (err as Error).message }, { status: 500 });
  }
}
