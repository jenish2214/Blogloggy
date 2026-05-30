import { getTradingBlockReason, type MarketHoursContext } from "@/lib/trading/marketHours";

export const APP_TOAST_EVENT = "quantdesk:app-toast";

export type AppToastType = "success" | "error" | "info";

export type AppToastDetail = {
  type: AppToastType;
  title: string;
  message?: string;
  durationMs?: number;
};

export function emitAppToast(detail: AppToastDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AppToastDetail>(APP_TOAST_EVENT, { detail }));
}

function isWeekendMessage(message: string) {
  return /saturday|sunday|weekend/i.test(message);
}

export function notifyWeekendTradingBlocked(ctx: MarketHoursContext = {}) {
  const message =
    getTradingBlockReason(ctx) ??
    "Buy and sell orders are not accepted on Saturday or Sunday.";
  emitAppToast({
    type: "info",
    title: "Weekend — market closed",
    message,
    durationMs: 7000,
  });
}

export function notifyOrderPlacedToast(params: {
  side: "buy" | "sell";
  symbol: string;
  qty: number;
  message: string;
}) {
  const sideLabel = params.side === "buy" ? "Buy" : "Sell";
  emitAppToast({
    type: "success",
    title: `${sideLabel} order filled`,
    message: `${params.qty} × ${params.symbol} — ${params.message}`,
  });
}

export function notifyOrderFailedToast(params: {
  side: "buy" | "sell";
  symbol: string;
  message: string;
}) {
  const weekend = isWeekendMessage(params.message);
  const sideLabel = params.side === "buy" ? "Buy" : "Sell";
  emitAppToast({
    type: weekend ? "info" : "error",
    title: weekend ? "Weekend — cannot trade" : `${sideLabel} order failed`,
    message: params.message,
    durationMs: weekend ? 7000 : 5000,
  });
}
