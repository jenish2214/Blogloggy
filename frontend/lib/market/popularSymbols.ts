export interface PopularSymbol {
  symbol: string;
  name: string;
  type: "stock" | "gold" | "crypto" | "commodity";
}

/** Curated symbols for Quant Lab browse + A–Z filter. */
export const POPULAR_SYMBOLS: PopularSymbol[] = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { symbol: "AMZN", name: "Amazon.com", type: "stock" },
  { symbol: "AMD", name: "Advanced Micro Devices", type: "stock" },
  { symbol: "BAC", name: "Bank of America", type: "stock" },
  { symbol: "BTC-USD", name: "Bitcoin", type: "crypto" },
  { symbol: "DIS", name: "Walt Disney", type: "stock" },
  { symbol: "GC=F", name: "Gold Futures", type: "gold" },
  { symbol: "GOOGL", name: "Alphabet (Google)", type: "stock" },
  { symbol: "JPM", name: "JPMorgan Chase", type: "stock" },
  { symbol: "META", name: "Meta Platforms", type: "stock" },
  { symbol: "MSFT", name: "Microsoft", type: "stock" },
  { symbol: "NFLX", name: "Netflix", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA", type: "stock" },
  { symbol: "TSLA", name: "Tesla", type: "stock" },
  { symbol: "XOM", name: "Exxon Mobil", type: "stock" },
];

export const QUANT_LAB_MARKET_STRIP = [
  "AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "TSLA", "META", "GC=F",
];

export function filterPopularByLetter(letter: string | null): PopularSymbol[] {
  if (!letter) return POPULAR_SYMBOLS;
  const L = letter.toUpperCase();
  return POPULAR_SYMBOLS.filter(
    (s) => s.symbol.startsWith(L) || s.name.toUpperCase().startsWith(L)
  );
}

/** Finnhub uses tickers; commodities use Yahoo via fallback. */
export function isYahooOnlySymbol(symbol: string): boolean {
  return symbol.includes("=") || symbol.endsWith("-USD");
}
