"use client";

import { useEffect, useState } from "react";
import { useDualProfiles } from "@/lib/hooks/useDualProfiles";
import { loadBookSnapshot } from "@/lib/trading/loadBookSnapshot";
import type { PortfolioSnapshot } from "@/lib/trading/portfolioSnapshot";
import styles from "./ProfileDualOverview.module.css";

function fmtUsd(n: number) {
  const sign = n >= 0 ? "" : "−";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pnlCls(n: number) {
  return n >= 0 ? styles.up : styles.down;
}

const MANY_CLIENTS = 2;

/** Profile page: one active book in detail; second book as a slim row when many clients */
export function ProfileDualOverview() {
  const {
    personal,
    clientBook,
    clientBooks,
    isPersonalActive,
    isClientActive,
  } = useDualProfiles();

  const [personalSnap, setPersonalSnap] = useState<PortfolioSnapshot | null>(null);
  const [clientSnap, setClientSnap] = useState<PortfolioSnapshot | null>(null);

  const manyClients = clientBooks.length > MANY_CLIENTS;
  const compact = manyClients;

  useEffect(() => {
    if (personal) {
      void loadBookSnapshot({
        portfolioId: personal.portfolioId,
        clientId: null,
      }).then(setPersonalSnap);
    }
  }, [personal?.portfolioId]);

  useEffect(() => {
    if (clientBook) {
      void loadBookSnapshot({
        portfolioId: clientBook.portfolioId,
        clientId: clientBook.clientId,
      }).then(setClientSnap);
    } else {
      setClientSnap(null);
    }
  }, [clientBook?.portfolioId, clientBook?.clientId]);

  if (compact) {
    const activeType = isClientActive && !isPersonalActive ? "client" : "personal";
    const snap = activeType === "personal" ? personalSnap : clientSnap;
    const label =
      activeType === "personal"
        ? "Personal profile"
        : clientBook?.accountLabel ?? "Client profile";
    const inactiveLabel =
      activeType === "personal"
        ? clientBook
          ? `Client · ${clientBook.clientCode ?? clientBook.accountLabel}`
          : null
        : personal
          ? `Personal · ${fmtUsd(personal.metrics.totalValue)}`
          : null;

    return (
      <section className={styles.compactWrap}>
        <div
          className={`${styles.card} ${activeType === "personal" ? styles.personal : styles.client} ${styles.active}`}
        >
          <div className={styles.head}>
            <span className={activeType === "personal" ? styles.badgeP : styles.badgeC}>
              {activeType === "personal" ? "Personal" : "Client"}
            </span>
            <span className={styles.trading}>Active · use book bar above to switch</span>
          </div>
          <h3 className={styles.name}>{label}</h3>
          {snap ? (
            <div className={styles.stats}>
              <div>
                <span className={styles.statL}>Value</span>
                <span className={styles.statV}>{fmtUsd(snap.totalValue)}</span>
              </div>
              <div>
                <span className={styles.statL}>P&amp;L</span>
                <span className={`${styles.statV} ${pnlCls(snap.totalPnl)}`}>{fmtUsd(snap.totalPnl)}</span>
              </div>
              <div>
                <span className={styles.statL}>Cash</span>
                <span className={styles.statV}>{fmtUsd(snap.cash)}</span>
              </div>
              <div>
                <span className={styles.statL}>Orders</span>
                <span className={styles.statV}>{snap.orderCount}</span>
              </div>
            </div>
          ) : (
            <p className={styles.muted}>Loading…</p>
          )}
        </div>
        {inactiveLabel && (
          <p className={styles.inactiveHint}>
            Other book: {inactiveLabel} — switch via Clients rail in the top bar.
          </p>
        )}
      </section>
    );
  }

  const cards = [
    {
      type: "personal" as const,
      label: "Personal profile",
      snap: personalSnap,
      active: isPersonalActive,
    },
    {
      type: "client" as const,
      label: clientBook?.accountLabel ?? "Client profile",
      snap: clientSnap,
      active: isClientActive,
    },
  ];

  return (
    <section className={styles.grid}>
      {cards.map(({ type, label, snap, active }) => (
        <div
          key={type}
          className={`${styles.card} ${type === "personal" ? styles.personal : styles.client} ${active ? styles.active : ""}`}
        >
          <div className={styles.head}>
            <span className={type === "personal" ? styles.badgeP : styles.badgeC}>
              {type === "personal" ? "Personal" : "Client"}
            </span>
            {active && <span className={styles.trading}>Active for trading</span>}
          </div>
          <h3 className={styles.name}>{label}</h3>
          {!snap && type === "client" && !clientBook ? (
            <p className={styles.muted}>No client book — add one in Broker &amp; Clients.</p>
          ) : snap ? (
            <div className={styles.stats}>
              <div>
                <span className={styles.statL}>Value</span>
                <span className={styles.statV}>{fmtUsd(snap.totalValue)}</span>
              </div>
              <div>
                <span className={styles.statL}>P&amp;L</span>
                <span className={`${styles.statV} ${pnlCls(snap.totalPnl)}`}>{fmtUsd(snap.totalPnl)}</span>
              </div>
              <div>
                <span className={styles.statL}>Cash</span>
                <span className={styles.statV}>{fmtUsd(snap.cash)}</span>
              </div>
              <div>
                <span className={styles.statL}>Orders</span>
                <span className={styles.statV}>{snap.orderCount}</span>
              </div>
            </div>
          ) : (
            <p className={styles.muted}>Loading…</p>
          )}
        </div>
      ))}
    </section>
  );
}
