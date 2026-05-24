/** Finnhub API response types (Quant Lab). */

export interface FinnhubQuote {
  c: number | null;
  h: number | null;
  l: number | null;
  o: number | null;
  pc: number | null;
  d: number | null;
  dp: number | null;
  t?: number;
}

export interface CompanyProfile {
  name: string;
  exchange: string;
  industry: string;
  logo: string;
  marketCapitalization: number;
  shareOutstanding: number;
  ticker?: string;
  weburl?: string;
  country?: string;
}

export interface BasicFinancials {
  metric: {
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    peBasicExclExtraTTM?: number;
    revenuePerShareTTM?: number;
    [key: string]: number | undefined;
  };
  symbol?: string;
  metricType?: string;
}

export interface NewsSentimentBuzz {
  weeklyAverage?: number;
  articlesInLastWeek?: number;
}

export interface NewsSentiment {
  sentiment?: {
    bearishPercent?: number;
    bullishPercent?: number;
  };
  buzz?: NewsSentimentBuzz;
  symbol?: string;
}

export interface EarningsRow {
  actual: number | null;
  estimate: number | null;
  period: string;
  surprisePercent: number | null;
  symbol?: string;
  year?: number;
  quarter?: number;
}

export interface CandleData {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  t: number[];
  v: number[];
  s: string;
}

export type FinnhubProxyEndpoint =
  | "quote"
  | "profile"
  | "metric"
  | "news-sentiment"
  | "earnings"
  | "candle";
