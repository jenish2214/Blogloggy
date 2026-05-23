import { computePnlFromOrders } from "@/lib/trading/pnlStatement";
import type { OrderRecord } from "@/lib/trading/orders";

export interface OrderPnlRow {
  realizedPnl: number;
  costBasis: number;
  proceeds: number;
}

/** Map sell order id → realized P&L from FIFO replay of all orders (oldest first). */
export function buildOrderPnlMap(orders: OrderRecord[]): Map<string, OrderPnlRow> {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const { realizedTrades } = computePnlFromOrders(sorted);
  const map = new Map<string, OrderPnlRow>();
  for (const t of realizedTrades) {
    map.set(t.id, {
      realizedPnl: t.realizedPnl,
      costBasis: t.costBasis,
      proceeds: t.proceeds,
    });
  }
  return map;
}
