"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import type { FeedItem, ResearchPaper } from "@/types";
import { ResearchCard } from "@/components/cards/ResearchCard";
import { LiveFeedItem } from "@/components/cards/LiveFeedItem";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StaggerList, StaggerItem } from "@/components/animations/StaggerList";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { useFetchData } from "@/lib/hooks/useFetchData";

type Tab = "all" | "papers" | "universities" | "blogs";

type UnifiedItem =
  | { kind: "paper"; id: string; date: string; paper: ResearchPaper }
  | { kind: "feed"; id: string; date: string; feed: FeedItem };

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

export function ResearchHubSection({ fullPage = false }: { fullPage?: boolean }) {
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

  const unified = useMemo(() => {
    const items: UnifiedItem[] = [
      ...allPapers.map((p) => ({
        kind: "paper" as const,
        id: p.id,
        date: p.publishedAt,
        paper: p,
      })),
      ...news.map((f) => ({
        kind: "feed" as const,
        id: f.id,
        date: f.pubDate,
        feed: f,
      })),
    ];
    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allPapers, news]);

  const q = query.trim();

  const filteredPapers = allPapers.filter(
    (p) =>
      !q ||
      matchesQuery(p.title, q) ||
      matchesQuery(p.abstract, q) ||
      matchesQuery(p.university, q)
  );

  const filteredUni = uniPapers.filter(
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
      matchesQuery(f.contentSnippet, q) ||
      matchesQuery(f.logoKey, q)
  );

  const filteredUnified = unified.filter((item) => {
    if (!q) return true;
    if (item.kind === "paper") {
      return (
        matchesQuery(item.paper.title, q) ||
        matchesQuery(item.paper.abstract, q)
      );
    }
    return (
      matchesQuery(item.feed.title, q) ||
      matchesQuery(item.feed.contentSnippet, q)
    );
  });

  const counts = {
    all: filteredUnified.length,
    papers: filteredPapers.length,
    universities: filteredUni.length,
    blogs: filteredNews.length,
  };

  return (
    <section className="section" id="research-hub">
      <div className="container">
        <ScrollReveal>
          <div className="hub-header">
            <div>
              <h2 className="section-title">
                {fullPage ? "Browse Everything" : "Find Research & Articles"}
              </h2>
              <p className="section-subtitle">
                Search and explore every paper, blog post, and article in one place
              </p>
            </div>
            <RefreshButton onRefresh={refetch} loading={loading} />
          </div>
        </ScrollReveal>

        <div className="discover-search">
          <Search size={18} className="discover-search-icon" aria-hidden />
          <input
            type="search"
            className="discover-search-input"
            placeholder="Search papers, blogs, articles, universities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search all content"
          />
        </div>

        <div className="tabs tabs-square discover-tabs">
          {(
            [
              { id: "all" as Tab, label: "Everything" },
              { id: "papers" as Tab, label: "Research Papers" },
              { id: "universities" as Tab, label: "University Research" },
              { id: "blogs" as Tab, label: "Blogs & Articles" },
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

        {loading && (
          <div className="hub-loading">
            <LoadingSpinner label="Loading research, blogs, and articles…" />
            <LoadingGrid count={6} />
          </div>
        )}

        {error && !loading && (
          <p className="error-banner">
            {error}. Start the server with <code>npm run dev</code>.
          </p>
        )}

        {!loading && !error && (
          <>
            {tab === "all" && (
              <div className="unified-list">
                {filteredUnified.length === 0 ? (
                  <p className="empty-state">No results. Try a different search.</p>
                ) : (
                  filteredUnified.slice(0, fullPage ? 60 : 30).map((item) =>
                    item.kind === "paper" ? (
                      <div key={item.id} className="unified-list-paper">
                        <ResearchCard paper={item.paper} />
                      </div>
                    ) : (
                      <LiveFeedItem key={item.id} item={item.feed} />
                    )
                  )
                )}
              </div>
            )}

            {tab === "papers" && (
              <StaggerList className="grid-3">
                {filteredPapers.length === 0 ? (
                  <p className="empty-state grid-full">No papers match your search.</p>
                ) : (
                  filteredPapers.slice(0, fullPage ? 48 : 24).map((p) => (
                    <StaggerItem key={p.id}>
                      <ResearchCard paper={p} />
                    </StaggerItem>
                  ))
                )}
              </StaggerList>
            )}

            {tab === "universities" && (
              <StaggerList className="grid-3">
                {filteredUni.length === 0 ? (
                  <p className="empty-state grid-full">No university research found.</p>
                ) : (
                  filteredUni.slice(0, fullPage ? 48 : 24).map((p) => (
                    <StaggerItem key={p.id}>
                      <ResearchCard paper={p} />
                    </StaggerItem>
                  ))
                )}
              </StaggerList>
            )}

            {tab === "blogs" && (
              <div className="news-feed-list">
                {filteredNews.length === 0 ? (
                  <p className="empty-state">No blogs or articles match your search.</p>
                ) : (
                  filteredNews.slice(0, fullPage ? 50 : 30).map((item) => (
                    <LiveFeedItem key={item.id} item={item} />
                  ))
                )}
              </div>
            )}
          </>
        )}

        {!fullPage && (
          <p className="hub-footer-link">
            <Link href="/research" className="btn btn-secondary btn-sm">
              Open Reddit-style feed →
            </Link>
            <Link href="/topics" className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }}>
              Browse topics →
            </Link>
          </p>
        )}
      </div>
    </section>
  );
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
