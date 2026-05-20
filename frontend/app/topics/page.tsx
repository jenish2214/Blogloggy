"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { TOPIC_ICONS } from "@/lib/slugs";
import { useFetchData } from "@/lib/hooks/useFetchData";
import { AsyncLoad } from "@/components/ui/AsyncLoad";
import { ResearchRedditLayout } from "@/components/layout/ResearchRedditLayout";
import { timeAgo } from "@/lib/utils";

export default function TopicsPage() {
  const { data, loading, error } = useFetchData(() => api.researchDirectory(), []);

  const topics = data?.topics ?? [];

  return (
    <div className="page-main">
      <ResearchRedditLayout>
        <header className="reddit-page-header">
          <h1 className="section-title">All Topics</h1>
          <p className="section-subtitle">
            Pick a research community — each topic shows every paper with full details
          </p>
        </header>

        <AsyncLoad loading={loading} error={error} label="Loading topics…" skeletonCount={6}>
          <div className="topic-grid">
            {topics.map((t) => (
              <Link key={t.slug} href={`/topics/${t.slug}`} className="topic-card">
                <span className="topic-card-icon">{TOPIC_ICONS[t.icon] ?? "📄"}</span>
                <div>
                  <h2 className="topic-card-name">r/{t.slug}</h2>
                  <p className="topic-card-title">{t.name}</p>
                  <p className="topic-card-desc">{t.description}</p>
                  <p className="topic-card-stats">
                    {t.paperCount} papers
                    {t.latestDate && ` · latest ${timeAgo(t.latestDate)}`}
                  </p>
                  {t.latestTitle && (
                    <p className="topic-card-latest">{t.latestTitle.slice(0, 72)}…</p>
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
