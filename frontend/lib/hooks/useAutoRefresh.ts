"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAutoRefreshOptions {
  intervalMs?: number;
  onRefresh: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoRefresh({
  intervalMs = 60000,
  onRefresh,
  enabled = true,
}: UseAutoRefreshOptions) {
  const [countdown, setCountdown] = useState(intervalMs / 1000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefreshRef.current();
      setLastRefreshed(new Date());
    } finally {
      setIsRefreshing(false);
      setCountdown(intervalMs / 1000);
    }
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled) return;

    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          triggerRefresh();
          return intervalMs / 1000;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [enabled, intervalMs, triggerRefresh]);

  const progress = ((intervalMs / 1000 - countdown) / (intervalMs / 1000)) * 100;

  return {
    countdown,
    isRefreshing,
    lastRefreshed,
    triggerRefresh,
    progress,
    intervalMs,
  };
}
