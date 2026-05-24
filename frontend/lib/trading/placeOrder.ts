import { portfolioApi } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import {
  usePortfolioStore,
  type AssetClass,
  type Order,
  type OrderType,
  type Side,
} from "@/lib/store/portfolio";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { canPlaceMarketOrders, getTradingBlockReason } from "@/lib/trading/marketHours";
import { mapServerOrder } from "@/lib/trading/orders";
import { notifyOrderPlaced } from "@/lib/trading/orderEvents";

export interface PlaceOrderInput {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  side: Side;
  qty: number;
  orderType: OrderType;
  currentPrice: number;
  limitPrice?: number;
}

function buildOrderRecord(
  params: PlaceOrderInput & { filledPrice: number; filledQty?: number }
): Order {
  const qty = params.filledQty ?? params.qty;
  return {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    symbol: params.symbol,
    assetClass: params.assetClass,
    side: params.side,
    qty,
    orderType: params.orderType,
    limitPrice: params.limitPrice,
    filledPrice: params.filledPrice,
    status: "filled",
    createdAt: new Date().toISOString(),
    filledAt: new Date().toISOString(),
  };
}

/**
 * Place a paper order: persists to Supabase when signed in, always updates local order history.
 */
export async function executePlaceOrder(
  params: PlaceOrderInput
): Promise<{ success: boolean; message: string }> {
  if (!canPlaceMarketOrders()) {
    return { success: false, message: getTradingBlockReason() ?? "Market closed" };
  }

  const fillPrice =
    params.orderType === "limit" && params.limitPrice
      ? params.limitPrice
      : params.currentPrice;

  const book = useActiveBookStore.getState().activeBook;
  const body = {
    symbol: params.symbol,
    name: params.name,
    assetClass: params.assetClass,
    side: params.side,
    qty: params.qty,
    orderType: params.orderType,
    filledPrice: fillPrice,
    limitPrice: params.orderType === "limit" ? params.limitPrice : undefined,
    portfolioId: book?.portfolioId,
    clientId: book?.clientId ?? undefined,
  };

  try {
    const serverRes = await portfolioApi.placeOrder(body) as {
      success: boolean;
      message: string;
      order?: Record<string, unknown>;
    };

    if (serverRes.success) {
      const record = serverRes.order
        ? mapServerToStoreOrder(serverRes.order)
        : buildOrderRecord({ ...params, filledPrice: fillPrice });
      usePortfolioStore.getState().appendOrderRecord(record);
      await syncPortfolioFromCloud();
      notifyOrderPlaced();
    }

    return { success: serverRes.success, message: serverRes.message };
  } catch {
    const res = usePortfolioStore.getState().placeOrder(params);
    if (res.success) notifyOrderPlaced();
    return res;
  }
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

