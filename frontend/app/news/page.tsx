"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { FeedItem, NewsCategory } from "@/types";
import { NewsPostCard } from "@/components/feed/NewsPostCard";
import { PageShell } from "@/components/layout/PageShell";
import { PageState } from "@/components/ui/PageState";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { LOADING_NEWS } from "@/lib/loadingMessages";
import { NEWS_CATEGORY_LABELS, sourceColor } from "@/lib/news";
import { timeAgo } from "@/lib/utils";
import { useFetchData } from "@/lib/hooks/useFetchData";

type Tab = "all" | NewsCategory;

function matchesQuery(item: FeedItem, q: string): boolean {
  const hay = `${item.title} ${item.contentSnippet} ${item.handle}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function SpotlightCard({ item }: { item: FeedItem }) {
  const color = sourceColor(item.logoKey);
  return (
    <Link
      href={`/article/${encodeURIComponent(item.id)}`}
      className="news-spotlight-card"
    >
      <div className="news-spotlight-card-top">
        <span style={{ color }}>{item.handle}</span>
        <time dateTime={item.pubDate}>{timeAgo(item.pubDate)}</time>
      </div>
      <h3>{item.title}</h3>
      {item.contentSnippet && <p>{item.contentSnippet}</p>}
    </Link>
  );
}

function NewsColumn({
  title,
  items,
  limit = 8,
}: {
  title: string;
  items: FeedItem[];
  limit?: number;
}) {
  const slice = items.slice(0, limit);
  if (slice.length === 0) return null;

  return (
    <section>
      <h2 className="news-hub-column-title">
        {title}
        <span className="news-hub-column-count">{items.length}</span>
      </h2>
      <div className="x-timeline">
        {slice.map((item) => (
          <NewsPostCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function NewsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const { data, loading, error, refetch } = useFetchData(() => api.newsHub(), []);

  const q = query.trim();

  const filteredAll = useMemo(() => {
    const list = data?.all ?? [];
    return q ? list.filter((i) => matchesQuery(i, q)) : list;
  }, [data?.all, q]);

  const tabItems = useMemo(() => {
    if (!data) return [];
    if (tab === "all") return filteredAll;
    const key = tab as keyof typeof data;
    const list = (data[key] as FeedItem[] | undefined) ?? [];
    return q ? list.filter((i) => matchesQuery(i, q)) : list;
  }, [data, tab, filteredAll, q]);

  const counts = {
    all: data?.all.length ?? 0,
    technology: data?.technology.length ?? 0,
    labs: data?.labs.length ?? 0,
    university: data?.university.length ?? 0,
    research: data?.research.length ?? 0,
    reference: data?.reference.length ?? 0,
  };

  return (
    <PageShell
      wide
      badge="News intelligence"
      title="Research & technology news"
      subtitle="Latest technology, AI lab blogs (Anthropic, OpenAI), university updates, arXiv, and Wikipedia — one curated timeline."
      actions={<RefreshButton onRefresh={refetch} loading={loading} />}
    >
      {data?.fetchNote && !loading && (
        <p className="news-hub-sources">
          <Zap size={14} aria-hidden style={{ marginRight: 6, verticalAlign: -2 }} />
          {data.fetchNote}
        </p>
      )}

      <div className="discover-search" style={{ marginBottom: 24 }}>
        <Search size={18} className="discover-search-icon" aria-hidden />
        <input
          type="search"
          className="discover-search-input"
          placeholder="Search all news, tech, labs, universities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search news"
        />
      </div>

      <div className="tabs tabs-square x-news-tabs" role="tablist">
        {(
          [
            { id: "all" as Tab, label: "All news" },
            { id: "technology" as Tab, label: "Technology" },
            { id: "labs" as Tab, label: "AI labs" },
            { id: "university" as Tab, label: "Universities" },
            { id: "research" as Tab, label: "Research" },
            { id: "reference" as Tab, label: "Wikipedia" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="tab-count">{loading ? "…" : counts[t.id]}</span>
          </button>
        ))}
      </div>

      <PageState
        loading={loading}
        error={error}
        onRetry={refetch}
        loadingLabel="Loading news hub"
        loadingMessages={LOADING_NEWS}
        skeleton="news"
        isEmpty={!loading && !error && tabItems.length === 0}
        empty={
          <p>
            No stories match your filters. Try <button type="button" className="btn btn-secondary btn-sm" onClick={() => refetch()}>refresh</button> or another tab.
          </p>
        }
      >
        {data && tab === "all" && !q && data.spotlight.length > 0 && (
          <section className="news-hub" style={{ marginBottom: 40 }}>
            <h2 className="news-hub-column-title">
              Latest technology
              <span className="news-hub-column-count">Top picks</span>
            </h2>
            <div className="news-spotlight">
              {data.spotlight.map((item) => (
                <SpotlightCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {data && tab === "all" && !q ? (
          <div className="news-hub news-hub-grid">
            <NewsColumn title="Technology" items={data.technology} />
            <NewsColumn title="AI labs & blogs" items={data.labs} />
            <NewsColumn title="Universities" items={data.university} />
            <NewsColumn title="Research feeds" items={data.research} />
            <div className="news-hub-full-width">
              <NewsColumn title="Wikipedia reference" items={data.reference} limit={6} />
            </div>
            <section className="news-hub-full-width">
              <h2 className="news-hub-column-title">
                Full timeline
                <span className="news-hub-column-count">{filteredAll.length}</span>
              </h2>
              <div className="x-timeline">
                {filteredAll.slice(0, 40).map((item) => (
                  <NewsPostCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <section style={{ marginTop: 28 }}>
            <h2 className="news-hub-column-title">
              {tab === "all" ? "Results" : NEWS_CATEGORY_LABELS[tab]}
              <span className="news-hub-column-count">{tabItems.length}</span>
            </h2>
            <div className="x-timeline">
              {tabItems.map((item) => (
                <NewsPostCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </PageState>
    </PageShell>
  );
}
