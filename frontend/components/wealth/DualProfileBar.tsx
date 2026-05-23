"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDualProfiles } from "@/lib/hooks/useDualProfiles";
import type { WealthBookSummary } from "@/lib/api";
import styles from "./DualProfileBar.module.css";

function fmt(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortName(book: WealthBookSummary) {
  const n = book.clientName ?? book.accountLabel.replace(/ — Managed$/, "");
  return n.length > 28 ? `${n.slice(0, 26)}…` : n;
}

interface DualProfileBarProps {
  variant?: "full" | "compact";
}

/** Institutional book rail — Jane Street / JP Morgan style single desk strip */
export function DualProfileBar({ variant = "full" }: DualProfileBarProps) {
  const {
    personal,
    clientBook,
    clientBooks,
    loading,
    isPersonalActive,
    isClientActive,
    selectPersonal,
    selectClient,
  } = useDualProfiles();

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const mode: "personal" | "client" = isPersonalActive ? "personal" : "client";
  const activeBook = mode === "personal" ? personal : clientBook;

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientBooks;
    return clientBooks.filter(
      (b) =>
        (b.clientCode ?? "").toLowerCase().includes(q) ||
        (b.clientName ?? "").toLowerCase().includes(q) ||
        b.accountLabel.toLowerCase().includes(q)
    );
  }, [clientBooks, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const m = activeBook?.metrics;
  const pnlUp = (m?.totalPnl ?? 0) >= 0;

  return (
    <header className={`${styles.desk} ${variant === "compact" ? styles.deskCompact : ""}`}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>QD</span>
          <div>
            <span className={styles.brandTitle}>QuantDesk</span>
            <span className={styles.brandSub}>Wealth Management Desk</span>
          </div>
        </div>

        <div className={styles.segments} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "personal"}
            className={`${styles.seg} ${mode === "personal" ? styles.segOn : ""}`}
            onClick={() => {
              setMenuOpen(false);
              void selectPersonal();
            }}
          >
            Proprietary
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "client"}
            className={`${styles.seg} ${mode === "client" ? styles.segOn : ""}`}
            onClick={() => {
              if (!isClientActive && clientBooks[0]) void selectClient(clientBooks[0]);
            }}
          >
            Client mandates
            {clientBooks.length > 0 && (
              <span className={styles.segCount}>{clientBooks.length}</span>
            )}
          </button>
        </div>

        {mode === "client" && clientBooks.length > 0 && (
          <div className={styles.picker} ref={menuRef}>
            <button
              type="button"
              className={styles.pickerBtn}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className={styles.pickerCode}>{clientBook?.clientCode ?? "—"}</span>
              <span className={styles.pickerName}>
                {clientBook ? shortName(clientBook) : "Select mandate"}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                {clientBooks.length > 6 && (
                  <input
                    className={styles.menuSearch}
                    placeholder="Search mandates…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                )}
                <ul className={styles.menuList}>
                  {filteredClients.map((b) => {
                    const on = clientBook?.portfolioId === b.portfolioId;
                    const up = b.metrics.totalPnl >= 0;
                    return (
                      <li key={b.portfolioId}>
                        <button
                          type="button"
                          className={`${styles.menuItem} ${on ? styles.menuItemOn : ""}`}
                          onClick={() => {
                            void selectClient(b);
                            setMenuOpen(false);
                            setQuery("");
                          }}
                        >
                          <span className={styles.menuCode}>{b.clientCode ?? "—"}</span>
                          <span className={styles.menuLabel}>{shortName(b)}</span>
                          <span className={styles.menuAum}>{fmt(b.metrics.totalValue, true)}</span>
                          <span className={up ? styles.menuUp : styles.menuDown}>
                            {up ? "+" : ""}
                            {fmt(b.metrics.totalPnl, true)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className={styles.metrics}>
          {activeBook ? (
            <>
              <div className={styles.metric}>
                <span className={styles.metricL}>AUM</span>
                <span className={styles.metricV}>{fmt(m!.totalValue)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricL}>P&amp;L</span>
                <span className={`${styles.metricV} ${pnlUp ? styles.up : styles.down}`}>
                  {(m!.totalPnl >= 0 ? "+" : "") + fmt(m!.totalPnl)}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricL}>Return</span>
                <span className={`${styles.metricV} ${m!.totalPnlPct >= 0 ? styles.up : styles.down}`}>
                  {(m!.totalPnlPct >= 0 ? "+" : "") + m!.totalPnlPct.toFixed(2)}%
                </span>
              </div>
            </>
          ) : (
            <span className={styles.metricEmpty}>No active book</span>
          )}
          {loading && <span className={styles.sync}>Live</span>}
        </div>

        <Link href="/desk" className={styles.manage}>
          Manage
        </Link>
      </div>
    </header>
  );
}
