"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { walletApi, type WalletSummaryResponse, type WalletTransaction } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { MAX_DEPOSIT_PER_TX, MAX_WITHDRAWAL_24H, formatWalletLimit } from "@/lib/wealth/walletLimits";
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

function notifyWalletUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wallet-updated"));
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
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const parsed = Number(amount.replace(/,/g, ""));
  const depositWarn = parsed > MAX_DEPOSIT_PER_TX;
  const withdrawOver24h =
    data && parsed > 0 && parsed > data.limits.withdrawalRemaining24h;

  const netFlow =
    (data?.stats.totalDeposits ?? 0) - (data?.stats.totalWithdrawals ?? 0);

  const handleSubmit = async () => {
    if (!bookParams || !parsed) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res =
        tab === "deposit"
          ? await walletApi.deposit({ ...bookParams, amount: parsed, note })
          : await walletApi.withdraw({ ...bookParams, amount: parsed, note });
      if (res.success) {
        setMsg({
          type: "ok",
          text:
            tab === "deposit"
              ? `+ ${fmtUsd(parsed)} added to ${activeBook?.label ?? "wallet"}`
              : `− ${fmtUsd(parsed)} removed from ${activeBook?.label ?? "wallet"}`,
        });
        setAmount("");
        setNote("");
        await syncPortfolioFromCloud();
        await load();
        notifyWalletUpdated();
      } else {
        setMsg({ type: "err", text: res.message ?? "Request failed" });
      }
    } catch (e) {
      setMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Wallet request failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const txs =
    compact || rail
      ? (data?.transactions ?? []).slice(0, rail ? 8 : 5)
      : data?.transactions ?? [];

  if (!activeBook) {
    return (
      <div className={nested ? styles.panelNested : styles.panel}>
        <p className={styles.muted}>Select a client in the desk bar to add (+) or remove (−) money.</p>
      </div>
    );
  }

  const clientTag =
    activeBook.accountType === "client"
      ? activeBook.clientCode ?? "Client"
      : "Personal";

  return (
    <div className={nested ? styles.panelNested : styles.panel}>
      <div className={rail ? styles.headRail : styles.head}>
        {!rail && (
          <div>
            <span className={styles.label}>
              {activeBook.accountType === "client" ? "Client wallet" : "Proprietary wallet"}
            </span>
            <h3 className={styles.title}>
              {activeBook.label}
              <span className={styles.clientTag}>{clientTag}</span>
            </h3>
          </div>
        )}
        {rail && (
          <p className={styles.railBook}>
            {activeBook.label}
            <span className={styles.clientTag}>{clientTag}</span>
          </p>
        )}
        <div className={styles.balance}>
          <span className={styles.balanceL}>Cash balance</span>
          <span className={styles.balanceV}>
            {loading ? "…" : fmtUsd(data?.book.cash ?? 0)}
          </span>
        </div>
      </div>

      {!loading && data && !rail && (
        <div className={styles.summary}>
          <div className={`${styles.sumCard} ${styles.sumPlus}`}>
            <span className={styles.sumSign}>+</span>
            <span className={styles.sumLabel}>Money in (deposits)</span>
            <span className={styles.sumVal}>{fmtUsd(data.stats.totalDeposits)}</span>
            <span className={styles.sumMeta}>{data.stats.depositCount} deposit{data.stats.depositCount !== 1 ? "s" : ""}</span>
          </div>
          <div className={`${styles.sumCard} ${styles.sumMinus}`}>
            <span className={styles.sumSign}>−</span>
            <span className={styles.sumLabel}>Money out (withdrawals)</span>
            <span className={styles.sumVal}>{fmtUsd(data.stats.totalWithdrawals)}</span>
            <span className={styles.sumMeta}>{data.stats.withdrawalCount} withdrawal{data.stats.withdrawalCount !== 1 ? "s" : ""}</span>
          </div>
          <div className={styles.sumCard}>
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

      <div className={styles.form}>
        <input
          className="input"
          type="text"
          inputMode="decimal"
          placeholder="Amount (USD)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {!rail && (
          <input
            className="input"
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
        {depositWarn && tab === "deposit" && (
          <p className={styles.warn}>
            Max {formatWalletLimit(MAX_DEPOSIT_PER_TX)} per deposit.
          </p>
        )}
        {withdrawOver24h && tab === "withdraw" && (
          <p className={styles.warn}>
            24h limit — {fmtUsd(data!.limits.withdrawalRemaining24h)} left today.
          </p>
        )}
        {msg && <p className={msg.type === "ok" ? styles.ok : styles.warn}>{msg.text}</p>}
        <button
          type="button"
          className={tab === "deposit" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          style={tab === "withdraw" ? { width: "100%", fontWeight: 700, color: "var(--down)" } : { width: "100%" }}
          disabled={
            submitting ||
            !parsed ||
            (tab === "deposit" && depositWarn) ||
            (tab === "withdraw" && !!withdrawOver24h)
          }
          onClick={() => void handleSubmit()}
        >
          {submitting
            ? "Processing…"
            : tab === "deposit"
              ? "+ Record deposit"
              : "− Process withdrawal"}
        </button>
      </div>

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
        <p className={styles.muted}>Loading…</p>
      ) : txs.length === 0 ? (
        <p className={styles.muted}>No + deposits or − withdrawals for this client yet.</p>
      ) : (
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
      )}
    </div>
  );
}
