"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import type { FeedItem, ResearchPaper } from "@/types";
import { RedditFeedRow } from "@/components/feed/RedditFeedRow";
import { NewsPostCard } from "@/components/feed/NewsPostCard";
import { ResearchRedditLayout } from "@/components/layout/ResearchRedditLayout";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { PageShell } from "@/components/layout/PageShell";
import { PageState } from "@/components/ui/PageState";
import { LOADING_PAPERS } from "@/lib/loadingMessages";
import { useFetchData } from "@/lib/hooks/useFetchData";

type Tab = "all" | "papers" | "articles";

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

function dedupePapers(list: ResearchPaper[]): ResearchPaper[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    const key = p.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ResearchPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const { data, loading, error, refetch } = useFetchData(
    () => api.researchAll(),
    []
  );

  const papers = data?.papers ?? [];
  const uniPapers = data?.universityPapers ?? [];
  const news = data?.news ?? [];

  const allPapers = useMemo(
    () => dedupePapers([...papers, ...uniPapers]),
    [papers, uniPapers]
  );

  const q = query.trim();

  const filteredPapers = allPapers.filter(
    (p) =>
      !q ||
      matchesQuery(p.title, q) ||
      matchesQuery(p.abstract, q) ||
      matchesQuery(p.university, q)
  );

  const filteredNews = news.filter(
    (f) =>
      !q ||
      matchesQuery(f.title, q) ||
      matchesQuery(f.contentSnippet, q)
  );

  const unified = useMemo(() => {
    const items: { kind: "paper" | "feed"; date: string; paper?: ResearchPaper; feed?: FeedItem; id: string }[] = [
      ...filteredPapers.map((p) => ({
        kind: "paper" as const,
        id: p.id,
        date: p.publishedAt,
        paper: p,
      })),
      ...filteredNews.map((f) => ({
        kind: "feed" as const,
        id: f.id,
        date: f.pubDate,
        feed: f,
      })),
    ];
    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredPapers, filteredNews]);

  const counts = {
    all: unified.length,
    papers: filteredPapers.length,
    articles: filteredNews.length,
  };

  return (
    <PageShell
      wide
      badge="Research feed"
      title="Papers & articles"
      subtitle="Academic papers with full detail pages. Articles open in the news timeline."
      actions={<RefreshButton onRefresh={refetch} loading={loading} />}
    >
      <ResearchRedditLayout>
        <p className="reddit-quick-links" style={{ marginBottom: 20 }}>
          <Link href="/news">Technology & lab news →</Link>
        </p>

        <div className="discover-search">
          <Search size={18} className="discover-search-icon" aria-hidden />
          <input
            type="search"
            className="discover-search-input"
            placeholder="Search papers, authors, topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search research feed"
          />
        </div>

        <div className="tabs tabs-square discover-tabs">
          {(
            [
              { id: "all" as Tab, label: "Hot — Everything" },
              { id: "papers" as Tab, label: "Papers" },
              { id: "articles" as Tab, label: "Articles & tech news" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className="tab-count">{loading ? "…" : counts[t.id]}</span>
            </button>
          ))}
        </div>

        <p className="reddit-quick-links">
          <Link href="/topics">All topics</Link>
          <span>·</span>
          <Link href="/authors">All researchers</Link>
          <span>·</span>
          <Link href="/categories">Categories</Link>
          <span>·</span>
          <Link href="/news">X-style news</Link>
        </p>

        <PageState
          loading={loading}
          error={error}
          onRetry={refetch}
          loadingLabel="Loading research feed"
          loadingMessages={LOADING_PAPERS}
          skeleton="feed"
        >
          <div className={tab === "articles" ? "x-timeline" : "reddit-feed"}>
            {tab === "all" &&
              (unified.length === 0 ? (
                <p className="empty-state">No results. Try a different search.</p>
              ) : (
                unified.slice(0, 80).map((item) =>
                  item.kind === "paper" && item.paper ? (
                    <div key={item.id} className="reddit-feed-item-wrap">
                      <RedditFeedRow paper={item.paper} />
                    </div>
                  ) : item.feed ? (
                    <NewsPostCard key={item.id} item={item.feed} />
                  ) : null
                )
              ))}

            {tab === "papers" &&
              (filteredPapers.length === 0 ? (
                <p className="empty-state">No papers match your search.</p>
              ) : (
                filteredPapers.slice(0, 60).map((p) => (
                  <RedditFeedRow key={p.id} paper={p} />
                ))
              ))}

            {tab === "articles" &&
              (filteredNews.length === 0 ? (
                <p className="empty-state">No articles match your search.</p>
              ) : (
                filteredNews.slice(0, 50).map((item) => (
                  <NewsPostCard key={item.id} item={item} />
                ))
              ))}
          </div>
        </PageState>
      </ResearchRedditLayout>
    </PageShell>
  );
}
