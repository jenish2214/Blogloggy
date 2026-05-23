// ── Trading Platform Types ──────────────────────────────────────────────────

export type AssetClass = "stock" | "crypto" | "option";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "filled" | "pending" | "cancelled";

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  mktCap: number | null;
  currency: string;
  exchange: string;
  type: "stock" | "crypto";
  updatedAt: string;
}
