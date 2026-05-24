"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { portfolioApi } from "@/lib/api";
import { fetchLivePrices } from "@/lib/market/fetchLivePrices";
import { usePortfolioStore } from "@/lib/store/portfolio";

const DEFAULT_INTERVAL_MS = 10_000;

export interface LivePriceFeedOptions {
  intervalMs?: number;
  /** Persist live marks to Supabase when authenticated. */
  persist?: boolean;
  enabled?: boolean;
}

export function useLivePriceFeed(
  symbols: string[],
  options: LivePriceFeedOptions = {}
) {
  const { intervalMs = DEFAULT_INTERVAL_MS, persist = false, enabled = true } = options;
  const updatePrices = usePortfolioStore((s) => s.updatePrices);
  const unrealizedTotal = usePortfolioStore((s) =>
    Object.values(s.positions).reduce((sum, p) => sum + p.unrealizedPnl, 0)
  );
  const totalPnl = usePortfolioStore((s) => s.totalPnl);
  const totalValue = usePortfolioStore((s) => s.totalValue);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistRef = useRef(persist);
  const inFlightRef = useRef(false);
  persistRef.current = persist;

  const symbolKey = useMemo(
    () => Array.from(new Set(symbols.filter(Boolean))).sort().join(","),
    [symbols]
  );

  const applyPrices = useCallback(
    (prices: Record<string, number>) => {
      if (Object.keys(prices).length === 0) return;
      setLivePrices((prev) => ({ ...prev, ...prices }));
      setLastUpdated(new Date());
      updatePrices(prices);

      if (persistRef.current) {
        void portfolioApi.syncPrices(prices).catch(() => {
          /* not logged in */
        });
      }
    },
    [updatePrices]
  );

  const refresh = useCallback(async () => {
    const unique = symbolKey ? symbolKey.split(",") : [];
    if (!unique.length || inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { prices, error: fetchError } = await fetchLivePrices(unique);
      if (fetchError) {
        setError(fetchError);
        return;
      }
      if (Object.keys(prices).length === 0) return;
      applyPrices(prices);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [symbolKey, applyPrices]);

  useEffect(() => {
    if (!enabled || !symbolKey) return;
    void refresh();
    const id = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, symbolKey, intervalMs, refresh]);

  return {
    livePrices,
    lastUpdated,
    loading,
    error,
    refresh,
    unrealizedTotal,
    totalPnl,
    totalValue,
    finnhubConnected: false,
    stream: "poll" as const,
  };
}
