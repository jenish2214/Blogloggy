import type { SnapshotPosition } from "@/lib/trading/portfolioSnapshot";

export interface PortfolioTotals {
  positions: SnapshotPosition[];
  investedValue: number;
  costBasis: number;
  unrealizedPnl: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
}

export function computePortfolioTotals(
  positions: SnapshotPosition[],
  cash: number,
  startingCapital: number
): PortfolioTotals {
  const investedValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const costBasis = positions.reduce((s, p) => s + p.costBasis, 0);
  const unrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalValue = cash + investedValue;
  const totalPnl = totalValue - startingCapital;
  const totalPnlPct = startingCapital > 0 ? (totalPnl / startingCapital) * 100 : 0;

  return {
    positions,
    investedValue,
    costBasis,
    unrealizedPnl,
    totalValue,
    totalPnl,
    totalPnlPct,
  };
}
