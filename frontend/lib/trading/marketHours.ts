/** US equity market hours (NYSE/NASDAQ) — Eastern Time. */

export type MarketStatus = "open" | "closed" | "weekend";

export function getUSMarketStatus(at: Date = new Date()): MarketStatus {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(at);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  if (weekday === "Sat" || weekday === "Sun") return "weekend";

  const mins = hour * 60 + minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;

  if (mins >= open && mins < close) return "open";
  return "closed";
}

export function isUSMarketOpen(at: Date = new Date()): boolean {
  return getUSMarketStatus(at) === "open";
}

export function getMarketStatusLabel(at: Date = new Date()): string {
  const status = getUSMarketStatus(at);
  if (status === "weekend") return "Market closed — Saturday & Sunday";
  if (status === "open") return "US market open";
  return "Market closed — after hours";
}

/** Paper orders only accepted Mon–Fri (US market calendar). */
export function canPlaceMarketOrders(at: Date = new Date()): boolean {
  return getUSMarketStatus(at) !== "weekend";
}

export function getTradingBlockReason(at: Date = new Date()): string | null {
  const status = getUSMarketStatus(at);
  if (status === "weekend") {
    return "Buy and sell orders are not accepted on Saturday or Sunday. Prices are frozen until Monday.";
  }
  return null;
}

export function formatExitTimestamp(at: Date = new Date()): string {
  return at.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
