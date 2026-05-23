/** Educational starter picks — not investment advice. */

export interface SuggestionPick {
  symbol: string;
  name: string;
  /** Share of available cash to allocate (0–1). */
  allocPct: number;
  reason: string;
  style: "core" | "large-cap" | "growth" | "diversifier";
}

export const STARTER_PICKS: SuggestionPick[] = [
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    allocPct: 0.22,
    style: "core",
    reason: "Core holding — tracks the broad U.S. market. Good first lesson in diversification.",
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    allocPct: 0.14,
    style: "large-cap",
    reason: "Highly liquid large-cap. Practice sizing a single-name stock with part of your cash.",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    allocPct: 0.14,
    style: "large-cap",
    reason: "Another mega-cap tech name — compare how two stocks move in your paper book.",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    allocPct: 0.1,
    style: "large-cap",
    reason: "Adds exposure outside your first two picks without using all your wallet.",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    allocPct: 0.1,
    style: "growth",
    reason: "Higher-beta name for learning volatility — only with money you can afford in demo.",
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    allocPct: 0.08,
    style: "diversifier",
    reason: "Financials sector diversifier — balances tech-heavy starter lists.",
  },
];

export interface StockSuggestion {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  suggestedShares: number;
  estimatedCost: number;
  pctOfCash: number;
  cashRemainingAfter: number;
  reason: string;
  style: SuggestionPick["style"];
}

export function buildMoneyWiseSuggestions(
  cash: number,
  prices: Record<string, { price: number; name?: string; changePct?: number }>,
  picks: SuggestionPick[] = STARTER_PICKS
): StockSuggestion[] {
  if (cash <= 0) return [];

  const reservePct = 0.12;
  const budget = cash * (1 - reservePct);
  let spent = 0;
  const out: StockSuggestion[] = [];

  for (const pick of picks) {
    const q = prices[pick.symbol];
    if (!q || q.price <= 0) continue;

    const targetDollars = budget * pick.allocPct;
    const remaining = budget - spent;
    const dollars = Math.min(targetDollars, remaining);
    if (dollars < q.price * 0.5) continue;

    let shares = Math.floor(dollars / q.price);
    if (shares < 1) shares = 1;

    const cost = shares * q.price;
    if (spent + cost > budget) {
      shares = Math.floor((budget - spent) / q.price);
      if (shares < 1) continue;
    }

    const finalCost = shares * q.price;
    spent += finalCost;

    out.push({
      symbol: pick.symbol,
      name: q.name ?? pick.name,
      price: q.price,
      changePct: q.changePct ?? 0,
      suggestedShares: shares,
      estimatedCost: finalCost,
      pctOfCash: (finalCost / cash) * 100,
      cashRemainingAfter: Math.max(0, cash - spent - cash * reservePct),
      reason: pick.reason,
      style: pick.style,
    });

    if (spent >= budget * 0.88) break;
  }

  return out;
}

export function isNewTrader(positionsCount: number, ordersCount: number): boolean {
  return positionsCount === 0 && ordersCount < 3;
}
