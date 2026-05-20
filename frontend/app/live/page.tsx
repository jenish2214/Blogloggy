"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FeedItem } from "@/types";
import { LivePostCard } from "@/components/feed/LivePostCard";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatApiError } from "@/lib/apiErrors";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { useFeedStore } from "@/lib/store/feedStore";
import { timeAgo } from "@/lib/utils";

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
  const [apiError, setApiError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setApiError(null);
    try {
      const data = await api.liveFeed(
        enabledSources.length > 0 ? enabledSources : undefined
      );
      setItems(data.items);
      setRefreshedAt(data.refreshedAt ?? new Date().toISOString());
    } catch (e) {
      setItems([]);
      setApiError(formatApiError(e));
    } finally {
      setInitialLoading(false);
    }
  }, [enabledSources, setItems]);

  const { isRefreshing, triggerRefresh, lastRefreshed } = useAutoRefresh({
    intervalMs: 60000,
    onRefresh: loadFeed,
  });

  const lastUpdateLabel = refreshedAt
    ? timeAgo(refreshedAt)
    : lastRefreshed
      ? timeAgo(lastRefreshed.toISOString())
      : null;

  useEffect(() => {
    setInitialLoading(true);
    loadFeed();
  }, [loadFeed]);

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
            {lastUpdateLabel && !initialLoading && !apiError && (
              <p className="live-page-updated">
                Feed updated {lastUpdateLabel}
                {refreshedAt && (
                  <span className="live-page-updated-abs">
                    {" "}
                    · {new Date(refreshedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </p>
            )}
          </div>
          <RefreshButton onRefresh={triggerRefresh} loading={isRefreshing} />
        </header>

        <div className="live-page">
          <aside className="live-sidebar">
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
                <LoadingSpinner label="Loading live feed from API…" />
                <LoadingGrid count={5} />
              </div>
            ) : apiError ? (
              <ApiErrorState message={apiError} onRetry={triggerRefresh} variant="section" />
            ) : (
              <>
                <div className="x-timeline">
                  <AnimatePresence initial={false}>
                    {items.map((item: FeedItem) => (
                      <LivePostCard key={item.id} item={item} />
                    ))}
                  </AnimatePresence>
                </div>
                {items.length === 0 && (
                  <p className="empty-state">No feed items returned from the API.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
