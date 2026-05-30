"use client";

import { useEffect, useRef, useState } from "react";
import type { WealthBookSummary } from "@/lib/api";
import { useDualProfiles } from "@/lib/hooks/useDualProfiles";
import styles from "./WalletBookSwitcher.module.css";

function shortName(book: WealthBookSummary) {
  const n = book.clientName ?? book.accountLabel.replace(/ — Managed$/, "");
  return n.length > 32 ? `${n.slice(0, 30)}…` : n;
}

function fmt(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function notifyWalletUpdated() {
  window.dispatchEvent(new Event("wallet-updated"));
}

export function WalletBookSwitcher() {
  const {
    clientBook,
    clientBooks,
    activeBook,
    selectPersonal,
    selectClient,
  } = useDualProfiles();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mode: "personal" | "client" =
    activeBook?.accountType === "client" ? "client" : "personal";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickPersonal = () => {
    setMenuOpen(false);
    void selectPersonal().then(notifyWalletUpdated);
  };

  const pickClient = (book: WealthBookSummary) => {
    setMenuOpen(false);
    void selectClient(book).then(notifyWalletUpdated);
  };

  return (
    <div className={styles.bar} role="region" aria-label="Switch wallet book">
      <span className={styles.label}>Switch wallet</span>

      <div className={styles.segments} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "personal"}
          className={`${styles.seg} ${mode === "personal" ? styles.segOn : ""}`}
          onClick={pickPersonal}
        >
          Personal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "client"}
          className={`${styles.seg} ${mode === "client" ? styles.segOn : ""}`}
          onClick={() => {
            if (clientBooks[0]) pickClient(clientBooks[0]);
          }}
          disabled={clientBooks.length === 0}
        >
          Client
        </button>
      </div>

      {mode === "client" && (
        <>
          {clientBooks.length === 0 ? (
            <p className={styles.empty}>No client books yet — add clients under Client management.</p>
          ) : (
            <div className={styles.picker} ref={menuRef}>
              <button
                type="button"
                className={styles.pickerBtn}
                aria-expanded={menuOpen}
                aria-haspopup="listbox"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className={styles.pickerCode}>{clientBook?.clientCode ?? "—"}</span>
                <span className={styles.pickerName}>
                  {clientBook ? shortName(clientBook) : "Select client"}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {menuOpen && (
                <div className={styles.menu} role="listbox" aria-label="Client wallets">
                  {clientBooks.map((b) => {
                    const on =
                      activeBook?.portfolioId === b.portfolioId ||
                      activeBook?.clientId === b.clientId;
                    return (
                      <button
                        key={b.portfolioId}
                        type="button"
                        role="option"
                        aria-selected={on}
                        className={`${styles.menuItem} ${on ? styles.menuItemOn : ""}`}
                        onClick={() => pickClient(b)}
                      >
                        <span className={styles.menuCode}>{b.clientCode ?? "—"}</span>
                        <span className={styles.menuLabel}>{shortName(b)}</span>
                        <span className={styles.menuAum}>{fmt(b.metrics.totalValue)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
