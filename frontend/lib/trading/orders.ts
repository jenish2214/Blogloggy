/** Normalized order shape used across profile, orders page, and P&L. */
export interface OrderRecord {
  id: string;
  symbol: string;
  assetClass: string;
  side: "buy" | "sell";
  qty: number;
  filledPrice: number;
  totalValue: number;
  orderType: string;
  status: string;
  createdAt: string;
}

export interface OrderHistoryStats {
  total: number;
  buyCount: number;
  sellCount: number;
  totalVolume: number;
}

export function mapServerOrder(o: Record<string, unknown>): OrderRecord {
  return {
    id: String(o.id),
    symbol: String(o.symbol),
    assetClass: String(o.asset_class ?? "stock"),
    side: o.side as "buy" | "sell",
    qty: Number(o.qty),
    filledPrice: Number(o.filled_price),
    totalValue: Number(o.total_value),
    orderType: String(o.order_type ?? "market"),
    status: String(o.status ?? "filled"),
    createdAt: String(o.created_at),
  };
}

export function computeOrderStats(orders: OrderRecord[]): OrderHistoryStats {
  let buyCount = 0;
  let sellCount = 0;
  let totalVolume = 0;
  for (const o of orders) {
    totalVolume += o.totalValue;
    if (o.side === "buy") buyCount += 1;
    else sellCount += 1;
  }
  return { total: orders.length, buyCount, sellCount, totalVolume };
}

export function sortOrdersNewestFirst(orders: OrderRecord[]): OrderRecord[] {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function filterOrdersBySide(
  orders: OrderRecord[],
  filter: "all" | "buy" | "sell"
): OrderRecord[] {
  if (filter === "all") return orders;
  return orders.filter((o) => o.side === filter);
}
