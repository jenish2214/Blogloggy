import { portfolioApi } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import {
  usePortfolioStore,
  type AssetClass,
  type Order,
  type OrderType,
} from "@/lib/store/portfolio";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { mapServerOrder } from "@/lib/trading/orders";
import { notifyOrderPlaced } from "@/lib/trading/orderEvents";
import type { SnapshotPosition } from "@/lib/trading/portfolioSnapshot";

function sellQtyForAsset(qty: number, assetClass: string): number {
  if (assetClass === "crypto" || assetClass === "forex") return qty;
  return Math.round(qty * 10000) / 10000;
}

/**
 * Paper sell: always allowed (including weekends). Persists to Supabase when signed in.
 */
export async function sellHoldingPosition(
  pos: SnapshotPosition,
  currentPrice: number
): Promise<{ success: boolean; message: string }> {
  const qty = sellQtyForAsset(pos.qty, pos.assetClass);
  if (qty <= 0) {
    return { success: false, message: `No shares to sell in ${pos.symbol}` };
  }

  const fillPrice = currentPrice > 0 ? currentPrice : pos.currentPrice;
  if (fillPrice <= 0) {
    return { success: false, message: "No live price — refresh and try again." };
  }

  const params = {
    symbol: pos.symbol,
    name: pos.name,
    assetClass: pos.assetClass as AssetClass,
    side: "sell" as const,
    qty,
    orderType: "market" as OrderType,
    currentPrice: fillPrice,
  };

  const book = useActiveBookStore.getState().activeBook;
  const body = {
    ...params,
    filledPrice: fillPrice,
    portfolioId: book?.portfolioId,
    clientId: book?.clientId ?? undefined,
  };

  try {
    const serverRes = (await portfolioApi.placeOrder(body)) as {
      success: boolean;
      message: string;
      order?: Record<string, unknown>;
    };

    if (serverRes.success) {
      await finishSellSuccess(params, fillPrice, serverRes.order);
      return serverRes;
    }

    return await tryLocalSell(params, fillPrice, serverRes.message);
  } catch {
    return await tryLocalSell(params, fillPrice, "Could not reach server — trying local book.");
  }
}

async function tryLocalSell(
  params: {
    symbol: string;
    name: string;
    assetClass: AssetClass;
    side: "sell";
    qty: number;
    orderType: OrderType;
    currentPrice: number;
  },
  fillPrice: number,
  serverHint: string
): Promise<{ success: boolean; message: string }> {
  await syncPortfolioFromCloud().catch(() => false);
  const local = usePortfolioStore.getState().placeOrder(params);
  if (local.success) {
    notifyOrderPlaced();
    return local;
  }
  return {
    success: false,
    message: local.message || serverHint,
  };
}

async function finishSellSuccess(
  params: {
    symbol: string;
    name: string;
    assetClass: AssetClass;
    side: "sell";
    qty: number;
    orderType: OrderType;
    currentPrice: number;
  },
  fillPrice: number,
  order?: Record<string, unknown>
) {
  const record = order
    ? mapServerToStoreOrder(order)
    : {
        id: `ord-${Date.now()}`,
        symbol: params.symbol,
        assetClass: params.assetClass,
        side: "sell" as const,
        qty: params.qty,
        orderType: params.orderType,
        filledPrice: fillPrice,
        status: "filled" as const,
        createdAt: new Date().toISOString(),
        filledAt: new Date().toISOString(),
      };

  usePortfolioStore.getState().appendOrderRecord(record);
  await syncPortfolioFromCloud();
  notifyOrderPlaced();
}

function mapServerToStoreOrder(o: Record<string, unknown>): Order {
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
}
