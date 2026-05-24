import { marketApi } from "@/lib/api";
import type { FinnhubQuote, CompanyProfile } from "@/types/finnhub";
import { isYahooOnlySymbol } from "@/lib/market/popularSymbols";

/** Yahoo Finance fallback for gold, crypto, and symbols Finnhub does not cover. */
export async function loadYahooSymbolSnapshot(symbol: string): Promise<{
  quote: FinnhubQuote | null;
  profile: CompanyProfile | null;
}> {
  try {
    const { quotes } = await marketApi.getQuotes([symbol]);
    const q = quotes[0];
    if (!q || q.error || q.price == null || q.price <= 0) {
      return { quote: null, profile: null };
    }
    const quote: FinnhubQuote = {
      c: q.price,
      h: q.high ?? q.price,
      l: q.low ?? q.price,
      o: q.open ?? q.price,
      pc: q.price - (q.change ?? 0),
      d: q.change ?? null,
      dp: q.changePct ?? null,
    };
    const profile: CompanyProfile = {
      name: q.name || symbol,
      exchange: q.exchange || "—",
      industry: q.type === "crypto" ? "Cryptocurrency" : symbol.includes("=") ? "Commodity" : "—",
      logo: "",
      marketCapitalization: q.mktCap ? q.mktCap / 1e9 : 0,
      shareOutstanding: 0,
    };
    return { quote, profile };
  } catch {
    return { quote: null, profile: null };
  }
}

export function shouldUseYahooFirst(symbol: string): boolean {
  return isYahooOnlySymbol(symbol);
}
