"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/lib/auth/useSupabaseSession";
import { wealthApi } from "@/lib/api";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import styles from "./BookSwitcher.module.css";

export function BookSwitcher() {
  const { isAuthenticated, ready: sessionReady } = useSupabaseSession();
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const setActiveBook = useActiveBookStore((s) => s.setActiveBook);
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<
    Array<{
      portfolioId: string;
      clientId: string | null;
      accountType: "personal" | "client";
      accountLabel: string;
      clientCode: string | null;
      metrics: { totalValue: number };
    }>
  >([]);

  useEffect(() => {
    if (!hasSupabaseEnv() || !sessionReady || !isAuthenticated) return;
    wealthApi
      .getBooks()
      .then(({ books: list }) => {
        setBooks(list);
        const current = useActiveBookStore.getState().activeBook;
        if (!current) {
          const personal = list.find((b) => b.accountType === "personal");
          if (personal) {
            setActiveBook({
              portfolioId: personal.portfolioId,
              clientId: personal.clientId,
              accountType: "personal",
              label: personal.accountLabel,
            });
          }
        }
      })
      .catch(() => {});
  }, [sessionReady, isAuthenticated, setActiveBook]);

  const selectBook = async (book: (typeof books)[0]) => {
    setActiveBook({
      portfolioId: book.portfolioId,
      clientId: book.clientId,
      accountType: book.accountType,
      clientCode: book.clientCode ?? undefined,
      label: book.accountLabel,
    });
    setOpen(false);
    await syncPortfolioFromCloud();
  };

  const fmt = (n: number) =>
    n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <span className={styles.kicker}>Active book</span>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={styles.triggerLabel}>
            {activeBook?.label ?? "Personal Account"}
          </span>
          <span className={styles.triggerMeta}>
            {activeBook?.accountType === "client" ? "Client · managed" : "Personal · proprietary"}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className={styles.menu} role="listbox">
            {books.map((b) => (
              <button
                key={b.portfolioId}
                type="button"
                role="option"
                className={`${styles.option} ${activeBook?.portfolioId === b.portfolioId ? styles.optionActive : ""}`}
                onClick={() => selectBook(b)}
              >
                <span className={styles.optionName}>{b.accountLabel}</span>
                <span className={styles.optionSub}>
                  {b.accountType === "client" && b.clientCode ? `${b.clientCode} · ` : ""}
                  {fmt(b.metrics.totalValue)}
                </span>
              </button>
            ))}
            <Link href="/wealth" className={styles.manageLink} onClick={() => setOpen(false)}>
              Wealth Desk → manage all books
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
