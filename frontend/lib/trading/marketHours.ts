/** Market calendars for paper-trading order gates and status labels. */

export type MarketStatus = "open" | "closed" | "weekend";

export type MarketCalendarId =
  | "US_EQUITIES"
  | "INDIA_EQUITIES"
  | "UK_EQUITIES"
  | "CRYPTO";

export interface MarketHoursContext {
  symbol?: string;
  assetClass?: "stock" | "crypto" | "option" | "forex";
}

function tzParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(at);

  return {
    weekday: parts.find((p) => p.type === "weekday")?.value ?? "",
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

function mins(h: number, m: number) {
  return h * 60 + m;
}

function statusFromSession(
  at: Date,
  timeZone: string,
  openMin: number,
  closeMin: number
): MarketStatus {
  const { weekday, hour, minute } = tzParts(at, timeZone);
  if (weekday === "Sat" || weekday === "Sun") return "weekend";
  const now = mins(hour, minute);
  if (now >= openMin && now < closeMin) return "open";
  return "closed";
}

/** Detect which calendar applies to a symbol / asset class. */
export function detectMarketCalendar(ctx: MarketHoursContext): MarketCalendarId {
  const symbol = ctx.symbol?.trim().toUpperCase() ?? "";
  const assetClass = ctx.assetClass;

  if (assetClass === "crypto" || symbol.endsWith("-USD")) return "CRYPTO";
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) return "INDIA_EQUITIES";
  if (symbol.endsWith(".L")) return "UK_EQUITIES";

  return "US_EQUITIES";
}

export function getMarketCalendarStatus(
  calendar: MarketCalendarId,
  at: Date = new Date()
): MarketStatus {
  switch (calendar) {
    case "CRYPTO":
      return "open";
    case "INDIA_EQUITIES":
      return statusFromSession(at, "Asia/Kolkata", mins(9, 15), mins(15, 30));
    case "UK_EQUITIES":
      return statusFromSession(at, "Europe/London", mins(8, 0), mins(16, 30));
    case "US_EQUITIES":
    default:
      return statusFromSession(at, "America/New_York", mins(9, 30), mins(16, 0));
  }
}

export function getUSMarketStatus(at: Date = new Date()): MarketStatus {
  return getMarketCalendarStatus("US_EQUITIES", at);
}

export function isUSMarketOpen(at: Date = new Date()): boolean {
  return getUSMarketStatus(at) === "open";
}

export function getSymbolMarketStatus(ctx: MarketHoursContext, at: Date = new Date()): MarketStatus {
  return getMarketCalendarStatus(detectMarketCalendar(ctx), at);
}

export function isSymbolMarketOpen(ctx: MarketHoursContext, at: Date = new Date()): boolean {
  return getSymbolMarketStatus(ctx, at) === "open";
}

export function getMarketStatusLabel(ctx: MarketHoursContext = {}, at: Date = new Date()): string {
  const calendar = detectMarketCalendar(ctx);
  const status = getMarketCalendarStatus(calendar, at);

  if (calendar === "CRYPTO") return "Crypto — 24/7";

  if (status === "weekend") {
    if (calendar === "INDIA_EQUITIES") return "NSE closed — weekend";
    if (calendar === "UK_EQUITIES") return "LSE closed — weekend";
    return "Market closed — Saturday & Sunday";
  }
  if (status === "open") {
    if (calendar === "INDIA_EQUITIES") return "NSE open (IST)";
    if (calendar === "UK_EQUITIES") return "LSE open (GMT/BST)";
    return "US market open";
  }
  if (calendar === "INDIA_EQUITIES") return "NSE closed — after hours";
  if (calendar === "UK_EQUITIES") return "LSE closed — after hours";
  return "Market closed — after hours";
}

/** Paper orders accepted when the symbol's market session allows trading. */
export function canPlaceMarketOrders(ctx: MarketHoursContext = {}, at: Date = new Date()): boolean {
  const calendar = detectMarketCalendar(ctx);
  if (calendar === "CRYPTO") return true;
  return getMarketCalendarStatus(calendar, at) !== "weekend";
}

/** Paper sells from portfolio always execute (demo account — uses last/live mark). */
export function canSellPaperPosition(_ctx: MarketHoursContext = {}): boolean {
  return true;
}

export function getTradingBlockReason(ctx: MarketHoursContext = {}, at: Date = new Date()): string | null {
  if (canPlaceMarketOrders(ctx, at)) return null;

  const calendar = detectMarketCalendar(ctx);
  if (calendar === "INDIA_EQUITIES") {
    return "Buy and sell orders for NSE stocks are not accepted on Saturday or Sunday.";
  }
  if (calendar === "UK_EQUITIES") {
    return "Buy and sell orders for LSE stocks are not accepted on Saturday or Sunday.";
  }
  if (calendar === "CRYPTO") return null;
  return "Buy and sell orders are not accepted on Saturday or Sunday. Prices are frozen until Monday.";
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

/** True when US equities are in weekend — used for legacy portfolio-wide banners. */
export function isUSEquityWeekend(at: Date = new Date()): boolean {
  return getUSMarketStatus(at) === "weekend";
}
