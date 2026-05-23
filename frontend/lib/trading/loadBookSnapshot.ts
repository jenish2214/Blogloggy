import { portfolioApi } from "@/lib/api";
import { fetchLivePrices } from "@/lib/market/fetchLivePrices";
import { computePnlFromOrders, INITIAL_CASH, type PnlSummary } from "@/lib/trading/pnlStatement";
import { mapRawServerOrders } from "@/lib/trading/mergeOrders";
import type { OrderRecord } from "@/lib/trading/orders";
import { enrichPositionMetrics, type PortfolioSnapshot, type SnapshotPosition } from "@/lib/trading/portfolioSnapshot";

function mapPositions(
  raw: Record<string, unknown>[],
  prices: Record<string, number>
): SnapshotPosition[] {
  return raw
    .filter((p) => Number(p.qty) > 0.000001)
    .map((p) => {
      const qty = Number(p.qty);
      const avgPrice = Number(p.avg_price);
      const currentPrice = prices[String(p.symbol)] ?? Number(p.current_price) ?? avgPrice;
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

function makeSnapshot(
  cash: number,
  positions: SnapshotPosition[],
  orders: OrderRecord[],
  portfolioCreated: string | null,
  startingCapital: number
): PortfolioSnapshot {
  const investedValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const unrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalValue = cash + investedValue;
  const totalPnl = totalValue - startingCapital;
  const totalPnlPct = startingCapital > 0 ? (totalPnl / startingCapital) * 100 : 0;
  const pnl: PnlSummary = computePnlFromOrders(orders);

  return {
    source: "supabase",
    cash,
    startingCapital,
    investedValue,
    totalValue,
    totalPnl,
    totalPnlPct,
    unrealizedPnl,
    positions,
    orders,
    orderCount: orders.length,
    pnl,
    portfolioCreated,
  };
}

/** Load snapshot for a specific book (personal or client). */
export async function loadBookSnapshot(book?: {
  portfolioId?: string;
  clientId?: string | null;
}): Promise<PortfolioSnapshot | null> {
  try {
    const portfolioData = await portfolioApi.get(book);
    const portfolio = portfolioData.portfolio as Record<string, unknown> | null;
    if (!portfolio) return null;

    const cash = Number(portfolio.cash) ?? INITIAL_CASH;
    const startingCapital = Number(portfolio.starting_capital) || INITIAL_CASH;
    const positionsRaw = (portfolioData.positions ?? []) as Record<string, unknown>[];
    const ordersRaw = (portfolioData.orders ?? []) as Record<string, unknown>[];
    const orders = mapRawServerOrders(ordersRaw);

    const syms = positionsRaw
      .filter((p) => Number(p.qty) > 0.000001)
      .map((p) => String(p.symbol));
    const { prices } = syms.length ? await fetchLivePrices(syms) : { prices: {} };
    const positions = mapPositions(positionsRaw, prices);

    return makeSnapshot(
      cash,
      positions,
      orders,
      portfolio.created_at ? String(portfolio.created_at) : null,
      startingCapital
    );
  } catch {
    return null;
  }
}
