export type MarketRegion = "us" | "india" | "uk" | "europe" | "asia" | "indices";

export interface MarketRegionMeta {
  id: MarketRegion;
  label: string;
  flag: string;
  currency: string;
  exchange: string;
  symbols: string[];
}

/** Curated real symbols via Yahoo Finance (suffix = exchange) */
export const WORLD_MARKETS: Record<MarketRegion, MarketRegionMeta> = {
  us: {
    id: "us",
    label: "United States",
    flag: "🇺🇸",
    currency: "USD",
    exchange: "NYSE / NASDAQ",
    symbols: [
      "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
      "JPM", "V", "UNH", "JNJ", "WMT", "PG", "MA", "HD", "CVX", "LLY",
      "ABBV", "MRK", "KO", "PEP", "BAC", "TMO", "COST", "AVGO", "AMD", "INTC", "QCOM", "CSCO",
    ],
  },
  india: {
    id: "india",
    label: "India",
    flag: "🇮🇳",
    currency: "INR",
    exchange: "NSE / BSE",
    symbols: [
      "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
      "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
      "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS",
      "BAJFINANCE.NS", "WIPRO.NS", "ULTRACEMCO.NS", "SUNPHARMA.NS", "NESTLEIND.NS",
    ],
  },
  uk: {
    id: "uk",
    label: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    exchange: "LSE",
    symbols: [
      "SHEL.L", "AZN.L", "HSBA.L", "ULVR.L", "BP.L", "GSK.L", "RIO.L",
      "DGE.L", "REL.L", "LLOY.L", "BARC.L", "VOD.L", "NG.L", "BA.L",
      "PRU.L", "AAL.L", "TSCO.L", "BT-A.L", "STAN.L", "NXT.L",
    ],
  },
  europe: {
    id: "europe",
    label: "Europe",
    flag: "🇪🇺",
    currency: "EUR",
    exchange: "XETRA / Euronext",
    symbols: [
      "SAP.DE", "ASML.AS", "OR.PA", "MC.PA", "SIE.DE", "AIR.PA",
      "SAN.PA", "ALV.DE", "SU.PA", "DTE.DE", "BNP.PA", "IBE.MC",
      "ENEL.MI", "VOW3.DE", "BAS.DE", "ADYEN.AS", "PHIA.AS", "INGA.AS",
    ],
  },
  asia: {
    id: "asia",
    label: "Asia Pacific",
    flag: "🌏",
    currency: "Multi",
    exchange: "TSE / HKEX / ASX",
    symbols: [
      "7203.T", "9984.T", "6758.T", "6861.T", "8306.T",
      "0700.HK", "9988.HK", "3690.HK", "1810.HK", "9618.HK",
      "BHP.AX", "CBA.AX", "CSL.AX", "NAB.AX", "WES.AX",
    ],
  },
  indices: {
    id: "indices",
    label: "Global Indices",
    flag: "📈",
    currency: "Multi",
    exchange: "Worldwide",
    symbols: [
      "^GSPC", "^DJI", "^IXIC", "^NSEI", "^BSESN", "^FTSE", "^GDAXI",
      "^FCHI", "^N225", "^HSI", "^AXJO", "^STOXX50E", "^VIX",
    ],
  },
};

export function getRegionSymbols(region: string): string[] | null {
  const key = region.toLowerCase() as MarketRegion;
  return WORLD_MARKETS[key]?.symbols ?? null;
}

export function inferCountryFromSymbol(symbol: string): string {
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO") || symbol === "^NSEI" || symbol === "^BSESN") return "India";
  if (symbol.endsWith(".L") || symbol === "^FTSE") return "UK";
  if (symbol.endsWith(".DE") || symbol.endsWith(".PA") || symbol.endsWith(".AS") || symbol === "^GDAXI" || symbol === "^FCHI") return "Europe";
  if (symbol.endsWith(".T") || symbol === "^N225") return "Japan";
  if (symbol.endsWith(".HK") || symbol === "^HSI") return "Hong Kong";
  if (symbol.endsWith(".AX") || symbol === "^AXJO") return "Australia";
  if (symbol.startsWith("^") || symbol.endsWith("-USD")) return "Global";
  return "USA";
}
