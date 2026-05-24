import type { OrderRecord } from "./orders";
import type { SnapshotPosition } from "./portfolioSnapshot";

export interface BuyFill {
  id: string;
  date: string;
  qty: number;
  price: number;
  total: number;
}

export interface HoldingDetail {
  symbol: string;
  name: string;
  assetClass: string;
  position: SnapshotPosition | null;
  buyFills: BuyFill[];
  totalBoughtQty: number;
  totalBoughtValue: number;
}

export function getBuyFillsForSymbol(orders: OrderRecord[], symbol: string): BuyFill[] {
  return orders
    .filter((o) => o.symbol === symbol && o.side === "buy")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((o) => ({
      id: o.id,
      date: o.createdAt,
      qty: o.qty,
      price: o.filledPrice,
      total: o.totalValue,
    }));
}

export function buildHoldingDetails(
  positions: SnapshotPosition[],
  orders: OrderRecord[]
): HoldingDetail[] {
  const symbols = new Set<string>();
  for (const p of positions) symbols.add(p.symbol);
  for (const o of orders) {
    if (o.side === "buy") symbols.add(o.symbol);
  }

  return Array.from(symbols)
    .map((symbol) => {
      const position = positions.find((p) => p.symbol === symbol) ?? null;
      const buyFills = getBuyFillsForSymbol(orders, symbol);
      const totalBoughtQty = buyFills.reduce((s, f) => s + f.qty, 0);
      const totalBoughtValue = buyFills.reduce((s, f) => s + f.total, 0);
      const name =
        position?.name ??
        orders.find((o) => o.symbol === symbol)?.symbol ??
        symbol;
      const assetClass = position?.assetClass ?? "stock";

      return {
        symbol,
        name,
        assetClass,
        position,
        buyFills,
        totalBoughtQty,
        totalBoughtValue,
      };
    })
    .sort((a, b) => {
      const aVal = a.position?.marketValue ?? 0;
      const bVal = b.position?.marketValue ?? 0;
      return bVal - aVal;
    });
}
