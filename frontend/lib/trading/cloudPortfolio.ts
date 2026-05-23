import { portfolioApi } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import {
  usePortfolioStore,
  type AssetClass,
  type Order,
  type OrderType,
} from "@/lib/store/portfolio";
import { mapServerOrder } from "@/lib/trading/orders";

function activeBookParams() {
  const book = useActiveBookStore.getState().activeBook;
  if (!book) return undefined;
  return { portfolioId: book.portfolioId, clientId: book.clientId };
}

/** Ensure Supabase has a portfolio row and return cloud snapshot into the local cache. */
export async function syncPortfolioFromCloud(): Promise<boolean> {
  try {
    const data = await portfolioApi.get(activeBookParams());
    applyCloudSnapshot(data);
    if (data.activeBook) {
      useActiveBookStore.getState().setActiveBook({
        portfolioId: data.activeBook.portfolioId,
        clientId: data.activeBook.clientId,
        accountType: data.activeBook.accountType,
        label: data.activeBook.label,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function applyCloudSnapshot(data: {
  portfolio: Record<string, unknown> | null;
  positions?: Record<string, unknown>[];
  orders?: Record<string, unknown>[];
}) {
  const portfolio = data.portfolio;
  if (!portfolio) return;

  const cash = Number(portfolio.cash);
  const positionsRaw = (data.positions ?? []) as Record<string, unknown>[];
  const ordersRaw = (data.orders ?? []) as Record<string, unknown>[];

  const positions: Record<string, import("@/lib/store/portfolio").Position> = {};
  for (const p of positionsRaw) {
    if (Number(p.qty) <= 0.000001) continue;
    const sym = String(p.symbol);
    const avg = Number(p.avg_price);
    const cur = Number(p.current_price) || avg;
    const qty = Number(p.qty);
    positions[sym] = {
      symbol: sym,
      name: String(p.name ?? sym),
      assetClass: String(p.asset_class ?? "stock") as AssetClass,
      qty,
      avgPrice: avg,
      currentPrice: cur,
      marketValue: cur * qty,
      unrealizedPnl: (cur - avg) * qty,
      unrealizedPnlPct: avg > 0 ? ((cur - avg) / avg) * 100 : 0,
    };
  }

  const orders: Order[] = ordersRaw.map((o) => {
    const mapped = mapServerOrder(o);
    return {
      id: mapped.id,
      symbol: mapped.symbol,
      assetClass: mapped.assetClass as AssetClass,
      side: mapped.side,
      qty: mapped.qty,
      orderType: mapped.orderType as OrderType,
      filledPrice: mapped.filledPrice,
      status: (mapped.status as Order["status"]) ?? "filled",
      createdAt: mapped.createdAt,
      filledAt: mapped.createdAt,
    };
  });

  const posValue = Object.values(positions).reduce((s, p) => s + p.marketValue, 0);
  const totalValue = cash + posValue;
  const starting = Number(portfolio.starting_capital) || 100_000;
  const totalPnl = totalValue - starting;
  const totalPnlPct = starting > 0 ? (totalPnl / starting) * 100 : 0;

  usePortfolioStore.setState({
    cash,
    positions,
    orders,
    totalValue,
    totalPnl,
    totalPnlPct,
  });
}
