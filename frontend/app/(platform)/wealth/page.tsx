"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { WealthBookSummary } from "@/lib/api";
import { wealthApi } from "@/lib/api";
import { ClientsMasterDetail } from "@/components/wealth/ClientsMasterDetail";
import { useClientsCrud } from "@/lib/hooks/useClientsCrud";
import { useWealthLiveFeed } from "@/lib/hooks/useWealthLiveFeed";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { PageLoading } from "@/components/shared/PageLoading";
import { RefreshingBar } from "@/components/shared/RefreshingBar";
import { fmtUsd } from "@/lib/trading/portfolioSnapshot";
import styles from "./wealth.module.css";

function fmtPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pnlClass(n: number) {
  return n >= 0 ? styles.pnlUp : styles.pnlDown;
}

export default function WealthDeskPage() {
  const router = useRouter();
  const [deskTab, setDeskTab] = useState<"books" | "clients">("clients");
  const { books, summary, loading, error, refresh } = useWealthLiveFeed(true);
  const setActiveBook = useActiveBookStore((s) => s.setActiveBook);
  const clearActiveBook = useActiveBookStore((s) => s.clearActiveBook);
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [view, setView] = useState<"all" | "personal" | "clients">("all");
  const [seeding, setSeeding] = useState(false);

  const crud = useClientsCrud(refresh);

  const bookByClientId = useMemo(() => {
    const m = new Map<string, WealthBookSummary>();
    for (const b of books) {
      if (b.clientId) m.set(b.clientId, b);
    }
    return m;
  }, [books]);

  const filtered = books.filter((b) => {
    if (view === "personal") return b.accountType === "personal";
    if (view === "clients") return b.accountType === "client";
    return true;
  });

  const activateBook = async (book: WealthBookSummary) => {
    setActiveBook({
      portfolioId: book.portfolioId,
      clientId: book.clientId,
      accountType: book.accountType,
      clientCode: book.clientCode ?? undefined,
      label: book.accountLabel,
    });
    await syncPortfolioFromCloud();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await wealthApi.seedDemoClients();
      await refresh();
      await crud.refresh();
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteFromTable = async (id: string) => {
    const client = crud.clients.find((c) => c.id === id);
    const name = client?.display_name ?? "this client";
    if (!window.confirm(`Delete ${name}? This removes the client record and managed book from Supabase.`)) {
      return;
    }
    await crud.remove(id);
    if (activeBook?.clientId === id) clearActiveBook();
  };

  const displayError = error ?? crud.error;
  return (
    <div className={styles.page}>
      <RefreshingBar active={loading && books.length > 0} />
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Wealth Desk</h1>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              refresh();
              void crud.refresh();
            }}
          >
            Refresh
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleSeed} disabled={seeding}>
            {seeding ? "Seeding…" : "Sample clients"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setDeskTab("clients");
              crud.openCreate();
            }}
          >
            + New client
          </button>
          <Link href="/desk?section=wallet" className="btn btn-ghost btn-sm">
            Client wallet →
          </Link>
        </div>
      </header>

      {displayError && (
        <div className={styles.errorBanner}>
          {displayError}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => crud.setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.deskTabs}>
        <button
          type="button"
          className={`${styles.deskTab} ${deskTab === "clients" ? styles.deskTabActive : ""}`}
          onClick={() => setDeskTab("clients")}
        >
          Client registry ({crud.allCount})
        </button>
        <button
          type="button"
          className={`${styles.deskTab} ${deskTab === "books" ? styles.deskTabActive : ""}`}
          onClick={() => setDeskTab("books")}
        >
          Books &amp; AUM ({books.length})
        </button>
      </div>

      <section className={styles.summaryGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Firm AUM</div>
          <div className={styles.statValue}>{summary ? fmtUsd(summary.firmAum, { compact: true }) : "—"}</div>
          <div className={styles.statSub}>Personal + all client books (live)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Aggregate cash</div>
          <div className={styles.statValue}>{summary ? fmtUsd(summary.totalCash) : "—"}</div>
          <div className={styles.statSub}>Wallet across all books</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Unrealized P&amp;L</div>
          <div
            className={`${styles.statValue} ${
              summary ? pnlClass(summary.totalUnrealized) : ""
            }`}
          >
            {summary ? fmtUsd(summary.totalUnrealized, { signed: true }) : "—"}
          </div>
          <div className={styles.statSub}>
            {summary ? `${summary.openPositions} open position(s)` : "Open holdings"}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Personal AUM</div>
          <div className={styles.statValue}>{summary ? fmtUsd(summary.personalAum) : "—"}</div>
          <div className={styles.statSub}>Your sleeve</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Client AUM</div>
          <div className={styles.statValue}>{summary ? fmtUsd(summary.clientAum) : "—"}</div>
          <div className={styles.statSub}>
            {summary ? `${summary.clientCount} managed book(s)` : "Managed books"}
          </div>
        </div>
      </section>

      {deskTab === "clients" && (
        <section className={styles.panel}>
          <p className={styles.panelTitle} style={{ marginBottom: 12 }}>
            Client registry — select a client on the left for live book metrics and profile
          </p>
          <ClientsMasterDetail
            crud={crud}
            bookByClientId={bookByClientId}
            onDelete={handleDeleteFromTable}
            onWallet={() => router.push("/desk?section=wallet")}
          />
        </section>
      )}

      {deskTab === "books" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Books of record — Supabase + live prices</span>
            <div className={styles.tabs}>
              {(["all", "personal", "clients"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.tab} ${view === t ? styles.tabActive : ""}`}
                  onClick={() => setView(t)}
                >
                  {t === "all" ? "All" : t === "personal" ? "Personal" : "Clients"}
                </button>
              ))}
            </div>
          </div>

          {loading && books.length === 0 ? (
            <PageLoading label="Loading your books…" rows={5} layout="inline" />
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              No books yet. Add clients in the <strong>Client registry</strong> tab or trade on
              your personal book.
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Code</th>
                    <th>Starting</th>
                    <th>Cash wallet</th>
                    <th>Holdings</th>
                    <th>Cost basis</th>
                    <th>Total value</th>
                    <th>Return</th>
                    <th>Return %</th>
                    <th>Unrealized</th>
                    <th>Pos.</th>
                    <th>Orders</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.portfolioId}>
                      <td>
                        <strong>{b.accountLabel}</strong>
                        {activeBook?.portfolioId === b.portfolioId && (
                          <span className={styles.activeTag}>ACTIVE</span>
                        )}
                      </td>
                      <td className={styles.mono}>{b.clientCode ?? "—"}</td>
                      <td className={styles.mono}>{fmtUsd(b.metrics.startingCapital)}</td>
                      <td className={styles.mono}>{fmtUsd(b.metrics.cash)}</td>
                      <td className={styles.mono}>{fmtUsd(b.metrics.invested)}</td>
                      <td className={styles.mono}>{fmtUsd(b.metrics.costBasis)}</td>
                      <td className={styles.mono}>{fmtUsd(b.metrics.totalValue)}</td>
                      <td className={`${styles.mono} ${pnlClass(b.metrics.totalPnl)}`}>
                        {fmtUsd(b.metrics.totalPnl, { signed: true })}
                      </td>
                      <td className={`${styles.mono} ${pnlClass(b.metrics.totalPnlPct)}`}>
                        {fmtPct(b.metrics.totalPnlPct)}
                      </td>
                      <td className={`${styles.mono} ${pnlClass(b.metrics.unrealizedPnl)}`}>
                        {fmtUsd(b.metrics.unrealizedPnl, { signed: true })}
                      </td>
                      <td className={styles.mono}>{b.metrics.openPositions}</td>
                      <td className={styles.mono}>{b.metrics.orderCount}</td>
                      <td>
                        <button type="button" className={styles.rowBtn} onClick={() => activateBook(b)}>
                          Manage
                        </button>{" "}
                        {b.clientId && (
                          <button
                            type="button"
                            className={styles.rowBtn}
                            onClick={() => {
                              setDeskTab("clients");
                              void crud.openRead(b.clientId!);
                            }}
                          >
                            Details
                          </button>
                        )}{" "}
                        <Link
                          href="/trade"
                          className={styles.rowBtn}
                          style={{ textDecoration: "none", display: "inline-block" }}
                          onClick={() => void activateBook(b)}
                        >
                          Trade
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeBook && (
        <p className={styles.activeHint}>
          Active book: <strong>{activeBook.label}</strong> — trades and portfolio sync to this
          sleeve in Supabase.
        </p>
      )}

    </div>
  );
}
