"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TOPIC_ICONS } from "@/lib/slugs";
import { useFetchData } from "@/lib/hooks/useFetchData";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function ResearchRedditLayout({
  children,
  activeTopic,
  activeAuthor,
}: {
  children: ReactNode;
  activeTopic?: string;
  activeAuthor?: string;
}) {
  const { data, loading } = useFetchData(() => api.researchDirectory(), []);

  const topics = data?.topics ?? [];
  const authors = (data?.authors ?? []).slice(0, 12);

  return (
    <div className="reddit-layout container">
      <aside className="reddit-sidebar">
        <h2 className="reddit-sidebar-title">Topics</h2>
        <p className="reddit-sidebar-hint">Browse like subreddits</p>
        {loading ? (
          <div className="sidebar-loading">
            <LoadingSpinner label="Loading topics…" size="sm" />
          </div>
        ) : (
          <ul className="reddit-sidebar-list">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/topics/${t.slug}`}
                  className={`reddit-sidebar-link ${activeTopic === t.slug ? "active" : ""}`}
                >
                  <span className="reddit-sidebar-icon">{TOPIC_ICONS[t.icon] ?? "📄"}</span>
                  <span className="reddit-sidebar-link-text">
                    <strong>r/{t.slug}</strong>
                    <small>{t.paperCount} posts</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/topics" className="reddit-sidebar-more">
          View all topics →
        </Link>
      </aside>

      <main className="reddit-main">{children}</main>

      <aside className="reddit-sidebar reddit-sidebar-right">
        <h2 className="reddit-sidebar-title">Researchers</h2>
        <p className="reddit-sidebar-hint">Papers by author</p>
        {loading ? (
          <div className="sidebar-loading">
            <LoadingSpinner label="Loading authors…" size="sm" />
          </div>
        ) : (
          <ul className="reddit-sidebar-list">
            {authors.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/authors/${a.slug}`}
                  className={`reddit-sidebar-link ${activeAuthor === a.slug ? "active" : ""}`}
                >
                  <span className="reddit-avatar">{a.name.charAt(0).toUpperCase()}</span>
                  <span className="reddit-sidebar-link-text">
                    <strong>u/{a.slug}</strong>
                    <small>
                      {a.paperCount} papers
                      {a.university ? ` · ${a.university}` : ""}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/authors" className="reddit-sidebar-more">
          View all researchers →
        </Link>
      </aside>
    </div>
  );
}
