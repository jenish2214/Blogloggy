"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { FeedItem } from "@/types";
import { formatApiError } from "@/lib/apiErrors";
import { formatFeedTime, truncate } from "@/lib/utils";
import { ApiErrorState } from "@/components/ui/ApiErrorState";

export function LiveFeedSection() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setReady(false);
    setError(null);
    try {
      const d = await api.liveFeed();
      setItems(d.items.slice(0, 12));
    } catch (e) {
      setItems([]);
      setError(formatApiError(e));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!ready) {
    return (
      <section className="marquee-wrap marquee-wrap-loading" aria-hidden>
        <div className="marquee-skeleton" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="marquee-wrap marquee-wrap-api-error" aria-label="Live feed unavailable">
        <ApiErrorState message={error} onRetry={load} variant="compact" />
      </section>
    );
  }

  const doubled = items.length > 0 ? [...items, ...items] : [];
  if (doubled.length === 0) {
    return null;
  }

  return (
    <motion.section
      className="marquee-wrap"
      aria-label="Live research ticker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="marquee-track animate-marquee">
        {doubled.map((item, i) => (
          <div key={`${item.id}-${i}`} className="marquee-item">
            <span className="pill-dot animate-pulse-dot" style={{ background: "var(--color-accent-tag)" }} />
            <strong>{item.logoKey}</strong>
            <span>{truncate(item.title, 60)}</span>
            <time className="marquee-item-time" dateTime={item.pubDate}>
              {formatFeedTime(item.pubDate).relative}
            </time>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
