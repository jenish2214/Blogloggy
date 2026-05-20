"use client";

import Link from "next/link";
import { MessageSquare, ExternalLink } from "lucide-react";
import type { FeedItem, ResearchPaper } from "@/types";
import { authorSlug } from "@/lib/slugs";
import { topicHref } from "@/lib/topics";
import { timeAgo } from "@/lib/utils";

function scoreFor(paper: ResearchPaper): number {
  return paper.citationCount ?? Math.max(1, paper.year - 2015);
}

export function RedditFeedRow({ paper }: { paper: ResearchPaper }) {
  const score = scoreFor(paper);
  const primaryAuthor = paper.authors[0];
  const topicLink = topicHref(paper.category);

  return (
    <article className="reddit-row">
      <div className="reddit-vote" aria-hidden>
        <span className="reddit-score">{score}</span>
        <span className="reddit-score-label">pts</span>
      </div>
      <div className="reddit-body">
        <div className="reddit-meta">
          {topicLink && paper.category && (
            <Link href={topicLink} className="reddit-topic">
              r/{paper.category}
            </Link>
          )}
          <span className="reddit-meta-sep">·</span>
          <span>
            Posted by{" "}
            {primaryAuthor ? (
              <Link href={`/authors/${authorSlug(primaryAuthor.name)}`}>
                {primaryAuthor.name}
              </Link>
            ) : (
              "unknown"
            )}
            {paper.authors.length > 1 && ` +${paper.authors.length - 1}`}
          </span>
          <span className="reddit-meta-sep">·</span>
          <span>{timeAgo(paper.publishedAt)}</span>
          <span className="reddit-meta-sep">·</span>
          <span>{paper.university}</span>
        </div>
        <h3 className="reddit-title">
          <Link href={`/paper/${encodeURIComponent(paper.id)}`}>{paper.title}</Link>
        </h3>
        <p className="reddit-excerpt">
          {paper.abstract.slice(0, 280)}
          {paper.abstract.length > 280 ? "…" : ""}
        </p>
        <div className="reddit-actions">
          <Link
            href={`/paper/${encodeURIComponent(paper.id)}`}
            className="reddit-action"
          >
            <MessageSquare size={14} aria-hidden />
            Details
          </Link>
          <a
            href={paper.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reddit-action"
          >
            <ExternalLink size={14} aria-hidden />
            Source
          </a>
          <span className="reddit-source-tag">{paper.source}</span>
        </div>
      </div>
    </article>
  );
}

export function RedditArticleRow({ item }: { item: FeedItem }) {
  return (
    <article className="reddit-row">
      <div className="reddit-vote" aria-hidden>
        <span className="reddit-score">•</span>
        <span className="reddit-score-label">new</span>
      </div>
      <div className="reddit-body">
        <div className="reddit-meta">
          <span className="reddit-topic">r/{item.logoKey}</span>
          <span className="reddit-meta-sep">·</span>
          <span>{timeAgo(item.pubDate)}</span>
        </div>
        <h3 className="reddit-title">
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>
        {item.contentSnippet && (
          <p className="reddit-excerpt">
            {item.contentSnippet.slice(0, 220)}
            {item.contentSnippet.length > 220 ? "…" : ""}
          </p>
        )}
        <div className="reddit-actions">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="reddit-action"
          >
            <ExternalLink size={14} aria-hidden />
            Read article
          </a>
        </div>
      </div>
    </article>
  );
}
