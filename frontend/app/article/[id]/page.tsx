"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { NewsPostCard } from "@/components/feed/NewsPostCard";
import { NEWS_CATEGORY_LABELS, sourceColor } from "@/lib/news";
import { PageState } from "@/components/ui/PageState";
import { LOADING_NEWS } from "@/lib/loadingMessages";
import { useFetchData } from "@/lib/hooks/useFetchData";
import { timeAgo } from "@/lib/utils";

export default function ArticlePage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);

  const { data, loading, error, refetch } = useFetchData(() => api.article(id), [id]);

  const article = data?.article ?? null;
  const related = data?.related ?? [];

  if (!loading && (error || !article)) {
    return (
      <div className="page-main container">
        <p className="error-banner">{error ?? "Article not found"}</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/news">← Back to news</Link>
        </p>
      </div>
    );
  }

  const color = article ? sourceColor(article.logoKey) : undefined;

  return (
    <div className="page-main">
      <div className="x-timeline-wrap container">
        <PageState
          loading={loading}
          error={error}
          onRetry={refetch}
          loadingLabel="Loading article"
          loadingMessages={LOADING_NEWS}
          skeleton="news"
        >
          {article && (
            <>
              <nav className="breadcrumb">
                <Link href="/">Home</Link>
                <span>/</span>
                <Link href="/news">News</Link>
                <span>/</span>
                <span>Article</span>
              </nav>

              <article className="x-article-detail">
                <div className="x-article-detail-header">
                  <div
                    className="x-post-avatar x-post-avatar-lg"
                    style={
                      color
                        ? {
                            background: `${color}22`,
                            color,
                            borderColor: `${color}44`,
                          }
                        : undefined
                    }
                  >
                    {(article.handle ?? article.logoKey).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="x-article-author">
                      <strong>{article.handle}</strong>
                      <span className="x-post-handle"> @{article.logoKey}</span>
                    </p>
                    <p className="x-article-meta">
                      <span className={`x-post-badge x-post-badge-${article.newsCategory}`}>
                        {NEWS_CATEGORY_LABELS[article.newsCategory]}
                      </span>
                      <span className="x-post-dot">·</span>
                      <time dateTime={article.pubDate}>{timeAgo(article.pubDate)}</time>
                    </p>
                  </div>
                </div>

                <h1 className="x-article-title">{article.title}</h1>

                {article.contentSnippet ? (
                  <div className="x-article-body">
                    <p>{article.contentSnippet}</p>
                    <p className="x-article-note">
                      Full story is on the original publisher site.
                    </p>
                  </div>
                ) : null}

                <div className="x-article-actions">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <ExternalLink size={16} aria-hidden style={{ marginRight: 8 }} />
                    Read on {article.handle}
                  </a>
                  <Link href="/news" className="btn btn-secondary">
                    Back to timeline
                  </Link>
                </div>
              </article>

              {related.length > 0 && (
                <section className="x-related">
                  <h2 className="section-title" style={{ fontSize: "1.25rem" }}>
                    More in {NEWS_CATEGORY_LABELS[article.newsCategory]}
                  </h2>
                  <div className="x-timeline">
                    {related.map((item) => (
                      <NewsPostCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </PageState>
      </div>
    </div>
  );
}
