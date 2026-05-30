import { NextRequest, NextResponse } from "next/server";
import { yahooFinance } from "@/lib/yahoo-client";
import {
  finnhubBasicFinancials,
  finnhubCandles,
  finnhubEarnings,
} from "@/lib/market/finnhubClient";

type OptionLeg = {
  strike: number;
  midpoint: number | null;
  bid?: number | null;
  ask?: number | null;
  impliedVolatility?: number | null;
};

function nearestAtm(contracts: OptionLeg[], spot: number) {
  if (!contracts.length || spot <= 0) return null;
  return contracts.reduce((best, c) =>
    Math.abs(c.strike - spot) < Math.abs(best.strike - spot) ? c : best
  );
}

function contractMid(c: OptionLeg) {
  if (c.midpoint != null) return c.midpoint;
  if (c.bid != null && c.ask != null) return (c.bid + c.ask) / 2;
  return null;
}

async function historicalEarningsMoves(symbol: string) {
  const rows = await finnhubEarnings(symbol, 8);
  const moves: { period: string; movePct: number }[] = [];

  for (const row of rows.slice(0, 4)) {
    const period = row.period;
    if (!period) continue;
    const d = new Date(period);
    if (Number.isNaN(d.getTime())) continue;
    const from = Math.floor((d.getTime() - 3 * 86400000) / 1000);
    const to = Math.floor((d.getTime() + 3 * 86400000) / 1000);
    try {
      const c = await finnhubCandles(symbol, from, to, "D");
      if (c.s !== "ok" || !c.c?.length || !c.t?.length) continue;
      const idx = c.t.reduce((best, t, i) => {
        const dist = Math.abs(t * 1000 - d.getTime());
        const bestDist = Math.abs(c.t[best]! * 1000 - d.getTime());
        return dist < bestDist ? i : best;
      }, 0);
      const prev = idx > 0 ? c.c[idx - 1]! : c.o[idx]!;
      const close = c.c[idx]!;
      if (prev > 0) moves.push({ period, movePct: ((close - prev) / prev) * 100 });
    } catch {
      /* skip quarter */
    }
  }
  return moves;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const exposure = Number(req.nextUrl.searchParams.get("exposure") ?? 0);
  const dailyLossLimit = Number(req.nextUrl.searchParams.get("dailyLossLimit") ?? 2500);

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const [financials, historicalMoves] = await Promise.all([
      finnhubBasicFinancials(symbol, "all").catch(() => null),
      historicalEarningsMoves(symbol),
    ]);

    let spot = 0;
    let expectedMovePct: number | null = null;
    let atmIv: number | null = null;
    let ivRank = 50;

    try {
      const data = await yahooFinance.options(symbol);
      spot = data.quote?.regularMarketPrice ?? 0;
      const slice = data.options?.[0];
      const calls = (slice?.calls ?? []).map((c) => ({
        strike: Number(c.strike),
        midpoint:
          c.bid != null && c.ask != null
            ? (Number(c.bid) + Number(c.ask)) / 2
            : c.lastPrice != null
              ? Number(c.lastPrice)
              : null,
        bid: c.bid != null ? Number(c.bid) : null,
        ask: c.ask != null ? Number(c.ask) : null,
        impliedVolatility:
          c.impliedVolatility != null ? Number(c.impliedVolatility) * 100 : null,
      }));
      const puts = (slice?.puts ?? []).map((c) => ({
        strike: Number(c.strike),
        midpoint:
          c.bid != null && c.ask != null
            ? (Number(c.bid) + Number(c.ask)) / 2
            : c.lastPrice != null
              ? Number(c.lastPrice)
              : null,
        bid: c.bid != null ? Number(c.bid) : null,
        ask: c.ask != null ? Number(c.ask) : null,
        impliedVolatility:
          c.impliedVolatility != null ? Number(c.impliedVolatility) * 100 : null,
      }));

      const atmCall = nearestAtm(calls, spot);
      const atmPut = nearestAtm(puts, spot);
      const callPx = atmCall ? contractMid(atmCall) : null;
      const putPx = atmPut ? contractMid(atmPut) : null;
      atmIv = atmCall?.impliedVolatility ?? atmPut?.impliedVolatility ?? null;

      if (spot > 0 && callPx != null && putPx != null) {
        expectedMovePct = ((callPx + putPx) / spot) * 100;
      }

      const ivs = [...calls, ...puts]
        .map((c) => c.impliedVolatility)
        .filter((v): v is number => v != null && v > 0);
      if (atmIv != null && ivs.length) {
        const minIv = Math.min(...ivs);
        const maxIv = Math.max(...ivs);
        ivRank =
          maxIv > minIv
            ? Math.round(((atmIv - minIv) / (maxIv - minIv)) * 100)
            : Math.min(100, Math.round(atmIv));
      }
    } catch {
      /* options optional */
    }

    const histVol30 = financials?.metric?.["volatility30Day"] as number | undefined;
    if (atmIv == null && histVol30) {
      atmIv = histVol30 * 100;
      ivRank = Math.min(100, Math.round(histVol30 * 200));
    }

    const expectedDollarMove =
      expectedMovePct != null && exposure > 0 ? (exposure * expectedMovePct) / 100 : null;
    const exposureAlert =
      expectedDollarMove != null && expectedDollarMove > dailyLossLimit
        ? `Expected move ($${expectedDollarMove.toFixed(0)}) exceeds your $${dailyLossLimit.toLocaleString()} daily loss limit.`
        : null;

    const highIv = (ivRank ?? 0) >= 60;
    const beginnerGuide = highIv
      ? "Implied volatility is elevated — the market prices a large move. Consider smaller size or waiting until after the report if you're new to earnings."
      : "Volatility is moderate — focus on whether you can hold through a gap without panic-selling.";
    const proGuide = highIv
      ? "IV elevated: consider iron condor / short straddle only if you accept gap risk; protective put or collar if long stock."
      : "IV moderate: covered calls may cap upside; long straddle less attractive — prefer directional stock or debit spreads.";

    return NextResponse.json({
      symbol,
      spot,
      ivRank,
      atmIv,
      expectedMovePct,
      historicalMoves,
      exposureAlert,
      beginnerGuide,
      proGuide,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "intelligence_failed", detail: String(err) },
      { status: 502 }
    );
  }
}
