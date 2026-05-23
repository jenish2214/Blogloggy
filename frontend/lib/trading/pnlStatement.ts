import type { OrderRecord } from "./orders";

export type { OrderRecord };

export interface RealizedTradeLine {
  id: string;
  date: string;
  symbol: string;
  qty: number;
  fillPrice: number;
  proceeds: number;
  costBasis: number;
  realizedPnl: number;
}

export interface PnlSummary {
  realizedPnl: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  buyCount: number;
  sellCount: number;
  realizedTrades: RealizedTradeLine[];
}

const INITIAL_CASH = 100_000;

export { INITIAL_CASH };

/** Replay filled orders to compute realized P&L on each sell. */
export function computePnlFromOrders(orders: OrderRecord[]): PnlSummary {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const lots: Record<string, { qty: number; avgCost: number }> = {};
  let realizedPnl = 0;
  let totalBuyVolume = 0;
  let totalSellVolume = 0;
  let buyCount = 0;
  let sellCount = 0;
  const realizedTrades: RealizedTradeLine[] = [];

  for (const o of sorted) {
    if (o.side === "buy") {
      buyCount += 1;
      totalBuyVolume += o.totalValue;
      const cur = lots[o.symbol] ?? { qty: 0, avgCost: 0 };
      const newQty = cur.qty + o.qty;
      const newAvg =
        newQty > 0
          ? (cur.avgCost * cur.qty + o.filledPrice * o.qty) / newQty
          : o.filledPrice;
      lots[o.symbol] = { qty: newQty, avgCost: newAvg };
      continue;
    }

    sellCount += 1;
    totalSellVolume += o.totalValue;
    const cur = lots[o.symbol] ?? { qty: 0, avgCost: 0 };
    const sellQty = Math.min(o.qty, cur.qty > 0 ? cur.qty : o.qty);
    const costBasis = cur.avgCost * sellQty;
    const proceeds = o.filledPrice * sellQty;
    const tradePnl = proceeds - costBasis;
    realizedPnl += tradePnl;
    cur.qty = Math.max(0, cur.qty - sellQty);
    lots[o.symbol] = cur;

    realizedTrades.push({
      id: o.id,
      date: o.createdAt,
      symbol: o.symbol,
      qty: sellQty,
      fillPrice: o.filledPrice,
      proceeds,
      costBasis,
      realizedPnl: tradePnl,
    });
  }

  return {
    realizedPnl,
    totalBuyVolume,
    totalSellVolume,
    buyCount,
    sellCount,
    realizedTrades: realizedTrades.reverse(),
  };
}
