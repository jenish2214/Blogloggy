import { marketApi } from "@/lib/api";
import { buildQuoteBatch } from "@/lib/market/quoteSymbols";

export interface LiveQuoteMark {
  price: number;
  change: number;
  changePct: number;
}

/** Live price + day change for portfolio marks. Never throws. */
export async function fetchLiveQuoteMarks(
  portfolioSymbols: string[]
): Promise<{ marks: Record<string, LiveQuoteMark>; error?: string }> {
  const unique = Array.from(new Set(portfolioSymbols.filter(Boolean)));
  if (unique.length === 0) return { marks: {} };

  try {
    const { yahooSymbols, yahooToPortfolio } = buildQuoteBatch(unique);
    const { quotes } = await marketApi.getQuotes(yahooSymbols, true);
    const marks: Record<string, LiveQuoteMark> = {};

    for (const q of quotes) {
      if (!q.price || q.price <= 0) continue;
      const key = yahooToPortfolio[q.symbol] ?? q.symbol;
      marks[key] = {
        price: q.price,
        change: q.change ?? 0,
        changePct: q.changePct ?? 0,
      };
    }

    return { marks };
  } catch (e) {
    return {
      marks: {},
      error: e instanceof Error ? e.message : "Price fetch failed",
    };
  }
}
