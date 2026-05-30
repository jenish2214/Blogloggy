"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { suggestionsApi } from "@/lib/api";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/client";
import { useActiveBookStore } from "@/lib/store/activeBook";
import type { StockSuggestion } from "@/lib/trading/stockSuggestions";
import styles from "./NewUserStockSuggestions.module.css";

const DISMISS_KEY = "quantdesk-suggestions-dismissed-v1";

interface SuggestionsResponse {
  cash: number;
  bookLabel: string;
  isNewUser: boolean;
  suggestions: StockSuggestion[];
  totalSuggested?: number;
  cashAfterSuggestions?: number;
  reservePct?: number;
  disclaimer?: string;
  error?: string;
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function NewUserStockSuggestions() {
  const reduce = useReducedMotion();
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const load = useCallback(async (force = false) => {
    if (!hasSupabaseEnv()) {
      setGuest(true);
      setData(null);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setGuest(true);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setGuest(true);
      setData(null);
      setLoading(false);
      return;
    }

    if (!force && data) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const json = await suggestionsApi.getStocks(
        {
          portfolioId: activeBook?.portfolioId,
          clientId: activeBook?.clientId,
        },
        force
      );
      setData(json as SuggestionsResponse);
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        setGuest(true);
        setData(null);
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [activeBook?.portfolioId, activeBook?.clientId, data]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onWallet = () => void load(true);
    window.addEventListener("wallet-updated", onWallet);
    return () => window.removeEventListener("wallet-updated", onWallet);
  }, [load]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (dismissed || guest) return null;

  if (loading) {
    return (
      <motion.div
        className={styles.card}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.loading}>Loading suggestions for your wallet…</div>
      </motion.div>
    );
  }

  if (!data?.isNewUser || !data.suggestions?.length) return null;

  return (
    <motion.section
      className={styles.card}
      aria-labelledby="stock-suggestions-title"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.head}>
        <span className={styles.badge}>New here · Education</span>
        <h2 id="stock-suggestions-title" className={styles.title}>
          Money-wise stock ideas for your paper wallet
        </h2>
        <p className={styles.sub}>
          Sized from <strong>{data.bookLabel}</strong> cash — demo only, not real advice. Tap Trade to
          practice a buy with virtual money.
        </p>
        <div className={styles.cashRow}>
          <div className={styles.cashItem}>
            Available cash <div className={styles.cashVal}>{fmtUsd(data.cash)}</div>
          </div>
          {data.totalSuggested != null && (
            <div className={styles.cashItem}>
              Suggested deploy <div className={styles.cashVal}>{fmtUsd(data.totalSuggested)}</div>
            </div>
          )}
          {data.cashAfterSuggestions != null && (
            <div className={styles.cashItem}>
              Cash left (~{data.reservePct ?? 12}% reserve){" "}
              <div className={styles.cashVal}>{fmtUsd(data.cashAfterSuggestions)}</div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Price</th>
              <th>Suggested</th>
              <th>Est. cost</th>
              <th>% of cash</th>
              <th>Why (learn)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.suggestions.map((s) => (
              <tr key={s.symbol}>
                <td>
                  <span className={styles.sym}>{s.symbol}</span>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {s.name}
                  </div>
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>
                  {fmtUsd(s.price)}
                  <div className={s.changePct >= 0 ? styles.up : styles.down} style={{ fontSize: "0.68rem" }}>
                    {fmtPct(s.changePct)}
                  </div>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {s.suggestedShares} sh
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{fmtUsd(s.estimatedCost)}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{s.pctOfCash.toFixed(1)}%</td>
                <td className={styles.reason}>{s.reason}</td>
                <td>
                  <Link
                    href={`/trade?symbol=${encodeURIComponent(s.symbol)}`}
                    className="btn btn-primary btn-sm"
                  >
                    Trade
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.foot}>
        <p className={styles.note}>{data.disclaimer ?? "Paper trading only."}</p>
        <div className={styles.actions}>
          <Link href="/trade" className="btn btn-primary btn-sm">
            Open Trade Terminal
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </motion.section>
  );
}
