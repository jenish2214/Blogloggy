export interface ForexPair {
  symbol: string;
  label: string;
  base: string;
  quote: string;
  flag: string;
}

export const FOREX_PAIRS: ForexPair[] = [
  { symbol: "EURUSD=X", label: "EUR/USD", base: "EUR", quote: "USD", flag: "🇪🇺" },
  { symbol: "GBPUSD=X", label: "GBP/USD", base: "GBP", quote: "USD", flag: "🇬🇧" },
  { symbol: "USDJPY=X", label: "USD/JPY", base: "USD", quote: "JPY", flag: "🇺🇸" },
  { symbol: "AUDUSD=X", label: "AUD/USD", base: "AUD", quote: "USD", flag: "🇦🇺" },
  { symbol: "USDCAD=X", label: "USD/CAD", base: "USD", quote: "CAD", flag: "🇺🇸" },
  { symbol: "USDCHF=X", label: "USD/CHF", base: "USD", quote: "CHF", flag: "🇺🇸" },
  { symbol: "NZDUSD=X", label: "NZD/USD", base: "NZD", quote: "USD", flag: "🇳🇿" },
  { symbol: "EURGBP=X", label: "EUR/GBP", base: "EUR", quote: "GBP", flag: "🇪🇺" },
  { symbol: "EURJPY=X", label: "EUR/JPY", base: "EUR", quote: "JPY", flag: "🇪🇺" },
  { symbol: "GBPJPY=X", label: "GBP/JPY", base: "GBP", quote: "JPY", flag: "🇬🇧" },
];
