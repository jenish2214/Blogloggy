import { NextRequest, NextResponse } from "next/server";
import { yahooFinance } from "@/lib/yahoo-client";

export const runtime = "nodejs";

function fmt2(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return null;
  return parseFloat(Number(n).toFixed(2));
}

function formatContract(c: Record<string, unknown>) {
  const bid = c.bid as number | undefined;
  const ask = c.ask as number | undefined;
  return {
    contractSymbol: c.contractSymbol,
    strike: c.strike,
    lastPrice: fmt2(c.lastPrice as number),
    bid: fmt2(bid),
    ask: fmt2(ask),
    midpoint: bid != null && ask != null ? fmt2((bid + ask) / 2) : null,
    change: fmt2(c.change as number),
    percentChange: fmt2(c.percentChange as number),
    volume: c.volume ?? 0,
    openInterest: c.openInterest ?? 0,
    impliedVolatility:
      c.impliedVolatility != null
        ? parseFloat((Number(c.impliedVolatility) * 100).toFixed(1))
        : null,
    inTheMoney: c.inTheMoney,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym = decodeURIComponent(symbol).toUpperCase();
  const expiryParam = req.nextUrl.searchParams.get("expiry");
  const expirySec = expiryParam ? Number(expiryParam) : undefined;

  try {
    const data = await yahooFinance.options(
      sym,
      expirySec ? { date: new Date(expirySec * 1000) } : undefined
    );

    const spot = data.quote?.regularMarketPrice ?? 0;
    const expirations = (data.expirationDates ?? []).map((d) =>
      d instanceof Date ? Math.floor(d.getTime() / 1000) : Number(d)
    );
    const optionSlice = data.options?.[0] ?? { calls: [], puts: [] };
    const calls = (optionSlice.calls ?? []).map((c) => formatContract(c as Record<string, unknown>));
    const puts = (optionSlice.puts ?? []).map((c) => formatContract(c as Record<string, unknown>));

    if (!expirations.length && !calls.length && !puts.length) {
      return NextResponse.json(
        {
          error: "no_options",
          message: `No listed options for ${sym}. US large-caps (AAPL, MSFT, NVDA) work best.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      symbol: sym,
      spotPrice: spot,
      expirations,
      calls,
      puts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "fetch_failed", detail: msg, message: `Could not load options for ${sym}` },
      { status: 502 }
    );
  }
}
