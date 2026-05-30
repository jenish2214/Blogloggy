"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDualProfiles } from "@/lib/hooks/useDualProfiles";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import type { WealthBookSummary } from "@/lib/api";
import styles from "./ProfileMandatesTrackRecord.module.css";

function fmtUsd(n: number) {
  const sign = n >= 0 ? "" : "−";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function pnlCls(n: number) {
  return n >= 0 ? styles.up : styles.down;
}

function bookRows(personal: WealthBookSummary | null, clientBooks: WealthBookSummary[]) {
  const rows: WealthBookSummary[] = [];
  if (personal) rows.push(personal);
  rows.push(...clientBooks);
  return rows;
}

export function ProfileMandatesTrackRecord() {
  const { personal, clientBooks, loading, activeBook } = useDualProfiles();
  const setActiveBook = useActiveBookStore((s) => s.setActiveBook);

  const rows = useMemo(() => bookRows(personal, clientBooks), [personal, clientBooks]);

  const totals = useMemo(() => {
    const clientOnly = clientBooks;
    return {
      clientCount: clientOnly.length,
      openPositions: rows.reduce((s, b) => s + b.metrics.openPositions, 0),
      clientAum: clientOnly.reduce((s, b) => s + b.metrics.totalValue, 0),
      clientPnl: clientOnly.reduce((s, b) => s + b.metrics.totalPnl, 0),
      totalOrders: rows.reduce((s, b) => s + b.metrics.orderCount, 0),
      firmAum: rows.reduce((s, b) => s + b.metrics.totalValue, 0),
    };
  }, [rows, clientBooks]);

  const activate = async (book: WealthBookSummary) => {
    setActiveBook({
      portfolioId: book.portfolioId,
      clientId: book.clientId,
      accountType: book.accountType,
      label: book.accountLabel,
      clientCode: book.clientCode ?? undefined,
    });
    await syncPortfolioFromCloud();
  };

  if (loading && rows.length === 0) {
    return (
      <section className={styles.section} aria-label="Mandates overview">
        <p className={styles.loading}>Loading mandates &amp; track records…</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className={styles.section} aria-label="Mandates overview">
        <div className={styles.head}>
          <h2 className={styles.title}>Books you manage</h2>
        </div>
        <p className={styles.muted}>
          No books yet.{" "}
          <Link href="/desk?section=clients">Add a client →</Link>
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Mandates overview">
      <div className={styles.head}>
        <h2 className={styles.title}>Books you manage</h2>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Client mandates</div>
          <div className={styles.summaryValue}>{totals.clientCount}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Open positions (assets)</div>
          <div className={styles.summaryValue}>{totals.openPositions}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Client AUM</div>
          <div className={styles.summaryValue}>{fmtUsd(totals.clientAum)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Client P&amp;L</div>
          <div className={`${styles.summaryValue} ${pnlCls(totals.clientPnl)}`}>
            {fmtUsd(totals.clientPnl)}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total books AUM</div>
          <div className={styles.summaryValue}>{fmtUsd(totals.firmAum)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Trades (all books)</div>
          <div className={styles.summaryValue}>{totals.totalOrders}</div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Book / client</th>
              <th>Type</th>
              <th>AUM</th>
              <th>Total P&amp;L</th>
              <th>Return</th>
              <th>Assets</th>
              <th>Trades</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((book) => {
              const active =
                activeBook?.portfolioId === book.portfolioId ||
                (book.clientId != null && activeBook?.clientId === book.clientId);
              const m = book.metrics;
              return (
                <tr key={book.portfolioId} className={`${styles.row} ${active ? styles.rowActive : ""}`}>
                  <td>
                    <button type="button" className={styles.rowBtn} onClick={() => void activate(book)}>
                      <p className={styles.bookName}>
                        {book.clientName ?? book.accountLabel.replace(/ — Managed$/, "")}
                      </p>
                      {book.clientCode ? (
                        <span className={styles.bookCode}>{book.clientCode}</span>
                      ) : null}
                    </button>
                  </td>
                  <td>
                    <span className={book.accountType === "personal" ? styles.badgeP : styles.badgeC}>
                      {book.accountType === "personal" ? "Personal" : "Client"}
                    </span>
                  </td>
                  <td className={styles.mono}>{fmtUsd(m.totalValue)}</td>
                  <td className={`${styles.mono} ${pnlCls(m.totalPnl)}`}>{fmtUsd(m.totalPnl)}</td>
                  <td className={`${styles.mono} ${pnlCls(m.totalPnlPct)}`}>{fmtPct(m.totalPnlPct)}</td>
                  <td className={styles.mono}>{m.openPositions}</td>
                  <td className={styles.mono}>{m.orderCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={styles.foot}>
        Manage clients in{" "}
        <Link href="/desk?section=clients">Client management</Link>
        {" · "}
        Deposits &amp; withdrawals in{" "}
        <Link href="/desk?section=wallet">Client wallet</Link>
      </p>
    </section>
  );
}
