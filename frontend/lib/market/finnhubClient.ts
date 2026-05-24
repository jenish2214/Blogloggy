/**
 * Official Finnhub JS SDK — server-side only.
 * @see https://www.npmjs.com/package/finnhub
 */

import type {
  BasicFinancials,
  CandleData,
  CompanyProfile,
  EarningsRow,
  FinnhubProxyEndpoint,
  FinnhubQuote,
  NewsSentiment,
} from "@/types/finnhub";

type FinnhubCallback<T> = (error: unknown, data: T, response?: unknown) => void;

interface FinnhubSdk {
  quote(symbol: string, callback: FinnhubCallback<FinnhubQuote>): void;
  companyProfile2(opts: { symbol: string }, callback: FinnhubCallback<CompanyProfile>): void;
  companyBasicFinancials(
    symbol: string,
    metric: string,
    callback: FinnhubCallback<BasicFinancials>
  ): void;
  newsSentiment(symbol: string, callback: FinnhubCallback<NewsSentiment>): void;
  companyEarnings(
    symbol: string,
    opts: { limit?: number },
    callback: FinnhubCallback<EarningsRow[]>
  ): void;
  stockCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    callback: FinnhubCallback<CandleData>
  ): void;
}

function promisify<T>(run: (cb: FinnhubCallback<T>) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    run((err, data) => {
      if (err) {
        const message =
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : JSON.stringify(err);
        reject(new Error(message));
        return;
      }
      resolve(data);
    });
  });
}

function loadDefaultApi(): new (key: string) => FinnhubSdk {
  const { DefaultApi } = require("finnhub") as { DefaultApi: new (key: string) => FinnhubSdk };
  return DefaultApi;
}

let client: FinnhubSdk | null = null;
let DefaultApiCtor: (new (key: string) => FinnhubSdk) | null = null;

export function getFinnhubApiKey(): string | null {
  return process.env.FINNHUB_API_KEY?.trim() || null;
}

export function isFinnhubConfigured(): boolean {
  return !!getFinnhubApiKey();
}

function getClient(): FinnhubSdk {
  if (client) return client;
  const key = getFinnhubApiKey();
  if (!key) throw new Error("finnhub_not_configured");
  if (!DefaultApiCtor) DefaultApiCtor = loadDefaultApi();
  client = new DefaultApiCtor(key);
  return client;
}

export async function finnhubQuote(symbol: string): Promise<FinnhubQuote> {
  const api = getClient();
  return promisify((cb) => api.quote(symbol.trim().toUpperCase(), cb));
}

export async function finnhubCompanyProfile(symbol: string): Promise<CompanyProfile> {
  const api = getClient();
  return promisify((cb) => api.companyProfile2({ symbol: symbol.trim().toUpperCase() }, cb));
}

export async function finnhubBasicFinancials(
  symbol: string,
  metric = "all"
): Promise<BasicFinancials> {
  const api = getClient();
  return promisify((cb) =>
    api.companyBasicFinancials(symbol.trim().toUpperCase(), metric, cb)
  );
}

export async function finnhubNewsSentiment(symbol: string): Promise<NewsSentiment> {
  const api = getClient();
  return promisify((cb) => api.newsSentiment(symbol.trim().toUpperCase(), cb));
}

export async function finnhubEarnings(symbol: string, limit = 4): Promise<EarningsRow[]> {
  const api = getClient();
  const rows = await promisify((cb) =>
    api.companyEarnings(symbol.trim().toUpperCase(), { limit }, cb)
  );
  return Array.isArray(rows) ? rows.slice(0, limit) : [];
}

export async function finnhubCandles(
  symbol: string,
  from: number,
  to: number,
  resolution = "D"
): Promise<CandleData> {
  const api = getClient();
  return promisify((cb) =>
    api.stockCandles(symbol.trim().toUpperCase(), resolution, from, to, cb)
  );
}

export interface FinnhubProxyParams {
  symbol: string;
  metric?: string;
  from?: string;
  to?: string;
  resolution?: string;
}

/** Map proxy endpoint names to SDK calls (Quant Lab API route). */
export async function finnhubProxyCall(
  endpoint: FinnhubProxyEndpoint,
  params: FinnhubProxyParams
): Promise<unknown> {
  const symbol = params.symbol.trim().toUpperCase();

  switch (endpoint) {
    case "quote":
      return finnhubQuote(symbol);
    case "profile":
      return finnhubCompanyProfile(symbol);
    case "metric":
      return finnhubBasicFinancials(symbol, params.metric ?? "all");
    case "news-sentiment":
      return finnhubNewsSentiment(symbol);
    case "earnings":
      return finnhubEarnings(symbol);
    case "candle": {
      const from = params.from ? Number(params.from) : NaN;
      const to = params.to ? Number(params.to) : NaN;
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        throw new Error("from_and_to_required");
      }
      return finnhubCandles(symbol, from, to, params.resolution ?? "D");
    }
    default:
      throw new Error("unknown_endpoint");
  }
}
