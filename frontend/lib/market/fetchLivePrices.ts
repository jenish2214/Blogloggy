import { marketApi } from "@/lib/api";
import { buildQuoteBatch, mapQuotesToPortfolioPrices } from "@/lib/market/quoteSymbols";

/** Fetch live Yahoo prices mapped back to portfolio symbol keys. Never throws. */
export async function fetchLivePrices(
  portfolioSymbols: string[]
): Promise<{ prices: Record<string, number>; error?: string }> {
  const unique = Array.from(new Set(portfolioSymbols.filter(Boolean)));
  if (unique.length === 0) return { prices: {} };

  try {
    const { yahooSymbols, yahooToPortfolio } = buildQuoteBatch(unique);
    const { quotes } = await marketApi.getQuotes(yahooSymbols, true);
    const prices = mapQuotesToPortfolioPrices(quotes, yahooToPortfolio);
    return { prices };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Price fetch failed";
    return { prices: {}, error: message };
  }
}
