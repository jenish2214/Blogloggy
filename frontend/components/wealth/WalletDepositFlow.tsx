"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WalletSummaryResponse } from "@/lib/api";
import { walletApi } from "@/lib/api";
import { useToast } from "@/components/shared/ToastProvider";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { MAX_DEPOSIT_PER_TX, formatWalletLimit } from "@/lib/wealth/walletLimits";
import styles from "./WalletWithdrawFlow.module.css";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function notifyWalletUpdated() {
  window.dispatchEvent(new Event("wallet-updated"));
}

type Step = "amount" | "success";

export interface WalletDepositFlowProps {
  data: WalletSummaryResponse | null;
  loading: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onComplete: () => void;
  rail?: boolean;
}

export function WalletDepositFlow({
  data,
  loading,
  note,
  onNoteChange,
  onComplete,
  rail = false,
}: WalletDepositFlowProps) {
  const toast = useToast();
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [amountPulse, setAmountPulse] = useState(false);

  const bookParams = activeBook
    ? { portfolioId: activeBook.portfolioId, clientId: activeBook.clientId }
    : undefined;

  const parsed = Number(amount.replace(/,/g, ""));
  const cash = data?.book.cash ?? 0;
  const afterBalance = cash + (Number.isFinite(parsed) ? parsed : 0);

  const validation = useMemo(() => {
    if (!parsed || parsed <= 0) return { ok: false, message: "Enter deposit amount" };
    if (parsed > MAX_DEPOSIT_PER_TX) {
      return {
        ok: false,
        message: `Max ${formatWalletLimit(MAX_DEPOSIT_PER_TX)} per deposit`,
      };
    }
    return { ok: true, message: "Ready to record deposit" };
  }, [parsed]);

  useEffect(() => {
    if (!parsed) return;
    setAmountPulse(true);
    const t = window.setTimeout(() => setAmountPulse(false), 280);
    return () => window.clearTimeout(t);
  }, [parsed]);

  const confirmDeposit = async () => {
    if (!bookParams || !validation.ok) return;
    setSubmitting(true);
    toast.info("Processing deposit", `Recording ${fmtUsd(parsed)}…`);
    try {
      const res = await walletApi.deposit({ ...bookParams, amount: parsed, note });
      if (!res.success) {
        toast.error("Deposit failed", res.message ?? "Could not record deposit");
        return;
      }
      setStep("success");
      toast.success(
        "Deposit successful",
        `${fmtUsd(parsed)} added to ${activeBook?.label ?? "wallet"}`
      );
      await syncPortfolioFromCloud();
      notifyWalletUpdated();
      onComplete();
      window.setTimeout(() => {
        setStep("amount");
        setAmount("");
      }, 3500);
    } catch (e) {
      toast.error("Deposit failed", e instanceof Error ? e.message : "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className={styles.successBox}>
        <div className={styles.successIcon} aria-hidden>
          ✓
        </div>
        <h3 className={styles.successTitle}>Deposit complete</h3>
        <p className={styles.successSub}>
          {fmtUsd(parsed)} was added to {activeBook?.label}. New balance: {fmtUsd(afterBalance)}.
        </p>
      </div>
    );
  }

  return (
    <div className={rail ? styles.formCol : styles.wrap}>
      <div className={styles.formCol}>
        <div className={styles.steps} aria-hidden>
          <span className={`${styles.step} ${styles.stepActiveDeposit}`} />
          <span className={styles.step} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
          >
            <div className={`${styles.amountBox} ${styles.amountBoxDeposit}`}>
              <p className={styles.amountLabel}>Deposit amount (USD)</p>
              <input
                className={styles.amountInput}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Deposit amount"
              />
              <p className={styles.hint}>
                Max per deposit: {formatWalletLimit(MAX_DEPOSIT_PER_TX)}
              </p>
            </div>
            {!rail && (
              <input
                className="input"
                type="text"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
              />
            )}
            {!validation.ok && parsed > 0 ? (
              <p className={styles.warn}>{validation.message}</p>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-sm press-scale"
              style={{ width: "100%", fontWeight: 700 }}
              disabled={submitting || !validation.ok}
              onClick={() => void confirmDeposit()}
            >
              {submitting ? "Recording deposit…" : `+ Confirm deposit ${parsed > 0 ? fmtUsd(parsed) : ""}`}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {!rail && (
        <aside className={styles.preview} aria-live="polite" aria-atomic="true">
          <p className={styles.previewTitle}>Deposit preview</p>
          <p
            className={`${styles.previewAmount} ${styles.previewAmountDeposit} ${amountPulse ? styles.previewAmountPulse : ""}`}
          >
            {parsed > 0 ? `+${fmtUsd(parsed)}` : "—"}
          </p>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Current cash</span>
            <span className={styles.previewValue}>{loading ? "…" : fmtUsd(cash)}</span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>After deposit</span>
            <span className={styles.previewValue}>
              {parsed > 0 ? fmtUsd(afterBalance) : "—"}
            </span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Max per deposit</span>
            <span className={styles.previewValue}>{formatWalletLimit(MAX_DEPOSIT_PER_TX)}</span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Client book</span>
            <span className={styles.previewValue}>{activeBook?.label ?? "—"}</span>
          </div>
          {validation.ok && parsed > 0 ? (
            <div className={styles.statusOk}>{validation.message}</div>
          ) : parsed > 0 ? (
            <div className={styles.statusBad}>{validation.message}</div>
          ) : null}
        </aside>
      )}
    </div>
  );
}
