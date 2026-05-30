import { cachedFetch } from "@/lib/clientFetchCache";
import { resolveQuoteSymbol } from "@/lib/market/quoteSymbols";
import { quantApi } from "@/lib/quantApi";
import type { AlgoSymbol, CandleData } from "@/types/algoTrading";
import { getSymbolConfig } from "@/types/algoTrading";

export type AlgoChartPeriod = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5d";
export type AlgoChartInterval = "1d" | "1h" | "15m" | "5m";

export type AlgoHistoryResult = {
  yahooSymbol: string;
  period: AlgoChartPeriod;
  interval: AlgoChartInterval;
  provider: "yfinance" | "yahoo-chart";
  candles: CandleData[];
  currentPrice: number;
};

type RawCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  timeLabel?: string;
};

function mapCandles(rows: RawCandle[]): CandleData[] {
  return rows.map((c) => ({
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? 0,
    timestamp: c.timestamp,
    timeLabel:
      c.timeLabel ??
      new Date(c.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: c.timestamp < Date.now() - 86400000 * 400 ? "numeric" : undefined,
      }),
  }));
}

function yahooRangeForPeriod(period: AlgoChartPeriod): string {
  if (period === "5d") return "5d";
  return period;
}

/** Resolve portfolio / algo symbol to Yahoo ticker (yfinance). */
export function algoYahooSymbol(symbol: AlgoSymbol): string {
  const cfg = getSymbolConfig(symbol);
  return resolveQuoteSymbol(cfg.portfolioSymbol);
}

async function fetchViaQuantEngine(
  yahooSymbol: string,
  period: AlgoChartPeriod,
  interval: AlgoChartInterval
): Promise<AlgoHistoryResult> {
  const data = await quantApi.marketHistory(yahooSymbol, period, interval);
  return {
    yahooSymbol,
    period,
    interval,
    provider: "yfinance",
    candles: mapCandles(data.candles),
    currentPrice: data.currentPrice,
  };
}

async function fetchViaYahooChart(
  yahooSymbol: string,
  period: AlgoChartPeriod,
  interval: AlgoChartInterval
): Promise<AlgoHistoryResult> {
  const range = yahooRangeForPeriod(period);
  const res = await fetch(
    `/api/market/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Chart API ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      candles?: Array<{
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number | null;
      }>;
      currentPrice?: number;
    };
  };
  const rows = json.chart?.candles ?? [];
  const candles = mapCandles(
    rows.map((c) => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 0,
      timestamp: c.time * 1000,
      timeLabel: new Date(c.time * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }))
  );
  if (!candles.length) throw new Error("No candles");
  return {
    yahooSymbol,
    period,
    interval,
    provider: "yahoo-chart",
    candles,
    currentPrice: json.chart?.currentPrice ?? candles[candles.length - 1]!.close,
  };
}

const ALGO_HISTORY_TTL_MS = 5 * 60_000;

/** Load OHLCV for Algo Desk — prefers Python yfinance, falls back to Yahoo chart API. */
export async function fetchAlgoHistory(
  symbol: AlgoSymbol,
  period: AlgoChartPeriod = "1y",
  interval: AlgoChartInterval = "1d",
  force = false
): Promise<AlgoHistoryResult> {
  const yahooSymbol = algoYahooSymbol(symbol);
  const cacheKey = `algo:history:${yahooSymbol}:${period}:${interval}`;

  return cachedFetch(
    cacheKey,
    ALGO_HISTORY_TTL_MS,
    async () => {
      try {
        return await fetchViaQuantEngine(yahooSymbol, period, interval);
      } catch {
        return fetchViaYahooChart(yahooSymbol, period, interval);
      }
    },
    { force }
  );
}
