"use client";

import { motion } from "framer-motion";
import type { FeedItem } from "@/types";
import { formatFeedTime, isNewItem } from "@/lib/utils";

const SOURCE_COLORS: Record<string, string> = {
  arxiv: "var(--color-accent-open)",
  "mit-rss": "var(--color-accent-mit)",
  "harvard-rss": "var(--color-accent-hv)",
  "stanford-rss": "var(--color-accent-su)",
  "deepmind-rss": "var(--color-accent-open)",
  pubmed: "var(--color-accent-tag)",
  "oxford-rss": "var(--color-accent-ox)",
  "cambridge-rss": "var(--color-accent-ox)",
};

export function LiveFeedItem({ item }: { item: FeedItem }) {
  const isNew = isNewItem(item.pubDate);
  const color = SOURCE_COLORS[item.source] ?? "var(--color-text-2)";
  const { relative, absolute } = formatFeedTime(item.pubDate);

  return (
    <motion.article
      className="live-feed-item"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className="live-feed-item-header">
        <span className="live-feed-source" style={{ borderColor: color, color }}>
          {item.logoKey}
        </span>
        {isNew && <span className="live-feed-new animate-pulse-new">NEW</span>}
        <time className="live-feed-time" dateTime={item.pubDate} title={absolute}>
          {relative}
        </time>
        <span className="live-feed-time-abs">{absolute}</span>
      </div>
      <h3 className="live-feed-title">{item.title}</h3>
      {item.contentSnippet && (
        <p className="live-feed-tldr">{item.contentSnippet.slice(0, 140)}…</p>
      )}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="live-feed-link"
      >
        Read more →
      </a>
    </motion.article>
  );
}
