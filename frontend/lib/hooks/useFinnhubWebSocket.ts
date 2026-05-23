"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildFinnhubSymbolMap,
  getFinnhubPublicToken,
  toFinnhubSymbol,
} from "@/lib/market/finnhubSymbols";

export interface FinnhubWsState {
  connected: boolean;
  error: string | null;
}

/**
 * Real-time trades from Finnhub WebSocket.
 * @see https://finnhub.io/docs/api/websocket
 */
export function useFinnhubWebSocket(
  portfolioSymbols: string[],
  onPrices: (prices: Record<string, number>) => void,
  enabled = true
): FinnhubWsState {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());
  const onPricesRef = useRef(onPrices);
  onPricesRef.current = onPrices;

  const symbolKey = useMemo(
    () => portfolioSymbols.filter(Boolean).sort().join(","),
    [portfolioSymbols]
  );

  const { finnhubToPortfolio } = useMemo(
    () => buildFinnhubSymbolMap(portfolioSymbols),
    [symbolKey, portfolioSymbols]
  );

  const applyPrices = useCallback((prices: Record<string, number>) => {
    onPricesRef.current(prices);
  }, []);

  useEffect(() => {
    const token = getFinnhubPublicToken();
    if (!enabled || !token || !symbolKey) {
      setConnected(false);
      return;
    }

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
    wsRef.current = ws;
    subscribedRef.current = new Set();

    const subscribeAll = () => {
      for (const ps of symbolKey.split(",")) {
        const fh = toFinnhubSymbol(ps);
        if (!fh || subscribedRef.current.has(fh)) continue;
        ws.send(JSON.stringify({ type: "subscribe", symbol: fh }));
        subscribedRef.current.add(fh);
      }
    };

    ws.addEventListener("open", () => {
      setConnected(true);
      setError(null);
      subscribeAll();
    });

    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type?: string;
          data?: Array<{ s?: string; p?: number }>;
        };

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (msg.type !== "trade" || !Array.isArray(msg.data)) return;

        const prices: Record<string, number> = {};
        for (const tick of msg.data) {
          const fh = tick.s;
          const price = tick.p;
          if (!fh || !price || price <= 0) continue;
          const portfolio = finnhubToPortfolio[fh];
          if (portfolio) prices[portfolio] = price;
        }

        if (Object.keys(prices).length > 0) applyPrices(prices);
      } catch {
        /* ignore malformed */
      }
    });

    ws.addEventListener("error", () => {
      setConnected(false);
      setError("Finnhub WebSocket error");
    });

    ws.addEventListener("close", () => {
      setConnected(false);
      subscribedRef.current.clear();
    });

    return () => {
      for (const fh of Array.from(subscribedRef.current)) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "unsubscribe", symbol: fh }));
          }
        } catch {
          /* closing */
        }
      }
      ws.close();
      wsRef.current = null;
      subscribedRef.current.clear();
    };
  }, [enabled, symbolKey, finnhubToPortfolio, applyPrices]);

  return { connected, error };
}
