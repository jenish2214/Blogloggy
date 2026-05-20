"use client";

import Link from "next/link";
import type { FeedItem } from "@/types";
import { SourceIcon } from "@/components/ui/SourceIcon";
import { NEWS_CATEGORY_LABELS, sourceColor } from "@/lib/news";
import { formatFeedTime, isNewItem } from "@/lib/utils";

/** Live feed row with visible publish time (relative + absolute) */
export function LivePostCard({ item }: { item: FeedItem }) {
  const color = sourceColor(item.logoKey);
  const handle = item.handle ?? item.logoKey;
  const articlePath = `/article/${encodeURIComponent(item.id)}`;
  const { relative, absolute } = formatFeedTime(item.pubDate);
  const isNew = isNewItem(item.pubDate);
  const categoryLabel = NEWS_CATEGORY_LABELS[item.newsCategory] ?? item.newsCategory;

  return (
    <article className="x-post x-post-live">
      <div className="x-post-avatar" aria-hidden>
        <SourceIcon logoKey={item.logoKey} size={40} />
      </div>
      <div className="x-post-body">
        <div className="x-post-header x-post-header-live">
          <Link href={articlePath} className="x-post-name" style={{ color }}>
            {handle}
          </Link>
          <span className="x-post-handle">@{item.logoKey}</span>
          {categoryLabel && (
            <span className={`x-post-badge x-post-badge-${item.newsCategory}`}>
              {categoryLabel}
            </span>
          )}
        </div>
        <p className="live-post-time">
          {isNew && <span className="live-feed-new">NEW</span>}
          <time dateTime={item.pubDate} title={absolute}>
            {relative}
          </time>
          <span className="live-post-time-sep" aria-hidden>
            ·
          </span>
          <span className="live-post-time-absolute">{absolute}</span>
        </p>
        <Link href={articlePath} className="x-post-title-link">
          <h3 className="x-post-title">{item.title}</h3>
        </Link>
        {item.contentSnippet && <p className="x-post-text">{item.contentSnippet}</p>}
        <div className="x-post-actions">
          <Link href={articlePath} className="x-post-action">
            Read
          </Link>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="x-post-action"
          >
            Source ↗
          </a>
        </div>
      </div>
    </article>
  );
}
