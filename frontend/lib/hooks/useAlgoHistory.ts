"use client";

import { useCallback, useEffect } from "react";
import {
  fetchAlgoHistory,
  type AlgoChartInterval,
  type AlgoChartPeriod,
} from "@/lib/algo/fetchAlgoHistory";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import type { AlgoSymbol } from "@/types/algoTrading";

export function useAlgoHistory(symbol: AlgoSymbol) {
  const chartPeriod = useAlgoTradingStore((s) => s.chartPeriod);
  const chartInterval = useAlgoTradingStore((s) => s.chartInterval);
  const applyHistory = useAlgoTradingStore((s) => s.applyHistory);
  const setHistoryLoading = useAlgoTradingStore((s) => s.setHistoryLoading);
  const setHistoryError = useAlgoTradingStore((s) => s.setHistoryError);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const s = useAlgoTradingStore.getState();
      if (
        s.usesYfinanceData &&
        s.symbol === symbol &&
        s.chartPeriod === chartPeriod &&
        s.chartInterval === chartInterval &&
        s.priceHistory.length > 0
      ) {
        setHistoryLoading(false);
        return;
      }
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await fetchAlgoHistory(symbol, chartPeriod, chartInterval, force);
      applyHistory(result.candles, result.currentPrice, {
        provider: result.provider,
        yahooSymbol: result.yahooSymbol,
        period: result.period,
        interval: result.interval,
      });
    } catch (e) {
      setHistoryError((e as Error).message || "Failed to load market history");
    } finally {
      setHistoryLoading(false);
    }
  }, [
    symbol,
    chartPeriod,
    chartInterval,
    applyHistory,
    setHistoryLoading,
    setHistoryError,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const setChartRange = useAlgoTradingStore((s) => s.setChartRange);

  return {
    reload: load,
    setChartRange: (period: AlgoChartPeriod, interval: AlgoChartInterval) => {
      setChartRange(period, interval);
    },
  };
}
