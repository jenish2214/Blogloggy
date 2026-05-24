/** Real-time exit / sell profit math for portfolio positions. */

export interface ExitPnlBreakdown {
  livePrice: number;
  qty: number;
  avgBuyPrice: number;
  costBasis: number;
  proceeds: number;
  profit: number;
  profitPct: number;
  profitPerShare: number;
}

export function computeExitPnl(
  qty: number,
  avgBuyPrice: number,
  livePrice: number,
  costBasis?: number
): ExitPnlBreakdown {
  const basis = costBasis ?? avgBuyPrice * qty;
  const proceeds = livePrice * qty;
  const profit = proceeds - basis;
  const profitPct = basis > 0 ? (profit / basis) * 100 : 0;
  const profitPerShare = livePrice - avgBuyPrice;

  return {
    livePrice,
    qty,
    avgBuyPrice,
    costBasis: basis,
    proceeds,
    profit,
    profitPct,
    profitPerShare,
  };
}

export function formatProfitSigned(profit: number, decimals = 2): string {
  const abs = Math.abs(profit).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return profit >= 0 ? `+$${abs}` : `−$${abs}`;
}

export function formatPctSigned(pct: number, decimals = 2): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(decimals)}%`;
}
