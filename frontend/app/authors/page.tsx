"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useFetchData } from "@/lib/hooks/useFetchData";
import { AsyncLoad } from "@/components/ui/AsyncLoad";
import { ResearchRedditLayout } from "@/components/layout/ResearchRedditLayout";
import { timeAgo } from "@/lib/utils";

export default function AuthorsPage() {
  const { data, loading, error, refetch } = useFetchData(() => api.researchDirectory(), []);

  const authors = data?.authors ?? [];

  return (
    <div className="page-main">
      <ResearchRedditLayout>
        <header className="reddit-page-header">
          <h1 className="section-title">All Researchers</h1>
          <p className="section-subtitle">
            Browse papers grouped by author — see every topic they publish in
          </p>
        </header>

        <AsyncLoad
          loading={loading}
          error={error}
          onRetry={refetch}
          label="Loading researchers from API…"
          skeletonCount={6}
        >
          <div className="author-grid">
            {authors.map((a) => (
              <Link key={a.slug} href={`/authors/${a.slug}`} className="author-card">
                <span className="reddit-avatar author-card-avatar">
                  {a.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h2 className="author-card-name">u/{a.slug}</h2>
                  <p className="author-card-display">{a.name}</p>
                  <p className="author-card-stats">
                    {a.paperCount} papers
                    {a.university && ` · ${a.university}`}
                  </p>
                  {a.topics.length > 0 && (
                    <p className="author-card-topics">
                      Topics:{" "}
                      {a.topics.slice(0, 4).map((t) => (
                        <span key={t} className="pill pill-square">
                          r/{t}
                        </span>
                      ))}
                    </p>
                  )}
                  {a.latestTitle && (
                    <p className="author-card-latest">
                      Latest: {a.latestTitle.slice(0, 60)}…
                      {a.latestDate && ` · ${timeAgo(a.latestDate)}`}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </AsyncLoad>
      </ResearchRedditLayout>
    </div>
  );
}
