import { NextRequest, NextResponse } from "next/server";
import { fromCache, toCache, fmt } from "@/lib/market-fetch";

// ── Technical Indicator Computation ───────────────────────────────────────────

function computeEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0] ?? 0;
  for (const v of values) {
    const e = v * k + prev * (1 - k);
    result.push(e);
    prev = e;
  }
  return result;
}

function computeSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/** Wilder-smoothed RSI (14-period) */
function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const cacheKey = `signals:${sym}`;
  const cached = fromCache<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`;
    const res = await fetch(url, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "symbol_not_found" }, { status: 404 });

    const q = result.indicators?.quote?.[0] ?? {};
    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = timestamps
      .map((_: number, i: number) => q.close?.[i])
      .filter((v: unknown): v is number => typeof v === "number" && !isNaN(v));
    const volumes: number[] = timestamps
      .map((_: number, i: number) => q.volume?.[i] ?? 0)
      .filter((_: unknown, i: number) => q.close?.[i] != null);

    if (closes.length < 30) {
      return NextResponse.json({ error: "insufficient_data" }, { status: 400 });
    }

    const currentPrice = closes[closes.length - 1];

    // ── RSI ─────────────────────────────────────────────────────────────────
    const rsiVal = computeRSI(closes);
    const rsiSignal: "buy" | "sell" | "neutral" =
      rsiVal < 35 ? "buy" : rsiVal > 65 ? "sell" : "neutral";

    // ── SMA 20 / 50 ─────────────────────────────────────────────────────────
    const sma20arr = computeSMA(closes, 20);
    const sma50arr = computeSMA(closes, Math.min(50, closes.length - 1));
    const sma20 = sma20arr[sma20arr.length - 1];
    const sma50 = sma50arr[sma50arr.length - 1];
    const smaSignal: "buy" | "sell" | "neutral" =
      sma20 > sma50 * 1.005 ? "buy" : sma20 < sma50 * 0.995 ? "sell" : "neutral";

    // ── MACD (12, 26, 9) ────────────────────────────────────────────────────
    const ema12 = computeEMA(closes, 12);
    const ema26 = computeEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = computeEMA(macdLine.slice(-30), 9);
    const lastMACD = macdLine[macdLine.length - 1];
    const lastSignalLine = signalLine[signalLine.length - 1];
    const macdHistogram = lastMACD - lastSignalLine;
    const macdSignal: "buy" | "sell" = lastMACD > lastSignalLine ? "buy" : "sell";

    // ── Bollinger Bands (20, 2σ) ─────────────────────────────────────────────
    const recentCloses = closes.slice(-20);
    const bbMid = recentCloses.reduce((a, b) => a + b, 0) / 20;
    const variance = recentCloses.reduce((s, v) => s + (v - bbMid) ** 2, 0) / 20;
    const stddev = Math.sqrt(variance);
    const bbUpper = bbMid + 2 * stddev;
    const bbLower = bbMid - 2 * stddev;
    const bbRange = bbUpper - bbLower;
    const bbPct = bbRange > 0 ? ((currentPrice - bbLower) / bbRange) * 100 : 50;
    const bbSignal: "buy" | "sell" | "neutral" =
      bbPct < 25 ? "buy" : bbPct > 75 ? "sell" : "neutral";

    // ── Volume Analysis ──────────────────────────────────────────────────────
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const lastVol = volumes[volumes.length - 1] ?? 0;
    const volRatio = avgVol > 0 ? lastVol / avgVol : 1;

    // ── Composite Signal (4-indicator voting) ───────────────────────────────
    const allSignals = [rsiSignal, smaSignal, macdSignal, bbSignal];
    const buyVotes = allSignals.filter((s) => s === "buy").length;
    const sellVotes = allSignals.filter((s) => s === "sell").length;
    const composite =
      buyVotes >= 3
        ? "strong_buy"
        : buyVotes === 2
        ? "buy"
        : sellVotes >= 3
        ? "strong_sell"
        : sellVotes === 2
        ? "sell"
        : "neutral";

    // ── Momentum ─────────────────────────────────────────────────────────────
    const change5d =
      closes.length >= 6
        ? ((closes[closes.length - 1] - closes[closes.length - 6]) /
            closes[closes.length - 6]) *
          100
        : 0;
    const change20d =
      closes.length >= 21
        ? ((closes[closes.length - 1] - closes[closes.length - 21]) /
            closes[closes.length - 21]) *
          100
        : 0;

    const payload = {
      symbol: sym,
      currentPrice: fmt(currentPrice, 2),
      rsi: { value: fmt(rsiVal, 1), signal: rsiSignal },
      sma: { sma20: fmt(sma20, 2), sma50: fmt(sma50, 2), signal: smaSignal },
      macd: {
        macd: fmt(lastMACD, 4),
        signal_line: fmt(lastSignalLine, 4),
        histogram: fmt(macdHistogram, 4),
        signal: macdSignal,
      },
      bollingerBands: {
        upper: fmt(bbUpper, 2),
        middle: fmt(bbMid, 2),
        lower: fmt(bbLower, 2),
        pct: fmt(bbPct, 1),
        signal: bbSignal,
      },
      volume: {
        ratio: fmt(volRatio, 2),
        avgVol: Math.round(avgVol),
        lastVol,
      },
      composite,
      change5d: fmt(change5d, 2),
      change20d: fmt(change20d, 2),
      dataPoints: closes.length,
    };

    toCache(cacheKey, payload, 60_000);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: "fetch_failed", detail: String(err) },
      { status: 500 }
    );
  }
}
