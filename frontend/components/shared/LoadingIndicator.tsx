"use client";

import styles from "./LoadingIndicator.module.css";

export type LoadingIndicatorProps = {
  /** Spinner size */
  size?: "sm" | "md" | "lg";
  /** Optional status text under the spinner */
  label?: string;
  /** "spinner" ring or "dots" pulse */
  variant?: "spinner" | "dots";
  className?: string;
};

export function LoadingIndicator({
  size = "md",
  label,
  variant = "spinner",
  className,
}: LoadingIndicatorProps) {
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? "Loading"}
    >
      {variant === "dots" ? (
        <span className={styles.dots} aria-hidden>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      ) : (
        <span className={`${styles.spinner} ${styles[size]}`} aria-hidden />
      )}
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
