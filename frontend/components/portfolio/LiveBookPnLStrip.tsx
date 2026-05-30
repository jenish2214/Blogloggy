"use client";

import styles from "./LiveBookPnLStrip.module.css";

export interface BookPnLMetrics {
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  unrealizedPnl: number;
  realizedPnl: number;
  cash: number;
  costBasis?: number;
  investedValue?: number;
  startingCapital: number;
}

interface LiveBookPnLStripProps {
  metrics: BookPnLMetrics;
  bookLabel?: string;
  lastUpdated?: string | null;
  isLive?: boolean;
}

function fmtUsd(n: number, precise = false) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: precise ? 2 : 0,
    maximumFractionDigits: precise ? 2 : 0,
  });
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), true)}`;
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function tone(n: number) {
  return n >= 0 ? styles.up : styles.down;
}

export function LiveBookPnLStrip({
  metrics,
  bookLabel,
  lastUpdated,
  isLive = false,
}: LiveBookPnLStripProps) {
  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <section className={styles.strip} aria-label="Book profit and loss">
      <div className={styles.head}>
        <span className={styles.liveTag}>
          {isLive && <span className={styles.dot} aria-hidden />}
          {isLive ? "LIVE P&L" : "P&L SUMMARY"}
        </span>
        {updatedLabel ? <span className={styles.meta}>{updatedLabel}</span> : null}
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.cardPrimary}`}>
          <div className={styles.label}>Total P&amp;L</div>
          <div className={`${styles.value} ${tone(metrics.totalPnl)}`}>{fmtSigned(metrics.totalPnl)}</div>
          <div className={styles.sub}>
            <span className={tone(metrics.totalPnlPct)}>{fmtPct(metrics.totalPnlPct)}</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.label}>Unrealized P&amp;L</div>
          <div className={`${styles.value} ${tone(metrics.unrealizedPnl)}`}>
            {fmtSigned(metrics.unrealizedPnl)}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.label}>Realized P&amp;L</div>
          <div className={`${styles.value} ${tone(metrics.realizedPnl)}`}>
            {fmtSigned(metrics.realizedPnl)}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.label}>Portfolio value</div>
          <div className={styles.value}>{fmtUsd(metrics.totalValue, true)}</div>
          <div className={styles.sub}>
            Cash {fmtUsd(metrics.cash, true)}
            {metrics.investedValue != null && metrics.investedValue > 0
              ? ` · holdings ${fmtUsd(metrics.investedValue, true)}`
              : ""}
          </div>
        </div>
      </div>
    </section>
  );
}
