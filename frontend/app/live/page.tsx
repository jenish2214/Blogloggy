"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FeedItem } from "@/types";
import { NewsPostCard } from "@/components/feed/NewsPostCard";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { useFeedStore } from "@/lib/store/feedStore";

const SOURCE_LABELS: Record<string, string> = {
  arxiv: "arXiv",
  "hn-rss": "Hacker News",
  "techcrunch-rss": "TechCrunch",
  "verge-rss": "The Verge",
  "arstechnica-rss": "Ars Technica",
  "mit-tr-rss": "MIT Tech Review",
  "mit-rss": "MIT News",
  "harvard-rss": "Harvard Gazette",
  "stanford-rss": "Stanford News",
  "deepmind-rss": "DeepMind Blog",
  pubmed: "PubMed",
  "oxford-rss": "Oxford",
  "cambridge-rss": "Cambridge",
};

export default function LiveFeedPage() {
  const { items, enabledSources, setItems, toggleSource } = useFeedStore();
  const [initialLoading, setInitialLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const data = await api.liveFeed(
        enabledSources.length > 0 ? enabledSources : undefined
      );
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setInitialLoading(false);
    }
  }, [enabledSources, setItems]);

  const { countdown, isRefreshing, triggerRefresh, progress } = useAutoRefresh({
    intervalMs: 60000,
    onRefresh: loadFeed,
  });

  useEffect(() => {
    setInitialLoading(true);
    loadFeed();
  }, [loadFeed]);

  const urgent = countdown <= 10;
  const showLoader = initialLoading || (isRefreshing && items.length === 0);

  return (
    <div className="page-main">
      <div className="container">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <LiveBadge />
            <h1 className="section-title" style={{ marginTop: 8 }}>
              Live Research Feed
            </h1>
          </div>
          <RefreshButton onRefresh={triggerRefresh} loading={isRefreshing} />
        </header>

        <div className="live-page">
          <aside className="live-sidebar">
            <div className={`live-countdown ${urgent ? "urgent" : ""}`}>
              <p>
                Next refresh in: <strong>{countdown}s</strong>
              </p>
              <div className="live-progress">
                <div
                  className="live-progress-bar"
                  style={{ width: `${100 - progress}%` }}
                />
              </div>
            </div>
            <h3
              style={{
                fontSize: "0.9rem",
                marginBottom: 12,
                color: "var(--color-text-2)",
              }}
            >
              Sources
            </h3>
            {Object.entries(SOURCE_LABELS).map(([source, label]) => (
              <label key={source} className="live-source-toggle">
                <input
                  type="checkbox"
                  checked={enabledSources.includes(source)}
                  onChange={() => toggleSource(source)}
                />
                {label}
              </label>
            ))}
          </aside>

          <div className="live-feed-list">
            {showLoader ? (
              <div className="async-load-section">
                <LoadingSpinner label="Loading live feed…" />
                <LoadingGrid count={5} />
              </div>
            ) : (
              <>
                <div className="x-timeline">
                  <AnimatePresence initial={false}>
                    {items.map((item: FeedItem) => (
                      <NewsPostCard key={item.id} item={item} />
                    ))}
                  </AnimatePresence>
                </div>
                {items.length === 0 && (
                  <p className="empty-state">No feed items yet.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
