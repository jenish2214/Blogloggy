"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ResearchPaper } from "@/types";
import { RedditFeedRow } from "@/components/feed/RedditFeedRow";
import { ResearchRedditLayout } from "@/components/layout/ResearchRedditLayout";
import { AsyncLoad } from "@/components/ui/AsyncLoad";
import { useFetchData } from "@/lib/hooks/useFetchData";

export default function AuthorDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data, loading, error, refetch } = useFetchData(() => api.author(slug), [slug]);

  const author = data?.author ?? null;
  const papers = data?.papers ?? [];
  const topics = data?.topics ?? [];

  return (
    <div className="page-main">
      <ResearchRedditLayout activeAuthor={slug}>
        <nav className="breadcrumb">
          <Link href="/authors">Researchers</Link>
          <span>/</span>
          <span>u/{slug}</span>
        </nav>

        <header className="reddit-page-header author-profile-header">
          <span className="reddit-avatar reddit-avatar-lg">
            {(author?.name ?? slug).charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="section-title">u/{slug}</h1>
            <p className="section-subtitle">{author?.name}</p>
            {author?.university && (
              <p className="reddit-page-meta">{author.university}</p>
            )}
            <p className="reddit-page-meta">
              {loading ? "Loading…" : `${papers.length} papers across ${topics.length} topics`}
            </p>
          </div>
        </header>

        {topics.length > 0 && (
          <div className="author-topic-pills">
            {topics.map((t) => (
              <Link
                key={t.slug}
                href={`/topics/${t.slug}`}
                className="pill pill-square"
              >
                r/{t.slug} ({t.count})
              </Link>
            ))}
          </div>
        )}

        <AsyncLoad
          loading={loading}
          error={error}
          onRetry={refetch}
          label="Loading author papers from API…"
          skeletonCount={5}
        >
          {!loading && !author ? (
            <p className="empty-state">
              Researcher not found in the API. Try the{" "}
              <Link href="/authors">researchers directory</Link>.
            </p>
          ) : papers.length === 0 ? (
            <p className="empty-state">No papers found for this researcher.</p>
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
