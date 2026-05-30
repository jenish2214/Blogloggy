"use client";

import styles from "./RefreshingBar.module.css";

/** Thin animated bar while background data refreshes */
export function RefreshingBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className={styles.bar} role="progressbar" aria-label="Refreshing data" aria-busy="true" />
  );
}
