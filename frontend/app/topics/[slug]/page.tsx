"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ResearchPaper } from "@/types";
import { RedditFeedRow } from "@/components/feed/RedditFeedRow";
import { ResearchRedditLayout } from "@/components/layout/ResearchRedditLayout";
import { AsyncLoad } from "@/components/ui/AsyncLoad";
import { useFetchData } from "@/lib/hooks/useFetchData";

export default function TopicDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data, loading, error, refetch } = useFetchData(
    () => api.category(slug, 48),
    [slug]
  );

  const category = data?.category ?? null;
  const papers = data?.papers ?? [];

  return (
    <div className="page-main">
      <ResearchRedditLayout activeTopic={slug}>
        <nav className="breadcrumb">
          <Link href="/topics">Topics</Link>
          <span>/</span>
          <span>r/{slug}</span>
        </nav>

        <header className="reddit-page-header">
          <h1 className="section-title">r/{category?.slug ?? slug}</h1>
          <p className="section-subtitle">
            {category?.description ?? "This topic could not be loaded."}
          </p>
          <p className="reddit-page-meta">
            {loading ? "Loading…" : `${papers.length} posts with details`}
          </p>
        </header>

        <AsyncLoad
          loading={loading}
          error={error}
          onRetry={refetch}
          label="Loading topic papers from API…"
          skeletonCount={5}
        >
          {!loading && !category ? (
            <p className="empty-state">
              Topic not found in the API. Browse all{" "}
              <Link href="/topics">topics</Link>.
            </p>
          ) : papers.length === 0 ? (
            <p className="empty-state">No papers in this topic yet.</p>
          ) : (
            <div className="reddit-feed">
              {papers.map((p: ResearchPaper) => (
                <RedditFeedRow key={p.id} paper={p} />
              ))}
            </div>
          )}
        </AsyncLoad>
      </ResearchRedditLayout>
    </div>
  );
}
