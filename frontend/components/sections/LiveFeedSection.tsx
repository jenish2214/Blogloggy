"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { FeedItem } from "@/types";
import { truncate, timeAgo } from "@/lib/utils";

export function LiveFeedSection() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .liveFeed()
      .then((d) => setItems(d.items.slice(0, 12)))
      .catch(() => setItems([]))
      .finally(() => setReady(true));
  }, []);

  const doubled = items.length > 0 ? [...items, ...items] : [];

  if (!ready) {
    return (
      <section className="marquee-wrap marquee-wrap-loading" aria-hidden>
        <div className="marquee-skeleton" />
      </section>
    );
  }

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
            <span>{timeAgo(item.pubDate)}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
