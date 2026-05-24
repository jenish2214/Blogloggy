/**
 * Finnhub REST quotes (server-side) via official `finnhub` npm SDK.
 * @see https://finnhub.io/docs/api/quote
 */

import { fmt } from "@/lib/market-fetch";
import { inferCountryFromSymbol } from "@/lib/markets/world-markets";
import type { MarketQuoteRow } from "@/lib/market/alphaVantage";
import { buildFinnhubSymbolMap, toFinnhubSymbol } from "@/lib/market/finnhubSymbols";
import {
  finnhubQuote,
  isFinnhubConfigured,
} from "@/lib/market/finnhubClient";

export { isFinnhubConfigured };

const CACHE_TTL_MS = 15_000;
const quoteCache = new Map<string, { quote: MarketQuoteRow; expiresAt: number }>();

async function fetchQuote(finnhubSymbol: string, portfolioSymbol: string): Promise<MarketQuoteRow | null> {
  const cached = quoteCache.get(portfolioSymbol);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  if (!isFinnhubConfigured()) return null;

  try {
    const data = await finnhubQuote(finnhubSymbol);
    const price = data.c ?? 0;
    if (price <= 0) return null;

    const change = data.d ?? 0;
    const changePct = data.dp ?? 0;

    const quote: MarketQuoteRow = {
      symbol: portfolioSymbol,
      name: portfolioSymbol,
      price: fmt(price) ?? price,
      change: fmt(change) ?? change,
      changePct: fmt(changePct) ?? changePct,
      open: fmt(data.o),
      high: fmt(data.h),
      low: fmt(data.l),
      volume: null,
      mktCap: null,
      currency: portfolioSymbol.includes("=X") ? "FX" : "USD",
      exchange: "Finnhub",
      country: inferCountryFromSymbol(portfolioSymbol),
      type: portfolioSymbol.endsWith("-USD")
        ? "crypto"
        : portfolioSymbol.includes("=X")
          ? "forex"
          : "stock",
      updatedAt: data.t ? new Date(data.t * 1000).toISOString() : new Date().toISOString(),
      provider: "finnhub",
    };

    quoteCache.set(portfolioSymbol, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
    return quote;
  } catch {
    return null;
  }
}

/** Fetch quotes for portfolio symbols via Finnhub REST. */
export async function fetchFinnhubQuotes(symbols: string[]): Promise<{
  quotes: MarketQuoteRow[];
  skipped: string[];
}> {
  if (!isFinnhubConfigured()) {
    return { quotes: [], skipped: symbols };
  }

  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
  const quotes: MarketQuoteRow[] = [];
  const skipped: string[] = [];

  await Promise.all(
    unique.map(async (ps) => {
      const fh = toFinnhubSymbol(ps);
      if (!fh) {
        skipped.push(ps);
        return;
      }
      try {
        const q = await fetchQuote(fh, ps);
        if (q) quotes.push(q);
        else skipped.push(ps);
      } catch {
        skipped.push(ps);
      }
    })
  );

  return { quotes, skipped };
}

export { buildFinnhubSymbolMap, toFinnhubSymbol };
