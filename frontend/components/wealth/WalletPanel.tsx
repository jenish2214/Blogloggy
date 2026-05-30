"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { walletApi, type WalletSummaryResponse, type WalletTransaction } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { MAX_DEPOSIT_PER_TX, MAX_WITHDRAWAL_24H, formatWalletLimit } from "@/lib/wealth/walletLimits";
import { LoadingIndicator } from "@/components/shared/LoadingIndicator";
import { WalletDepositFlow } from "@/components/wealth/WalletDepositFlow";
import { WalletWithdrawFlow } from "@/components/wealth/WalletWithdrawFlow";
import styles from "./WalletPanel.module.css";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface WalletPanelProps {
  compact?: boolean;
  /** Fixed right rail — slimmer form, fewer ledger rows */
  rail?: boolean;
  /** Inside collapsible section — no outer card chrome */
  nested?: boolean;
}

export function WalletPanel({ compact = false, rail = false, nested = false }: WalletPanelProps) {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [data, setData] = useState<WalletSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [note, setNote] = useState("");

  const bookParams = activeBook
    ? { portfolioId: activeBook.portfolioId, clientId: activeBook.clientId }
    : undefined;

  const load = useCallback(async () => {
    if (!bookParams) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await walletApi.get(bookParams);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeBook?.portfolioId, activeBook?.clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const netFlow =
    (data?.stats.totalDeposits ?? 0) - (data?.stats.totalWithdrawals ?? 0);

  const txs =
    compact || rail
      ? (data?.transactions ?? []).slice(0, rail ? 8 : 5)
      : data?.transactions ?? [];

  if (!activeBook) {
    return (
      <div className={nested ? styles.panelNested : styles.panel}>
        <div className={styles.emptyState}>
          <p className={styles.muted}>
            Select a client book in the desk bar above to manage deposits (+) and withdrawals (−).
          </p>
        </div>
      </div>
    );
  }

  const clientTag =
    activeBook.accountType === "client"
      ? activeBook.clientCode ?? "Client"
      : "Personal";

  return (
    <div className={`${nested ? styles.panelNested : styles.panel} page-enter-child`}>
      <div className={rail ? styles.headRailWrap : styles.hero}>
        {!rail && (
          <div className={styles.head}>
            <div>
              <span className={styles.label}>
                {activeBook.accountType === "client" ? "Client wallet" : "Personal wallet"}
              </span>
              <h3 className={styles.title}>
                {activeBook.label}
                <span className={styles.clientTag}>{clientTag}</span>
              </h3>
            </div>
            <div className={styles.balance}>
              <span className={styles.balanceL}>Cash balance</span>
              <span className={styles.balanceV}>
                {loading ? "…" : fmtUsd(data?.book.cash ?? 0)}
              </span>
            </div>
          </div>
        )}
        {rail && (
          <>
            <p className={styles.railBook}>
              {activeBook.label}
              <span className={styles.clientTag}>{clientTag}</span>
            </p>
            <div className={styles.balance}>
              <span className={styles.balanceL}>Cash</span>
              <span className={styles.balanceV}>
                {loading ? "…" : fmtUsd(data?.book.cash ?? 0)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className={styles.body}>
      {!loading && data && !rail && (
        <div className={`${styles.summary} stagger-in`}>
          <div className={`${styles.sumCard} ${styles.sumPlus} hover-lift`}>
            <span className={styles.sumSign}>+</span>
            <span className={styles.sumLabel}>Money in (deposits)</span>
            <span className={styles.sumVal}>{fmtUsd(data.stats.totalDeposits)}</span>
            <span className={styles.sumMeta}>{data.stats.depositCount} deposit{data.stats.depositCount !== 1 ? "s" : ""}</span>
          </div>
          <div className={`${styles.sumCard} ${styles.sumMinus} hover-lift`}>
            <span className={styles.sumSign}>−</span>
            <span className={styles.sumLabel}>Money out (withdrawals)</span>
            <span className={styles.sumVal}>{fmtUsd(data.stats.totalWithdrawals)}</span>
            <span className={styles.sumMeta}>{data.stats.withdrawalCount} withdrawal{data.stats.withdrawalCount !== 1 ? "s" : ""}</span>
          </div>
          <div className={`${styles.sumCard} hover-lift`}>
            <span className={styles.sumSignNeutral}>±</span>
            <span className={styles.sumLabel}>Net client flow</span>
            <span className={`${styles.sumVal} ${netFlow >= 0 ? styles.netUp : styles.netDown}`}>
              {netFlow >= 0 ? "+" : "−"}
              {fmtUsd(Math.abs(netFlow))}
            </span>
            <span className={styles.sumMeta}>deposits minus withdrawals</span>
          </div>
        </div>
      )}

      {!rail && (
        <div className={styles.limits}>
          <span>Max + per deposit: {formatWalletLimit(MAX_DEPOSIT_PER_TX)}</span>
          <span>
            24h − limit left:{" "}
            {loading ? "…" : fmtUsd(data?.limits.withdrawalRemaining24h ?? MAX_WITHDRAWAL_24H)}
          </span>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${styles.tabPlus} ${tab === "deposit" ? styles.tabOnPlus : ""}`}
          onClick={() => setTab("deposit")}
        >
          <span className={styles.tabSign}>+</span> Deposit
        </button>
        <button
          type="button"
          className={`${styles.tab} ${styles.tabMinus} ${tab === "withdraw" ? styles.tabOnMinus : ""}`}
          onClick={() => setTab("withdraw")}
        >
          <span className={styles.tabSign}>−</span> Withdraw
        </button>
      </div>

      {tab === "withdraw" ? (
        <WalletWithdrawFlow
          key="withdraw"
          data={data}
          loading={loading}
          note={note}
          onNoteChange={setNote}
          onComplete={() => void load()}
          rail={rail}
        />
      ) : (
        <WalletDepositFlow
          key="deposit"
          data={data}
          loading={loading}
          note={note}
          onNoteChange={setNote}
          onComplete={() => void load()}
          rail={rail}
        />
      )}

      <div className={styles.historyHead}>
        <span className={styles.historyTitle}>
          {compact ? "Recent + / − for this client" : "Transaction ledger (+ / −)"}
        </span>
        {compact && (
          <Link href="/trade" className="btn btn-ghost btn-sm">
            All orders →
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "24px 0", display: "flex", justifyContent: "center" }}>
          <LoadingIndicator label="Loading ledger…" size="sm" />
        </div>
      ) : txs.length === 0 ? (
        <p className={styles.muted}>No + deposits or − withdrawals for this client yet.</p>
      ) : (
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>+/−</th>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance after</th>
              {!compact && <th>Note</th>}
            </tr>
          </thead>
          <tbody>
            {txs.map((t: WalletTransaction) => {
              const isIn = t.tx_type === "deposit";
              return (
                <tr key={t.id} className={isIn ? styles.rowIn : styles.rowOut}>
                  <td>
                    <span className={isIn ? styles.signCellPlus : styles.signCellMinus}>
                      {isIn ? "+" : "−"}
                    </span>
                  </td>
                  <td>{fmtDate(t.created_at)}</td>
                  <td>
                    <span className={isIn ? styles.badgeIn : styles.badgeOut}>
                      {isIn ? "Deposit" : "Withdrawal"}
                    </span>
                  </td>
                  <td className={isIn ? styles.amountIn : styles.amountOut}>
                    {isIn ? "+" : "−"}
                    {fmtUsd(Number(t.amount))}
                  </td>
                  <td>{t.balance_after != null ? fmtUsd(Number(t.balance_after)) : "—"}</td>
                  {!compact && <td className={styles.noteCell}>{t.note ?? "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
      </div>
    </div>
  );
}
