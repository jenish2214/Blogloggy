/** Map portfolio / app symbols ↔ Finnhub REST & WebSocket tickers. */

const YAHOO_ONLY: Record<string, string> = {
  CRUDE_OIL: "CL=F",
  GOLD: "GC=F",
  NATURAL_GAS: "NG=F",
};

/** portfolio symbol → Finnhub symbol (null = use Yahoo fallback). */
export function toFinnhubSymbol(symbol: string): string | null {
  const s = symbol.toUpperCase().trim();

  if (s in YAHOO_ONLY || s.includes("=F")) return null;

  if (s.endsWith("-USD")) {
    const base = s.replace("-USD", "");
    if (base === "BTC") return "BINANCE:BTCUSDT";
    if (base === "ETH") return "BINANCE:ETHUSDT";
    if (base === "SOL") return "BINANCE:SOLUSDT";
    if (base === "BNB") return "BINANCE:BNBUSDT";
    return `BINANCE:${base}USDT`;
  }

  if (s.includes("=X")) {
    const pair = s.replace("=X", "").replace("/", "");
    if (pair.length === 6) {
      return `OANDA:${pair.slice(0, 3)}_${pair.slice(3)}`;
    }
  }

  if (s === "GOLD") return "BINANCE:XAUUSDT";

  return s;
}

/** Build Finnhub subscribe list + reverse map Finnhub → portfolio symbol. */
export function buildFinnhubSymbolMap(portfolioSymbols: string[]) {
  const finnhubToPortfolio: Record<string, string> = {};
  const finnhubSymbols: string[] = [];

  for (const ps of portfolioSymbols) {
    const fh = toFinnhubSymbol(ps);
    if (!fh) continue;
    finnhubToPortfolio[fh] = ps;
    finnhubSymbols.push(fh);
  }

  return {
    finnhubSymbols: Array.from(new Set(finnhubSymbols)),
    finnhubToPortfolio,
  };
}

/** Browser WebSocket disabled — Finnhub key stays server-side; use HTTP polling instead. */
export function isFinnhubWebSocketEnabled(): boolean {
  return false;
}
