"use client";

import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ApiSectionStateProps = {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  loadingLabel?: string;
  skeletonCount?: number;
  /** Shown only when loaded successfully but no items */
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
};

/**
 * Section wrapper: loading skeleton → API error (no partial data) → content or empty.
 */
export function ApiSectionState({
  loading,
  error,
  onRetry,
  loadingLabel = "Loading from API…",
  skeletonCount = 4,
  isEmpty = false,
  emptyMessage = "No items returned from the API.",
  children,
}: ApiSectionStateProps) {
  if (loading) {
    return (
      <div className="async-load-section" role="status" aria-busy="true">
        <LoadingSpinner label={loadingLabel} />
        <LoadingGrid count={skeletonCount} />
      </div>
    );
  }

  if (error) {
    return <ApiErrorState message={error} onRetry={onRetry} variant="section" />;
  }

  if (isEmpty) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return <>{children}</>;
}
