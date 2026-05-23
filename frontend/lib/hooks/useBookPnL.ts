"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveBookStore } from "@/lib/store/activeBook";
import {
  loadPortfolioSnapshot,
  INITIAL_CASH,
  type PortfolioSnapshot,
} from "@/lib/trading/portfolioSnapshot";
import { subscribeOrderPlaced } from "@/lib/trading/orderEvents";
import type { BookPnLMetrics } from "@/components/portfolio/LiveBookPnLStrip";

const POLL_MS = 10_000;

export function useBookPnL(enabled = true) {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await loadPortfolioSnapshot();
      setSnapshot(data);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    const unsub = subscribeOrderPlaced(() => void refresh());
    return unsub;
  }, [refresh, activeBook?.portfolioId]);

  useEffect(() => {
    if (!enabled || !snapshot?.positions.length) return;
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [enabled, snapshot?.positions.length, refresh]);

  const metrics: BookPnLMetrics | null = snapshot
    ? {
        totalValue: snapshot.totalValue,
        totalPnl: snapshot.totalPnl,
        totalPnlPct: snapshot.totalPnlPct,
        unrealizedPnl: snapshot.unrealizedPnl,
        realizedPnl: snapshot.pnl.realizedPnl,
        cash: snapshot.cash,
        costBasis: snapshot.positions.reduce((s, p) => s + p.costBasis, 0),
        investedValue: snapshot.investedValue,
        startingCapital: snapshot.startingCapital ?? INITIAL_CASH,
      }
    : null;

  return {
    snapshot,
    metrics,
    orders: snapshot?.orders ?? [],
    pnl: snapshot?.pnl ?? null,
    loading,
    refresh,
    hasPositions: (snapshot?.positions.length ?? 0) > 0,
  };
}
