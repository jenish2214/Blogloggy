import type { AlgoSymbol, CandleData } from "@/types/algoTrading";
import { SYMBOL_CONFIGS } from "@/types/algoTrading";

/** Mulberry32 seeded PRNG — deterministic per seed. */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0;
  return h >>> 0;
}

function formatTimeLabel(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Generate historical OHLCV candles with realistic commodity behavior. */
export function generateOHLCV(
  symbol: AlgoSymbol,
  periods: number,
  basePrice?: number
): CandleData[] {
  const cfg = SYMBOL_CONFIGS[symbol];
  const price = basePrice ?? cfg.basePrice;
  const rng = mulberry32(cfg.seed ^ hashSymbol(symbol));
  const candles: CandleData[] = [];
  let close = price;
  let volCluster = cfg.volatility;
  const closes: number[] = [];

  const startTs = Date.now() - periods * 60_000;

  for (let i = 0; i < periods; i++) {
    const ts = startTs + i * 60_000;

    // Gap event (~2% probability)
    if (rng() < 0.02 && i > 0) {
      const gapDir = rng() > 0.5 ? 1 : -1;
      const gapPct = 0.01 + rng() * 0.02;
      close *= 1 + gapDir * gapPct;
    }

    // Volatility clustering (GARCH-like simplified)
    const shock = (rng() - 0.5) * 2;
    volCluster = 0.85 * volCluster + 0.15 * (cfg.volatility * (1 + Math.abs(shock)));

    // Mean reversion toward 20-period MA
    closes.push(close);
    const ma20 = closes.length >= 5 ? sma(closes, Math.min(20, closes.length)) : close;
    const meanRev = (ma20 - close) * 0.02;

    // Slow drift
    const drift = (rng() - 0.499) * 0.001 * close;

    const open = close;
    const move = drift + meanRev + shock * volCluster * close;
    close = Math.max(close * 0.5, close + move);
    const high = Math.max(open, close) * (1 + rng() * volCluster * 0.3);
    const low = Math.min(open, close) * (1 - rng() * volCluster * 0.3);
    const moveMag = Math.abs(close - open) / open;
    const volume = Math.round(5000 + moveMag * 80000 + rng() * 20000);

    candles.push({
      open,
      high,
      low,
      close,
      volume,
      timestamp: ts,
      timeLabel: formatTimeLabel(ts),
    });
  }

  return candles;
}

/** Simulate one live tick from the last candle. */
export function simulateLiveTick(
  lastCandle: CandleData,
  symbol: AlgoSymbol,
  tickIndex: number
): CandleData {
  const cfg = SYMBOL_CONFIGS[symbol];
  const rng = mulberry32(cfg.seed ^ tickIndex ^ Math.floor(lastCandle.timestamp / 1000));
  const shock = (rng() - 0.5) * 2;
  const vol = cfg.volatility * (0.8 + rng() * 0.4);

  const open = lastCandle.close;
  const close = Math.max(open * 0.98, open + shock * vol * open * 0.15);
  const high = Math.max(open, close) * (1 + rng() * vol * 0.1);
  const low = Math.min(open, close) * (1 - rng() * vol * 0.1);
  const moveMag = Math.abs(close - open) / open;
  const volume = Math.round(3000 + moveMag * 50000 + rng() * 15000);
  const timestamp = Date.now();

  return {
    open,
    high,
    low,
    close,
    volume,
    timestamp,
    timeLabel: formatTimeLabel(timestamp),
  };
}

/** Compute EMA series for overlay lines. */
export function computeEMA(candles: CandleData[], period: number): (number | null)[] {
  if (candles.length === 0) return [];
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    if (ema === null) {
      const sum = candles.slice(0, period).reduce((s, c) => s + c.close, 0);
      ema = sum / period;
    } else {
      ema = candles[i].close * k + ema * (1 - k);
    }
    result.push(ema);
  }
  return result;
}
