"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabaseSession } from "@/lib/auth/useSupabaseSession";
import { wealthApi, type WealthBookSummary } from "@/lib/api";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export interface FirmSummary {
  firmAum: number;
  clientCount: number;
  personalAum: number;
  clientAum: number;
  totalCash: number;
  totalUnrealized: number;
  openPositions: number;
  lastUpdated: string;
}

const POLL_MS = 5000;

export function useWealthLiveFeed(enabled = true) {
  const { isAuthenticated, ready: sessionReady } = useSupabaseSession();
  const [books, setBooks] = useState<WealthBookSummary[]>([]);
  const [summary, setSummary] = useState<FirmSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!hasSupabaseEnv() || !isAuthenticated) {
      if (mounted.current) {
        setBooks([]);
        setSummary(null);
        setLoading(false);
      }
      return;
    }
    try {
      const data = await wealthApi.getBooks();
      if (!mounted.current) return;
      setBooks(data.books);
      setSummary(data.summary);
      setError(null);
      setTick((t) => t + 1);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "Failed to load books");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled || !sessionReady) return;
    void refresh();
    if (!isAuthenticated) {
      return () => {
        mounted.current = false;
      };
    }
    const id = setInterval(refresh, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [enabled, sessionReady, isAuthenticated, refresh]);

  return { books, summary, loading, error, tick, refresh };
}
