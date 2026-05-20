"use client";

import { RefreshCw } from "lucide-react";
import { useDelayedMessage } from "@/lib/hooks/useDelayedMessage";

export type PageStateSkeleton = "page" | "grid" | "news" | "feed" | "cards";

const DEFAULT_MESSAGES = [
  "Connecting to research APIs…",
  "Fetching university and lab feeds…",
  "Loading Wikipedia and RSS sources…",
  "Organizing results — almost ready…",
];

function SkeletonNews() {
  return (
    <div className="ps-skeleton-news" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="ps-skeleton-post" style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="ps-skel-avatar animate-shimmer" />
          <div className="ps-skel-body">
            <div className="ps-skel-line w-40 animate-shimmer" />
            <div className="ps-skel-line w-full animate-shimmer" />
            <div className="ps-skel-line w-90 animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="ps-skeleton-grid" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="ps-skeleton-card animate-load-fade"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <div className="ps-skel-line w-70 animate-shimmer" />
          <div className="ps-skel-line w-full animate-shimmer" />
          <div className="ps-skel-line w-85 animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

function SkeletonFeed() {
  return (
    <div className="ps-skeleton-feed" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="ps-skeleton-row animate-load-fade" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="ps-skel-vote animate-shimmer" />
          <div className="ps-skel-row-body">
            <div className="ps-skel-line w-50 animate-shimmer" />
            <div className="ps-skel-line w-full animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonBlock({ variant, count }: { variant: PageStateSkeleton; count: number }) {
  if (variant === "news") return <SkeletonNews />;
  if (variant === "feed") return <SkeletonFeed />;
  if (variant === "grid" || variant === "cards") return <SkeletonGrid count={count} />;
  return (
    <div className="ps-skeleton-page">
      <SkeletonGrid count={Math.min(count, 3)} />
    </div>
  );
}

type PageStateProps = {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingLabel?: string;
  loadingMessages?: string[];
  skeleton?: PageStateSkeleton;
  skeletonCount?: number;
  empty?: React.ReactNode;
  isEmpty?: boolean;
};

export function PageState({
  loading,
  error,
  onRetry,
  children,
  loadingLabel = "Loading",
  loadingMessages = DEFAULT_MESSAGES,
  skeleton = "grid",
  skeletonCount = 6,
  empty,
  isEmpty = false,
}: PageStateProps) {
  const delayed = useDelayedMessage(loading, loadingMessages);

  if (loading) {
    return (
      <div className="page-state page-state-loading" role="status" aria-live="polite" aria-busy="true">
        <div className="page-state-loader">
          <div className="page-state-ring" aria-hidden />
          <p className="page-state-title">{loadingLabel}</p>
          <p className="page-state-hint">{delayed}</p>
          <p className="page-state-sub">Free public APIs — this can take 10–30 seconds on first load.</p>
        </div>
        <SkeletonBlock variant={skeleton} count={skeletonCount} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state page-state-error">
        <div className="page-state-error-card">
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <p className="page-state-sub">
            Make sure the API is running: <code>npm run dev</code> from the project root, then check{" "}
            <a href="http://localhost:4000/api/health" target="_blank" rel="noopener noreferrer">
              localhost:4000/api/health
            </a>
          </p>
          {onRetry && (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              <RefreshCw size={16} aria-hidden style={{ marginRight: 8 }} />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isEmpty && empty) {
    return <div className="page-state page-state-empty">{empty}</div>;
  }

  return <>{children}</>;
}
