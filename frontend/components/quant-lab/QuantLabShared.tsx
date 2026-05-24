"use client";

import styles from "./quant-lab.module.css";

export function MetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.skeletonGrid} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonCard} />
      ))}
    </div>
  );
}

export function QuantLabError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.errorCard} role="alert">
      <span className={styles.errorIcon}>⚠</span>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={styles.btnSecondary} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function ExplainerPanel({
  title = "What does this mean?",
  children,
  defaultOpen,
  mode,
}: {
  title?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mode: "beginner" | "pro";
}) {
  const open = mode === "beginner" ? true : defaultOpen ?? false;
  if (mode === "pro" && !open) return null;

  return (
    <details className={styles.explainer} open={open}>
      <summary className={styles.explainerToggle}>📖 {title}</summary>
      <div className={styles.explainerBody}>{children}</div>
    </details>
  );
}

export function LiveBadge({ price }: { price: number }) {
  return (
    <span className={styles.liveBadge} title="Live Finnhub quote">
      📡 Live: ${price.toFixed(2)}
    </span>
  );
}
