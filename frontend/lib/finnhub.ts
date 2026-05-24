/**
 * Finnhub browser client — calls `/api/quant/finnhub/*` (server proxy uses official `finnhub` SDK).
 */

import type {
  BasicFinancials,
  CandleData,
  CompanyProfile,
  EarningsRow,
  FinnhubQuote,
  NewsSentiment,
} from "@/types/finnhub";

async function finnhubFetch<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams(params);
  try {
    const res = await fetch(`/api/quant/finnhub/${endpoint}?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  return finnhubFetch<FinnhubQuote>("quote", { symbol });
}

export async function getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  return finnhubFetch<CompanyProfile>("profile", { symbol });
}

export async function getBasicFinancials(symbol: string): Promise<BasicFinancials | null> {
  return finnhubFetch<BasicFinancials>("metric", { symbol, metric: "all" });
}

export async function getNewsSentiment(symbol: string): Promise<NewsSentiment | null> {
  return finnhubFetch<NewsSentiment>("news-sentiment", { symbol });
}

export async function getEarnings(symbol: string): Promise<EarningsRow[] | null> {
  const data = await finnhubFetch<EarningsRow[]>("earnings", { symbol });
  if (!data || !Array.isArray(data)) return null;
  return data.slice(0, 4);
}

export async function getCandleData(
  symbol: string,
  from: number,
  to: number,
  resolution = "D"
): Promise<CandleData | null> {
  return finnhubFetch<CandleData>("candle", {
    symbol,
    from: String(from),
    to: String(to),
    resolution,
  });
}

/** Load quote + profile for Quant Lab header / overview. */
export async function loadSymbolSnapshot(symbol: string) {
  const [quote, profile] = await Promise.all([
    getQuote(symbol),
    getCompanyProfile(symbol),
  ]);
  return { quote, profile };
}

export function isValidQuote(quote: FinnhubQuote | null | undefined): quote is FinnhubQuote & { c: number } {
  return quote != null && quote.c != null && quote.c > 0;
}
