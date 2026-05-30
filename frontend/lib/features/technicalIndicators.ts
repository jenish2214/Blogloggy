/** Wilder RSI (14) and simple SMA from OHLCV closes. */

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function volumeSpikePct(volumes: number[], lookback = 20): number | null {
  if (volumes.length < lookback + 1) return null;
  const recent = volumes[volumes.length - 1]!;
  const avg =
    volumes.slice(-lookback - 1, -1).reduce((a, b) => a + b, 0) / lookback;
  if (avg <= 0) return null;
  return ((recent - avg) / avg) * 100;
}
