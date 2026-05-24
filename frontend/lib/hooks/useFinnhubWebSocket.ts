"use client";

import { useEffect, useMemo, useState } from "react";
import { finnhubWsManager } from "@/lib/market/finnhubWsManager";
import { getFinnhubPublicToken } from "@/lib/market/finnhubSymbols";

export interface FinnhubWsState {
  connected: boolean;
  error: string | null;
}

/**
 * Real-time trades from Finnhub WebSocket (shared singleton connection).
 * @see https://finnhub.io/docs/api/websocket
 */
export function useFinnhubWebSocket(
  portfolioSymbols: string[],
  onPrices: (prices: Record<string, number>) => void,
  enabled = true
): FinnhubWsState {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const symbolKey = useMemo(
    () => portfolioSymbols.filter(Boolean).sort().join(","),
    [portfolioSymbols]
  );

  useEffect(() => {
    const token = getFinnhubPublicToken();
    if (!enabled || !token || !symbolKey) {
      setConnected(false);
      setError(null);
      return;
    }

    const symbols = symbolKey.split(",");
    return finnhubWsManager.subscribe(
      symbols,
      onPrices,
      (isConnected, err) => {
        setConnected(isConnected);
        setError(err);
      }
    );
  }, [enabled, symbolKey, onPrices]);

  return { connected, error };
}
