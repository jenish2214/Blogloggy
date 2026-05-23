import type {
  CandleData,
  ClosedTrade,
  MeanReversionParams,
  MomentumParams,
  SignalEvent,
  SignalType,
  StrategyMetrics,
  StrategyParams,
  StrategyType,
  VwapParams,
} from "@/types/algoTrading";

function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stdDev(values: number[], period: number): number {
  const slice = values.slice(-period);
  if (slice.length < 2) return 0;
  const mean = sma(slice, slice.length);
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function atr(candles: CandleData[], period: number): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = Math.max(1, candles.length - period); i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

function computeVwap(candles: CandleData[]): number {
  let cumTPV = 0;
  let cumVol = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumVol += c.volume;
  }
  return cumVol > 0 ? cumTPV / cumVol : candles[candles.length - 1]?.close ?? 0;
}

function makeSignal(
  type: SignalType,
  price: number,
  timestamp: number,
  confidence: number,
  strategy: StrategyType
): SignalEvent {
  return { type, price, timestamp, confidence: Math.min(100, Math.max(0, confidence)), strategy };
}

/** Mean Reversion — buy below lower band, sell above upper band. */
export function evaluateMeanReversion(
  candles: CandleData[],
  params: MeanReversionParams,
  strategy: StrategyType = "meanReversion"
): SignalEvent | null {
  if (candles.length < params.lookbackPeriod) return null;
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const ma = sma(closes, params.lookbackPeriod);
  const sd = stdDev(closes, params.lookbackPeriod);
  const lower = ma - params.sdMultiplier * sd;
  const upper = ma + params.sdMultiplier * sd;
  const ts = candles[candles.length - 1].timestamp;

  if (price < lower) {
    const dist = (lower - price) / (sd || 1);
    return makeSignal("BUY", price, ts, 60 + dist * 15, strategy);
  }
  if (price > upper) {
    const dist = (price - upper) / (sd || 1);
    return makeSignal("SELL", price, ts, 60 + dist * 15, strategy);
  }
  return null;
}

/** Momentum Breakout — consecutive higher highs / lower lows. */
export function evaluateMomentum(
  candles: CandleData[],
  params: MomentumParams,
  strategy: StrategyType = "momentum"
): SignalEvent | null {
  const w = params.breakoutWindow;
  if (candles.length < w + 1) return null;
  const recent = candles.slice(-w - 1);
  const ts = candles[candles.length - 1].timestamp;
  const price = candles[candles.length - 1].close;
  const atrVal = atr(candles, 14);
  const threshold = atrVal * params.atrMultiplier * 0.1;

  let higherHighs = true;
  let lowerLows = true;
  for (let i = 1; i <= w; i++) {
    if (recent[i].high <= recent[i - 1].high) higherHighs = false;
    if (recent[i].low >= recent[i - 1].low) lowerLows = false;
  }

  if (higherHighs && price - recent[0].close > threshold) {
    return makeSignal("BUY", price, ts, 72 + w * 3, strategy);
  }
  if (lowerLows && recent[0].close - price > threshold) {
    return makeSignal("SELL", price, ts, 72 + w * 3, strategy);
  }
  return null;
}

/** VWAP Crossover — trade on price crossing VWAP with deviation filter. */
export function evaluateVWAP(
  candles: CandleData[],
  params: VwapParams,
  strategy: StrategyType = "vwap"
): SignalEvent | null {
  if (candles.length < 10) return null;
  const vwap = computeVwap(candles);
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  const dev = params.deviationPct / 100;
  const upper = vwap * (1 + dev);
  const lower = vwap * (1 - dev);
  const ts = curr.timestamp;

  if (prev.close <= vwap && curr.close > upper) {
    return makeSignal("BUY", curr.close, ts, 68, strategy);
  }
  if (prev.close >= vwap && curr.close < lower) {
    return makeSignal("SELL", curr.close, ts, 68, strategy);
  }
  return null;
}

/** Route to active strategy evaluator. */
export function evaluateStrategy(
  strategy: StrategyType,
  candles: CandleData[],
  params: StrategyParams
): SignalEvent | null {
  switch (strategy) {
    case "meanReversion":
      return evaluateMeanReversion(candles, params.meanReversion);
    case "momentum":
      return evaluateMomentum(candles, params.momentum);
    case "vwap":
      return evaluateVWAP(candles, params.vwap);
    default:
      return null;
  }
}

/** Compute portfolio metrics from closed trades. */
export function computeMetrics(trades: ClosedTrade[]): StrategyMetrics {
  if (trades.length === 0) {
    return { totalTrades: 0, winRate: 0, maxDrawdown: 0, sharpeRatio: 0, totalPnl: 0 };
  }

  const wins = trades.filter((t) => t.status === "WIN").length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = (wins / trades.length) * 100;

  // Cumulative PnL curve for drawdown & sharpe
  let peak = 0;
  let maxDrawdown = 0;
  let cum = 0;
  const returns: number[] = [];

  for (const t of trades) {
    cum += t.pnl;
    returns.push(t.pnl);
    if (cum > peak) peak = cum;
    const dd = peak > 0 ? ((peak - cum) / Math.max(peak, 1)) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdRet = Math.sqrt(returns.reduce((s, r) => s + (r - meanRet) ** 2, 0) / returns.length) || 1;
  const sharpeRatio = (meanRet / stdRet) * Math.sqrt(252);

  return {
    totalTrades: trades.length,
    winRate,
    maxDrawdown,
    sharpeRatio,
    totalPnl,
  };
}
