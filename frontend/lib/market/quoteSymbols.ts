/** Map internal / portfolio symbols to Yahoo Finance quote tickers. */
const YAHOO_QUOTE_MAP: Record<string, string> = {
  CRUDE_OIL: "CL=F",
  GOLD: "GC=F",
  NATURAL_GAS: "NG=F",
};

export function resolveQuoteSymbol(symbol: string): string {
  return YAHOO_QUOTE_MAP[symbol] ?? symbol;
}

/** Build Yahoo symbol list + map quote results back to portfolio symbols. */
export function buildQuoteBatch(portfolioSymbols: string[]) {
  const yahooToPortfolio: Record<string, string> = {};
  const yahooSymbols: string[] = [];

  for (const ps of portfolioSymbols) {
    const yahoo = resolveQuoteSymbol(ps);
    yahooToPortfolio[yahoo] = ps;
    yahooSymbols.push(yahoo);
  }

  return {
    yahooSymbols: Array.from(new Set(yahooSymbols)),
    yahooToPortfolio,
  };
}

export function mapQuotesToPortfolioPrices(
  quotes: Array<{ symbol: string; price: number }>,
  yahooToPortfolio: Record<string, string>
): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const q of quotes) {
    if (!q.price || q.price <= 0) continue;
    const key = yahooToPortfolio[q.symbol] ?? q.symbol;
    prices[key] = q.price;
  }
  return prices;
}
