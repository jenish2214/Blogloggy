/** Indian market data merged from live quotes + screener-india fundamentals. */

export interface IndiaFundamentals {
  screenerSymbol: string;
  pe?: string;
  roe?: string;
  dividendYield?: string;
  bookValue?: string;
  roce?: string;
  currentPriceInr?: string;
  marketCapInr?: string;
}

export interface IndiaMarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  mktCap: number | null;
  currency: string;
  exchange: string;
  country?: string;
  type: "stock";
  updatedAt: string;
  provider: string;
  fundamentals?: IndiaFundamentals;
  error?: string;
}

export interface IndiaCompanyDetail {
  symbol: string;
  name: string;
  mode: string;
  topRatios: Array<{ name: string; value: string }>;
  analysis?: {
    pros: string[];
    cons: string[];
    description: string;
  };
  quarters?: { headers: string[]; rows: Record<string, string>[] };
  profitLoss?: { headers: string[]; rows: Record<string, string>[] };
  balanceSheet?: { headers: string[]; rows: Record<string, string>[] };
  cashFlow?: { headers: string[]; rows: Record<string, string>[] };
  ratios?: { headers: string[]; rows: Record<string, string>[] };
  shareholding?: { headers: string[]; rows: Record<string, string>[] };
  peers?: Record<string, string>[];
  documents?: Array<{ title: string; url: string }>;
  screenerUrl: string;
  fetchedAt: string;
  warnings: string[];
}
