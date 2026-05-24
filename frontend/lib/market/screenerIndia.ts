/**
 * Screener.in client wrapper (screener-india npm) — server-side only.
 */

import type { IndiaFundamentals } from "@/types/india-market";

interface TopRatio {
  name: string;
  value: string;
}

export interface ScreenerCompanySummary {
  symbol: string;
  name: string;
  marketCap?: string;
  currentPrice?: string;
  pe?: string;
  roe?: string;
  dividendYield?: string;
}

export interface ScreenerCompanyData {
  name: string;
  symbol: string;
  mode: string;
  topRatios: TopRatio[];
  quarters?: { headers: string[]; rows: Record<string, string>[] };
  profitLoss?: { headers: string[]; rows: Record<string, string>[] };
  balanceSheet?: { headers: string[]; rows: Record<string, string>[] };
  cashFlow?: { headers: string[]; rows: Record<string, string>[] };
  ratios?: { headers: string[]; rows: Record<string, string>[] };
  shareholding?: { headers: string[]; rows: Record<string, string>[] };
  documents?: Array<{ title: string; url: string }>;
  analysis?: {
    pros: string[];
    cons: string[];
    description: string;
  };
  peers?: Record<string, string>[];
}

type ScreenerClient = {
  compareCompanies: (
    symbols: string[],
    mode: string
  ) => Promise<{ data: ScreenerCompanySummary[] }>;
  getCompany: (symbol: string, mode: string) => Promise<{ data: ScreenerCompanyData }>;
};

let clientPromise: Promise<ScreenerClient> | null = null;

async function loadClient(): Promise<ScreenerClient> {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const cookies = process.env.SCREENER_IN_SESSION?.trim();
    const mod = await import("screener-india");
    const ScreenerClient = mod.ScreenerClient as new (cfg: object) => ScreenerClient;
    return new ScreenerClient({
      cacheTtlMs: 300_000,
      minIntervalMs: 350,
      maxRetries: 2,
      timeoutMs: 25_000,
      ...(cookies ? { cookies } : {}),
    });
  })();
  return clientPromise;
}

export async function getScreenerClient() {
  return loadClient();
}

/** RELIANCE.NS → RELIANCE */
export function toScreenerSymbol(portfolioSymbol: string): string {
  return portfolioSymbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
}

export function screenerCompanyUrl(symbol: string): string {
  return `https://www.screener.in/company/${encodeURIComponent(toScreenerSymbol(symbol))}/`;
}

export function cleanScreenerText(value?: string): string | undefined {
  if (value == null) return undefined;
  const t = value.replace(/\s+/g, " ").trim();
  return t || undefined;
}

function ratioMap(topRatios: TopRatio[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of topRatios) {
    const key = r.name.toLowerCase();
    map[key] = cleanScreenerText(r.value) ?? "";
  }
  return map;
}

export function summaryToFundamentals(row: ScreenerCompanySummary): IndiaFundamentals {
  return {
    screenerSymbol: row.symbol,
    pe: cleanScreenerText(row.pe),
    roe: cleanScreenerText(row.roe),
    dividendYield: cleanScreenerText(row.dividendYield),
    currentPriceInr: cleanScreenerText(row.currentPrice),
    marketCapInr: cleanScreenerText(row.marketCap),
  };
}

export function companyToFundamentals(data: ScreenerCompanyData): IndiaFundamentals {
  const m = ratioMap(data.topRatios);
  return {
    screenerSymbol: data.symbol,
    pe: m["stock p/e"] ?? m["p/e"],
    roe: m["roe"],
    roce: m["roce"],
    dividendYield: m["dividend yield"],
    bookValue: m["book value"],
    currentPriceInr: m["current price"],
    marketCapInr: m["market cap"],
  };
}

function cleanCompanyName(name: string): string {
  return name.replace(/\s+share price$/i, "").trim();
}

export async function fetchIndiaCompare(symbols: string[]): Promise<ScreenerCompanySummary[]> {
  const unique = Array.from(new Set(symbols.map(toScreenerSymbol).filter(Boolean)));
  if (unique.length === 0) return [];

  const api = await getScreenerClient();
  const batchSize = 10;
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += batchSize) {
    batches.push(unique.slice(i, i + batchSize));
  }

  const fetchBatch = async (batch: string[]): Promise<ScreenerCompanySummary[]> => {
    try {
      const { data } = await api.compareCompanies(batch, "consolidated");
      return data.map((row) => ({
        ...row,
        name: cleanCompanyName(row.name),
      }));
    } catch {
      const fallback: ScreenerCompanySummary[] = [];
      await Promise.all(
        batch.map(async (sym) => {
          try {
            const { data } = await api.getCompany(sym, "consolidated");
            const f = companyToFundamentals(data);
            fallback.push({
              symbol: data.symbol,
              name: data.name,
              marketCap: f.marketCapInr,
              currentPrice: f.currentPriceInr,
              pe: f.pe,
              roe: f.roe,
              dividendYield: f.dividendYield,
            });
          } catch {
            /* skip symbol */
          }
        })
      );
      return fallback;
    }
  };

  const chunkResults = await Promise.all(batches.map((batch) => fetchBatch(batch)));
  return chunkResults.flat();
}

export async function fetchIndiaCompany(symbol: string): Promise<ScreenerCompanyData> {
  const api = await getScreenerClient();
  const { data } = await api.getCompany(toScreenerSymbol(symbol), "consolidated");
  return { ...data, name: cleanCompanyName(data.name) };
}

export function slimFinancialTable(table?: { headers: string[]; rows: Record<string, string>[] }) {
  if (!table) return undefined;
  return {
    headers: table.headers,
    rows: table.rows.slice(-8),
  };
}
