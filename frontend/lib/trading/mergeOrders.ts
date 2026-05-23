import {
  mapServerOrder,
  sortOrdersNewestFirst,
  type OrderRecord,
} from "@/lib/trading/orders";

/**
 * Merge cloud orders with local session orders (dedupe by id or near-duplicate).
 * When `bookScoped` is true (signed-in + active book), use server list only.
 */
export function mergeOrderHistory(
  serverOrders: OrderRecord[],
  localOrders: OrderRecord[],
  bookScoped = false
): OrderRecord[] {
  if (bookScoped) return sortOrdersNewestFirst(serverOrders);
  const merged = [...serverOrders];
  const seen = new Set(serverOrders.map((o) => o.id));

  for (const local of localOrders) {
    if (seen.has(local.id)) continue;
    const dup = serverOrders.some(
      (s) =>
        s.symbol === local.symbol &&
        s.side === local.side &&
        Math.abs(s.qty - local.qty) < 0.0001 &&
        Math.abs(s.filledPrice - local.filledPrice) < 0.0001 &&
        Math.abs(new Date(s.createdAt).getTime() - new Date(local.createdAt).getTime()) < 5000
    );
    if (!dup) merged.push(local);
  }

  return sortOrdersNewestFirst(merged);
}

export function mapLocalStoreOrders(
  orders: {
    id: string;
    symbol: string;
    assetClass: string;
    side: "buy" | "sell";
    qty: number;
    orderType: string;
    filledPrice: number;
    status: string;
    createdAt: string;
  }[]
): OrderRecord[] {
  return orders.map((o) => ({
    id: o.id,
    symbol: o.symbol,
    assetClass: o.assetClass,
    side: o.side,
    qty: o.qty,
    filledPrice: o.filledPrice,
    totalValue: o.qty * o.filledPrice,
    orderType: o.orderType,
    status: o.status,
    createdAt: o.createdAt,
  }));
}

export function mapRawServerOrders(raw: Record<string, unknown>[]): OrderRecord[] {
  return raw.map((o) => mapServerOrder(o));
}
