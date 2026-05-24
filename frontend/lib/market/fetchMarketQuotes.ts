import { yahooFinance } from "@/lib/yahoo-client";
import { fmt } from "@/lib/market-fetch";
import { inferCountryFromSymbol } from "@/lib/markets/world-markets";
import { buildQuoteBatch, resolveQuoteSymbol } from "@/lib/market/quoteSymbols";
import {
  fetchAlphaVantageQuotes,
  isAlphaVantageConfigured,
  type MarketQuoteRow,
} from "@/lib/market/alphaVantage";
import { fetchFinnhubQuotes, isFinnhubConfigured } from "@/lib/market/finnhub";
import { fetchMassiveQuotes, isMassiveConfigured } from "@/lib/market/massive";

export type QuoteProvider = "massive" | "finnhub" | "alphavantage" | "yahoo" | "mixed";

export type UnifiedQuote = MarketQuoteRow & {
  provider: QuoteProvider;
};

interface YahooQuoteRow {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  currency?: string;
  fullExchangeName?: string;
  exchange?: string;
}

function parseYahooQuote(q: YahooQuoteRow, requestSymbol?: string): UnifiedQuote | null {
  const symbol = q.symbol ?? requestSymbol ?? "";
  const price = q.regularMarketPrice ?? 0;
  if (price <= 0) return null;

  const change = q.regularMarketChange ?? 0;
  const changePct = q.regularMarketChangePercent ?? 0;

  return {
    symbol,
    name: q.shortName ?? q.longName ?? symbol,
    price: fmt(price) ?? price,
    change: fmt(change) ?? change,
    changePct: fmt(changePct) ?? changePct,
    open: fmt(q.regularMarketOpen),
    high: fmt(q.regularMarketDayHigh),
    low: fmt(q.regularMarketDayLow),
    volume: q.regularMarketVolume ?? null,
    mktCap: q.marketCap ?? null,
    currency: q.currency ?? "USD",
    exchange: q.fullExchangeName ?? q.exchange ?? "Yahoo Finance",
    country: inferCountryFromSymbol(symbol),
    type: symbol.endsWith("-USD") ? "crypto" : "stock",
    updatedAt: new Date().toISOString(),
    provider: "yahoo",
  };
}

async function fetchYahooQuotes(symbols: string[]): Promise<UnifiedQuote[]> {
  const { yahooSymbols, yahooToPortfolio } = buildQuoteBatch(symbols);
  const quotes: UnifiedQuote[] = [];

  try {
    const rows = await yahooFinance.quote(yahooSymbols);
    const list = Array.isArray(rows) ? rows : [rows];
    for (const row of list) {
      const yahooSym = String((row as YahooQuoteRow).symbol ?? "");
      const portfolioSym = yahooToPortfolio[yahooSym] ?? yahooSym;
      const parsed = parseYahooQuote(row as YahooQuoteRow, portfolioSym);
      if (parsed) quotes.push(parsed);
    }
  } catch {
    for (const sym of symbols) {
      try {
        const yahooSym = resolveQuoteSymbol(sym);
        const row = await yahooFinance.quote(yahooSym);
        const one = Array.isArray(row) ? row[0] : row;
        const parsed = parseYahooQuote(one as YahooQuoteRow, sym);
        if (parsed) quotes.push(parsed);
      } catch {
        /* skip */
      }
    }
  }

  return quotes;
}

function resolveProvider(counts: Record<QuoteProvider, number>): QuoteProvider {
  const active = (Object.entries(counts) as [QuoteProvider, number][]).filter(([, n]) => n > 0);
  if (active.length > 1) return "mixed";
  return active[0]?.[0] ?? "yahoo";
}

/**
 * Provider priority: Massive → Finnhub → Yahoo → Alpha Vantage (last).
 */
export async function fetchMarketQuotes(symbols: string[]): Promise<{
  quotes: UnifiedQuote[];
  provider: QuoteProvider;
}> {
  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  if (unique.length === 0) return { quotes: [], provider: "yahoo" };

  const bySymbol = new Map<string, UnifiedQuote>();

  const massiveP = isMassiveConfigured()
    ? fetchMassiveQuotes(unique)
    : Promise.resolve({ quotes: [] as UnifiedQuote[], skipped: [...unique] });
  const finnhubP =
    isFinnhubConfigured()
      ? fetchFinnhubQuotes(unique)
      : Promise.resolve({ quotes: [] as MarketQuoteRow[], skipped: [...unique] });

  const [massiveRes, fhRes] = await Promise.all([massiveP, finnhubP]);

  for (const q of massiveRes.quotes) {
    bySymbol.set(q.symbol.toUpperCase(), { ...q, provider: "massive" });
  }
  for (const q of fhRes.quotes) {
    const key = q.symbol.toUpperCase();
    if (!bySymbol.has(key)) {
      bySymbol.set(key, { ...q, provider: "finnhub" });
    }
  }

  let skipped = unique.filter((s) => !bySymbol.has(s.toUpperCase()));

  if (skipped.length > 0) {
    const yahooQuotes = await fetchYahooQuotes(skipped);
    for (const q of yahooQuotes) {
      const key = q.symbol.toUpperCase();
      if (!bySymbol.has(key)) bySymbol.set(key, q);
    }
  }

  skipped = unique.filter((s) => !bySymbol.has(s));

  if (skipped.length > 0 && isAlphaVantageConfigured()) {
    const { quotes: avQuotes } = await fetchAlphaVantageQuotes(skipped);
    for (const q of avQuotes) {
      const key = q.symbol.toUpperCase();
      if (!bySymbol.has(key)) {
        bySymbol.set(key, { ...q, provider: "alphavantage" });
      }
    }
  }

  const quotes = unique.map((s) => bySymbol.get(s)).filter((q): q is UnifiedQuote => !!q);

  const counts: Record<QuoteProvider, number> = {
    massive: 0,
    finnhub: 0,
    alphavantage: 0,
    yahoo: 0,
    mixed: 0,
  };
  for (const q of quotes) {
    const p = q.provider === "massive" ? "massive" : q.provider === "finnhub" ? "finnhub" : q.provider === "alphavantage" ? "alphavantage" : "yahoo";
    counts[p] += 1;
  }

  return {
    quotes,
    provider: resolveProvider(counts),
  };
}
