"use client";

import Link from "next/link";
import { ExternalLink, MessageCircle, Repeat2 } from "lucide-react";
import type { FeedItem } from "@/types";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { NEWS_CATEGORY_LABELS, sourceColor } from "@/lib/news";
import { timeAgo } from "@/lib/utils";

export function NewsPostCard({ item }: { item: FeedItem }) {
  const color = sourceColor(item.logoKey);
  const categoryLabel = NEWS_CATEGORY_LABELS[item.newsCategory] ?? item.newsCategory;
  const handle = item.handle ?? item.logoKey;
  const articlePath = `/article/${encodeURIComponent(item.id)}`;

  return (
    <article className="x-post">
      <div className="x-post-avatar x-post-avatar-svg" aria-hidden>
        <SourceIcon logoKey={item.logoKey} size={40} />
      </div>
      <div className="x-post-body">
        <div className="x-post-header">
          <Link href={articlePath} className="x-post-name">
            {handle}
          </Link>
          <span className="x-post-handle">@{item.logoKey}</span>
          <span className="x-post-dot" aria-hidden>
            ·
          </span>
          <time className="x-post-time" dateTime={item.pubDate}>
            {timeAgo(item.pubDate)}
          </time>
          <span className={`x-post-badge x-post-badge-${item.newsCategory}`}>
            {categoryLabel}
          </span>
        </div>
        <Link href={articlePath} className="x-post-title-link">
          <h3 className="x-post-title">{item.title}</h3>
        </Link>
        {item.contentSnippet && (
          <p className="x-post-text">{item.contentSnippet}</p>
        )}
        <div className="x-post-actions">
          <Link href={articlePath} className="x-post-action">
            <MessageCircle size={16} aria-hidden />
            Read
          </Link>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="x-post-action"
          >
            <ExternalLink size={16} aria-hidden />
            Source
          </a>
          <span className="x-post-action x-post-action-muted">
            <Repeat2 size={16} aria-hidden />
            {item.source}
          </span>
        </div>
      </div>
    </article>
  );
}
