"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type {
  DashboardBenchmark,
  DashboardBookSummary,
  DashboardTotals,
} from "@/lib/dashboard/types";
import { fmtPct, fmtUsd } from "@/lib/trading/portfolioSnapshot";
import styles from "@/app/(platform)/dashboard.module.css";

export type DashboardPortfolioHeroProps = {
  totals: DashboardTotals;
  books: DashboardBookSummary[];
  benchmark: DashboardBenchmark | null;
  loading?: boolean;
  scope?: "all" | "book";
  activePortfolioId?: string | null;
  personalAum?: number;
  clientAum?: number;
};

export function DashboardPortfolioHero({
  totals,
  books,
  loading,
  scope = "all",
  activePortfolioId = null,
}: DashboardPortfolioHeroProps) {
  const up = totals.totalPnl >= 0;

  return (
    <section
      className={`${styles.portfolioHero} ${styles.fadeIn}`}
      style={{ "--i": 0 } as CSSProperties}
      aria-label="Total portfolio value"
    >
      <div className={styles.portfolioHeroMain}>
        <div className={styles.portfolioHeroTop}>
          <span className={styles.portfolioHeroLabel}>
            {scope === "book" ? "Active book value" : "Your total portfolio"}
          </span>
          {loading ? (
            <span className={`${styles.portfolioLiveBadge} ${styles.portfolioLiveBadgeBusy}`}>
              <span className={styles.portfolioLiveDot} aria-hidden />
              Updating…
            </span>
          ) : null}
        </div>
        <p className={styles.portfolioHeroValue}>{fmtUsd(totals.totalPortfolioValue)}</p>
        <div className={styles.portfolioHeroMeta}>
          <span className={up ? styles.pnlUp : styles.pnlDown}>
            {fmtUsd(totals.totalPnl, { signed: true })} ({fmtPct(totals.totalPnlPct)})
          </span>
          <span className={styles.portfolioHeroSep}>·</span>
          <span>
            {fmtUsd(totals.unrealizedPnl, { signed: true })} unrealized · {totals.openPositions} pos
          </span>
        </div>
      </div>

      <div className={styles.portfolioHeroSide}>
        <p className={styles.portfolioBooksTitle}>Books</p>
        <ul className={styles.portfolioBooksList}>
          {books.slice(0, 6).map((b) => {
            const bookUp = b.totalPnl >= 0;
            const isActive = b.portfolioId === activePortfolioId;
            return (
              <li
                key={b.portfolioId}
                className={`${styles.portfolioBookRow} ${isActive ? styles.portfolioBookRowActive : ""}`}
              >
                <div className={styles.portfolioBookHead}>
                  <span className={styles.portfolioBookLabel}>{b.accountLabel}</span>
                  <span className={styles.portfolioBookValue}>{fmtUsd(b.totalValue)}</span>
                </div>
                <span className={`${styles.portfolioBookPnl} ${bookUp ? styles.pnlUp : styles.pnlDown}`}>
                  {fmtPct(b.totalPnlPct)}
                </span>
              </li>
            );
          })}
        </ul>
        {books.length > 5 ? (
          <Link href="/wealth" className={styles.portfolioHeroLink}>
            +{books.length - 5} more books
          </Link>
        ) : null}
      </div>
    </section>
  );
}
