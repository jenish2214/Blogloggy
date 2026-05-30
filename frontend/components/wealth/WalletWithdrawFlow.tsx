"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WalletSummaryResponse } from "@/lib/api";
import { walletApi } from "@/lib/api";
import { useToast } from "@/components/shared/ToastProvider";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { MAX_WITHDRAWAL_24H, formatWalletLimit } from "@/lib/wealth/walletLimits";
import styles from "./WalletWithdrawFlow.module.css";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function notifyWalletUpdated() {
  window.dispatchEvent(new Event("wallet-updated"));
}

type Step = "amount" | "otp" | "success";

export interface WalletWithdrawFlowProps {
  data: WalletSummaryResponse | null;
  loading: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onComplete: () => void;
  rail?: boolean;
}

export function WalletWithdrawFlow({
  data,
  loading,
  note,
  onNoteChange,
  onComplete,
  rail = false,
}: WalletWithdrawFlowProps) {
  const toast = useToast();
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [amountPulse, setAmountPulse] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const bookParams = activeBook
    ? { portfolioId: activeBook.portfolioId, clientId: activeBook.clientId }
    : undefined;

  const parsed = Number(amount.replace(/,/g, ""));
  const cash = data?.book.cash ?? 0;
  const remaining24h = data?.limits.withdrawalRemaining24h ?? MAX_WITHDRAWAL_24H;
  const afterBalance = cash - (Number.isFinite(parsed) ? parsed : 0);

  const validation = useMemo(() => {
    if (!parsed || parsed <= 0) return { ok: false, message: "Enter withdrawal amount" };
    if (parsed > cash) return { ok: false, message: "Exceeds available cash" };
    if (parsed > remaining24h) return { ok: false, message: "Exceeds 24h limit" };
    return { ok: true, message: "Ready for verification" };
  }, [parsed, cash, remaining24h]);

  useEffect(() => {
    if (!parsed) return;
    setAmountPulse(true);
    const t = window.setTimeout(() => setAmountPulse(false), 280);
    return () => window.clearTimeout(t);
  }, [parsed]);

  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt || step !== "otp") return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, step]);

  const requestOtp = async () => {
    if (!bookParams || !validation.ok) return;
    setSubmitting(true);
    try {
      const res = await walletApi.requestWithdrawOtp({ ...bookParams, amount: parsed });
      if (!res.success) {
        toast.error("Verification failed", res.message);
        return;
      }
      setChallengeId(res.challengeId);
      setExpiresAt(res.expiresAt);
      setMaskedEmail(res.maskedEmail);
      setDemoCode(res.demoCode ?? null);
      setOtpDigits(["", "", "", "", "", ""]);
      setStep("otp");
      toast.info("Code sent", res.message);
    } catch (e) {
      toast.error("Could not send code", e instanceof Error ? e.message : "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  const otpValue = otpDigits.join("");

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const confirmWithdraw = async () => {
    if (!bookParams || !challengeId || otpValue.length !== 6) return;
    setSubmitting(true);
    try {
      const res = await walletApi.confirmWithdraw({
        ...bookParams,
        challengeId,
        otp: otpValue,
        note,
      });
      if (!res.success) {
        toast.error("Withdrawal failed", res.message);
        return;
      }
      setStep("success");
      toast.success(
        "Withdrawal successful",
        `${fmtUsd(res.amount ?? parsed)} from ${activeBook?.label ?? "wallet"}`
      );
      await syncPortfolioFromCloud();
      notifyWalletUpdated();
      onComplete();
      window.setTimeout(() => {
        setStep("amount");
        setAmount("");
        setChallengeId(null);
        setDemoCode(null);
      }, 4000);
    } catch (e) {
      toast.error("Withdrawal failed", e instanceof Error ? e.message : "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = step === "amount" ? 0 : step === "otp" ? 1 : 2;

  if (step === "success") {
    return (
      <div className={styles.successBox}>
        <div className={styles.successIcon} aria-hidden>
          ✓
        </div>
        <h3 className={styles.successTitle}>Withdrawal complete</h3>
        <p className={styles.successSub}>
          {fmtUsd(parsed)} was withdrawn from {activeBook?.label}. New balance:{" "}
          {fmtUsd(afterBalance >= 0 ? afterBalance : 0)}.
        </p>
      </div>
    );
  }

  return (
    <div className={rail ? styles.formCol : styles.wrap}>
      <div className={styles.formCol}>
        <div className={styles.steps} aria-hidden>
          <span className={`${styles.step} ${stepIndex >= 0 ? styles.stepActive : ""} ${stepIndex > 0 ? styles.stepDone : ""}`} />
          <span className={`${styles.step} ${stepIndex >= 1 ? styles.stepActive : ""} ${stepIndex > 1 ? styles.stepDone : ""}`} />
          <span className={`${styles.step} ${stepIndex >= 2 ? styles.stepActive : ""}`} />
        </div>

        <AnimatePresence mode="wait">
          {step === "amount" ? (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25 }}
            >
              <div className={styles.amountBox}>
                <p className={styles.amountLabel}>Withdrawal amount (USD)</p>
                <input
                  className={styles.amountInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Withdrawal amount"
                />
                <p className={styles.hint}>
                  24h limit left: {loading ? "…" : fmtUsd(remaining24h)}
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
                onClick={() => void requestOtp()}
              >
                {submitting ? "Sending code…" : "Send verification code →"}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25 }}
              className={styles.otpSection}
            >
              <h4 className={styles.otpTitle}>Enter verification code</h4>
              <p className={styles.otpSub}>
                We sent a 6-digit security code to <strong>{maskedEmail}</strong> to confirm this
                withdrawal of <strong>{fmtUsd(parsed)}</strong>.
              </p>
              {demoCode ? (
                <p className={styles.demoCode}>
                  Paper trading demo code: <strong>{demoCode}</strong>
                </p>
              ) : null}
              <div className={styles.otpInputs} role="group" aria-label="6-digit verification code">
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    className={styles.otpCell}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${i + 1}`}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>
              {secondsLeft > 0 ? (
                <p className={styles.timer}>Code expires in {Math.floor(secondsLeft / 60)}:
                  {(secondsLeft % 60).toString().padStart(2, "0")}
                </p>
              ) : (
                <p className={styles.warn}>Code expired. Go back and request a new one.</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setStep("amount");
                    setChallengeId(null);
                  }}
                >
                  ← Change amount
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm press-scale"
                  style={{ flex: 1, fontWeight: 700, color: "var(--down)" }}
                  disabled={submitting || otpValue.length !== 6 || secondsLeft <= 0}
                  onClick={() => void confirmWithdraw()}
                >
                  {submitting ? "Processing…" : `Confirm withdrawal ${fmtUsd(parsed)}`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!rail && (
        <aside className={styles.preview} aria-live="polite" aria-atomic="true">
          <p className={styles.previewTitle}>Withdrawal preview</p>
          <p
            className={`${styles.previewAmount} ${amountPulse ? styles.previewAmountPulse : ""}`}
          >
            {parsed > 0 ? `−${fmtUsd(parsed)}` : "—"}
          </p>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Available cash</span>
            <span className={styles.previewValue}>{loading ? "…" : fmtUsd(cash)}</span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>After withdrawal</span>
            <span className={styles.previewValue}>
              {parsed > 0 ? fmtUsd(Math.max(0, afterBalance)) : "—"}
            </span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>24h limit left</span>
            <span className={styles.previewValue}>
              {loading ? "…" : fmtUsd(remaining24h)}
            </span>
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
