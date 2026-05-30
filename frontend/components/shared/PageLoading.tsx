"use client";

import { LoadingIndicator } from "@/components/shared/LoadingIndicator";
import styles from "./PageLoading.module.css";

export type PageLoadingProps = {
  label?: string;
  /** Number of shimmer placeholder rows */
  rows?: number;
  /** Full page center vs in-content block */
  layout?: "page" | "inline" | "compact";
  /** Hide skeleton rows — spinner only */
  skeleton?: boolean;
  className?: string;
};

export function PageLoading({
  label = "Loading data…",
  rows = 5,
  layout = "page",
  skeleton = true,
  className,
}: PageLoadingProps) {
  const layoutClass =
    layout === "inline" ? styles.inline : layout === "compact" ? styles.compact : styles.page;

  return (
    <div
      className={[layoutClass, className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingIndicator size={layout === "compact" ? "sm" : "md"} label={label} />
      {skeleton && rows > 0 ? (
        <div className={styles.skeletonStack} aria-hidden>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className={`${styles.shimmerRow} ${i === 0 ? styles.shimmerRowTall : ""} ${i === rows - 1 ? styles.shimmerRowShort : ""}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
