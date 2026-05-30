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

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export function DashboardPortfolioHero({
  totals,
  books,
  benchmark,
  loading,
  scope = "all",
  activePortfolioId = null,
  personalAum = 0,
  clientAum = 0,
}: DashboardPortfolioHeroProps) {
  const up = totals.totalPnl >= 0;
  const vsMarket =
    benchmark != null ? totals.totalPnlPct - benchmark.changePct : null;

  const maxBook = Math.max(...books.map((b) => b.totalValue), 1);

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
            {fmtUsd(totals.totalPnl, { signed: true })} ({fmtPct(totals.totalPnlPct)}) all-time
          </span>
          <span className={styles.portfolioHeroSep}>·</span>
          <span>
            {fmtUsd(totals.unrealizedPnl, { signed: true })} unrealized · {totals.openPositions} positions
          </span>
        </div>
        {benchmark ? (
          <p className={styles.portfolioHeroCompare}>
            <strong>{benchmark.name}</strong> {fmtPct(benchmark.changePct)} today
            {vsMarket != null ? (
              <>
                {" "}
                · You are{" "}
                <span className={vsMarket >= 0 ? styles.pnlUp : styles.pnlDown}>
                  {vsMarket >= 0 ? "+" : ""}
                  {vsMarket.toFixed(2)}%
                </span>{" "}
                vs market (on total return %)
              </>
            ) : null}
          </p>
        ) : null}
        <p className={styles.portfolioHeroUpdated}>
          Last mark: {formatTime(totals.lastUpdated)}
          {" · "}
          <Link href="/portfolio" className={styles.portfolioHeroLink}>
            View holdings
          </Link>
        </p>
      </div>

      <div className={styles.portfolioHeroSide}>
        <p className={styles.portfolioBooksTitle}>
          {scope === "book" ? "Your books" : `Personal & client books (${books.length})`}
        </p>
        {scope === "all" && (personalAum > 0 || clientAum > 0) ? (
          <p className={styles.portfolioHeroUpdated}>
            Personal {fmtUsd(personalAum)}
            {clientAum > 0 ? ` · Clients ${fmtUsd(clientAum)}` : ""}
          </p>
        ) : null}
        <ul className={styles.portfolioBooksList}>
          {books.slice(0, 6).map((b) => {
            const pct = (b.totalValue / maxBook) * 100;
            const bookUp = b.totalPnl >= 0;
            const isActive = b.portfolioId === activePortfolioId;
            return (
              <li
                key={b.portfolioId}
                className={`${styles.portfolioBookRow} ${isActive ? styles.portfolioBookRowActive : ""}`}
              >
                <div className={styles.portfolioBookHead}>
                  <span className={styles.portfolioBookLabel}>
                    {b.accountLabel}
                    <span className={styles.portfolioBookType}>{b.accountType}</span>
                  </span>
                  <span className={styles.portfolioBookValue}>{fmtUsd(b.totalValue)}</span>
                </div>
                <div className={styles.portfolioBookBarTrack}>
                  <div
                    className={styles.portfolioBookBarFill}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
                <span className={bookUp ? styles.pnlUp : styles.pnlDown}>
                  {fmtPct(b.totalPnlPct)} · {b.openPositions} pos
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
