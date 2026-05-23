import type { CandleData } from "@/types/algoTrading";

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function stdDev(values: number[], period: number): number {
  const slice = values.slice(-period);
  if (slice.length < 2) return 0;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  return Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
}

export function computeRSI(candles: CandleData[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const closes = candles.map((c) => c.close);
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

export function computeMACD(candles: CandleData[]): { macd: number; signal: number; histogram: number } | null {
  const closes = candles.map((c) => c.close);
  if (closes.length < 35) return null;

  const ema12Series: number[] = [];
  const ema26Series: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const slice = closes.slice(0, i + 1);
    const e12 = computeEMA(slice, 12);
    const e26 = computeEMA(slice, 26);
    if (e12 != null) ema12Series.push(e12);
    if (e26 != null) ema26Series.push(e26);
  }
  if (!ema12Series.length || !ema26Series.length) return null;

  const macdLine = ema12Series[ema12Series.length - 1] - ema26Series[ema26Series.length - 1];
  const macdHistory: number[] = [];
  for (let i = 26; i < closes.length; i++) {
    const e12 = computeEMA(closes.slice(0, i + 1), 12)!;
    const e26 = computeEMA(closes.slice(0, i + 1), 26)!;
    macdHistory.push(e12 - e26);
  }
  const signal = computeEMA(macdHistory, 9) ?? macdLine;
  return { macd: macdLine, signal, histogram: macdLine - signal };
}

export interface AlgoIndicators {
  rsi: number | null;
  ma20: number | null;
  ma50: number | null;
  volume: number;
  macd: number | null;
  changePct: number;
}

export function computeIndicators(candles: CandleData[]): AlgoIndicators {
  const closes = candles.map((c) => c.close);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const changePct = prev && prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const macdResult = computeMACD(candles);

  return {
    rsi: computeRSI(candles),
    ma20: sma(closes, 20),
    ma50: sma(closes, 50),
    volume: last?.volume ?? 0,
    macd: macdResult?.histogram ?? null,
    changePct,
  };
}

export { sma, stdDev };
