"use client";

import { useMemo } from "react";

export interface FinnhubWsState {
  connected: boolean;
  error: string | null;
}

/**
 * Finnhub WebSocket is disabled — API keys stay server-side.
 * Use `useLivePriceFeed` or `fetchLivePrices` for HTTP polling instead.
 */
export function useFinnhubWebSocket(
  _portfolioSymbols: string[],
  _onPrices: (prices: Record<string, number>) => void,
  _enabled = true
): FinnhubWsState {
  return useMemo(() => ({ connected: false, error: null }), []);
}
