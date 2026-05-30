"use client";

import type { ReactNode } from "react";
import { PageLoading } from "@/components/shared/PageLoading";
import styles from "./DataState.module.css";

interface DataStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  loadingSkeleton?: ReactNode;
  children: ReactNode;
}

export function DataState({
  loading,
  error,
  empty,
  emptyMessage = "No data available.",
  onRetry,
  loadingSkeleton,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div className={styles.wrap} aria-busy="true">
        {loadingSkeleton ?? <PageLoading layout="inline" label="Loading…" rows={3} />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrap} role="alert">
        <p className={styles.error}>{error}</p>
        {onRetry && (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
