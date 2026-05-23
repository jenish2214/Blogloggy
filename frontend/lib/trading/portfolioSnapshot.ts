import { portfolioApi } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { fetchLivePrices } from "@/lib/market/fetchLivePrices";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { computePnlFromOrders, INITIAL_CASH, type PnlSummary } from "@/lib/trading/pnlStatement";
import {
  mapLocalStoreOrders,
  mapRawServerOrders,
  mergeOrderHistory,
} from "@/lib/trading/mergeOrders";
import type { OrderRecord } from "@/lib/trading/orders";

export { INITIAL_CASH };

export interface SnapshotPosition {
  symbol: string;
  name: string;
  assetClass: string;
  qty: number;
  /** Your average buy price per share (from Supabase position). */
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  /** Total you paid (buy price × qty). */
  costBasis: number;
  /** Current price minus buy price per share. */
  returnPerShare: number;
  dayChangePct?: number;
}

export interface PortfolioSnapshot {
  source: "supabase" | "local";
  cash: number;
  startingCapital: number;
  investedValue: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  unrealizedPnl: number;
  positions: SnapshotPosition[];
  orders: OrderRecord[];
  orderCount: number;
  pnl: PnlSummary;
  portfolioCreated: string | null;
}

export function enrichPositionMetrics(
  p: Omit<SnapshotPosition, "costBasis" | "returnPerShare" | "marketValue" | "unrealizedPnl" | "unrealizedPnlPct"> & {
    marketValue?: number;
    unrealizedPnl?: number;
    unrealizedPnlPct?: number;
  }
): SnapshotPosition {
  const avgPrice = p.avgPrice;
  const currentPrice = p.currentPrice;
  const qty = p.qty;
  const marketValue = p.marketValue ?? currentPrice * qty;
  const costBasis = avgPrice * qty;
  const returnPerShare = currentPrice - avgPrice;
  const unrealizedPnl = p.unrealizedPnl ?? returnPerShare * qty;
  const unrealizedPnlPct =
    p.unrealizedPnlPct ?? (avgPrice > 0 ? (returnPerShare / avgPrice) * 100 : 0);

  return {
    ...p,
    avgPrice,
    currentPrice,
    qty,
    marketValue,
    costBasis,
    returnPerShare,
    unrealizedPnl,
    unrealizedPnlPct,
  };
}

/** Use latest buy fill when stored avg cost is missing. */
function applyBuyPricesFromOrders(
  positions: SnapshotPosition[],
  orders: OrderRecord[]
): SnapshotPosition[] {
  const lastBuy = new Map<string, number>();
  for (const o of orders) {
    if (o.side !== "buy" || lastBuy.has(o.symbol)) continue;
    lastBuy.set(o.symbol, o.filledPrice);
  }

  return positions.map((p) => {
    const buy = p.avgPrice > 0 ? p.avgPrice : lastBuy.get(p.symbol) ?? 0;
    return enrichPositionMetrics({ ...p, avgPrice: buy, currentPrice: p.currentPrice });
  });
}

function mapLocalPositions(
  positions: ReturnType<typeof usePortfolioStore.getState>["positions"],
  prices: Record<string, number>
): SnapshotPosition[] {
  return Object.values(positions)
    .filter((p) => p.qty > 0.000001)
    .map((p) => {
      const currentPrice = prices[p.symbol] ?? p.currentPrice;
      const marketValue = currentPrice * p.qty;
      const unrealizedPnl = (currentPrice - p.avgPrice) * p.qty;
      const unrealizedPnlPct =
        p.avgPrice > 0 ? ((currentPrice - p.avgPrice) / p.avgPrice) * 100 : 0;
      return enrichPositionMetrics({
        symbol: p.symbol,
        name: p.name,
        assetClass: p.assetClass,
        qty: p.qty,
        avgPrice: p.avgPrice,
        currentPrice,
      });
    });
}

function mapServerPositions(
  raw: Record<string, unknown>[],
  prices: Record<string, number>
): SnapshotPosition[] {
  return raw
    .filter((p) => Number(p.qty) > 0.000001)
    .map((p) => {
      const qty = Number(p.qty);
      const avgPrice = Number(p.avg_price);
      const currentPrice = prices[String(p.symbol)] ?? Number(p.current_price) ?? avgPrice;
      const marketValue = currentPrice * qty;
      const unrealizedPnl = (currentPrice - avgPrice) * qty;
      const unrealizedPnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
      return enrichPositionMetrics({
        symbol: String(p.symbol),
        name: String(p.name ?? p.symbol),
        assetClass: String(p.asset_class ?? "stock"),
        qty,
        avgPrice,
        currentPrice,
      });
    });
}

function buildSnapshot(
  source: "supabase" | "local",
  cash: number,
  positions: SnapshotPosition[],
  orders: OrderRecord[],
  orderCount: number,
  portfolioCreated: string | null,
  startingCapital = INITIAL_CASH
): PortfolioSnapshot {
  const investedValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const unrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalValue = cash + investedValue;
  const totalPnl = totalValue - startingCapital;
  const totalPnlPct = startingCapital > 0 ? (totalPnl / startingCapital) * 100 : 0;
  const pnl = computePnlFromOrders(orders);

  return {
    source,
    cash,
    startingCapital,
    investedValue,
    totalValue,
    totalPnl,
    totalPnlPct,
    unrealizedPnl,
    positions,
    orders,
    orderCount,
    pnl,
    portfolioCreated,
  };
}

/** Load portfolio, all orders, and P&L from cloud or local session. */
export async function loadPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const local = usePortfolioStore.getState();
  const localOrders = mapLocalStoreOrders(local.orders);

  try {
    const book = useActiveBookStore.getState().activeBook;
    const bookParams = book
      ? { portfolioId: book.portfolioId, clientId: book.clientId }
      : undefined;

    const portfolioData = await portfolioApi.get(bookParams);

    const portfolio = portfolioData.portfolio as Record<string, unknown> | null;
    if (!portfolio) throw new Error("no portfolio");

    const cash = Number(portfolio.cash) ?? INITIAL_CASH;
    const startingCapital = Number(portfolio.starting_capital) || INITIAL_CASH;
    const positionsRaw = (portfolioData.positions ?? []) as Record<string, unknown>[];
    const serverOrders = mapRawServerOrders(
      (portfolioData.orders ?? []) as Record<string, unknown>[]
    );
    const orders = mergeOrderHistory(serverOrders, localOrders, !!bookParams);

    const syms = positionsRaw
      .filter((p) => Number(p.qty) > 0.000001)
      .map((p) => String(p.symbol));
    const { prices } = syms.length ? await fetchLivePrices(syms) : { prices: {} };

    const positions = applyBuyPricesFromOrders(
      mapServerPositions(positionsRaw, prices),
      orders
    );

    return buildSnapshot(
      "supabase",
      cash,
      positions,
      orders,
      orders.length,
      portfolio.created_at ? String(portfolio.created_at) : null,
      startingCapital
    );
  } catch {
    const positions = Object.values(local.positions).filter((p) => p.qty > 0.000001);
    const syms = positions.map((p) => p.symbol);
    const { prices } = syms.length ? await fetchLivePrices(syms) : { prices: {} };

    return buildSnapshot(
      "local",
      local.cash,
      applyBuyPricesFromOrders(mapLocalPositions(local.positions, prices), localOrders),
      localOrders,
      localOrders.length,
      null,
      INITIAL_CASH
    );
  }
}

export function fmtUsd(n: number, signed = false) {
  const sign = signed ? (n >= 0 ? "+" : "−") : n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
