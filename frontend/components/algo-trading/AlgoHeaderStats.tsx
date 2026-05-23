"use client";

import { useEffect, useState } from "react";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { getSymbolConfig } from "@/types/algoTrading";
import styles from "@/app/algo-trading/algo-trading.module.css";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtPrecise(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : ""}${fmtPrecise(n)}`;
}

export function AlgoHeaderStats() {
  const [clock, setClock] = useState("");
  const { engineStatus, openPosition, symbol, totalPnl: sessionPnl, closedTrades } = useAlgoTradingStore();
  const { totalValue, cash, totalPnl, positions } = usePortfolioStore();
  const liveFeed = useLivePricesOptional();

  const unrealized = liveFeed?.unrealizedTotal ?? Object.values(positions).reduce((s, p) => s + p.unrealizedPnl, 0);
  const bookPnl = liveFeed?.totalPnl ?? totalPnl;
  const nav = liveFeed?.totalValue ?? totalValue;

  const cfg = getSymbolConfig(symbol);
  const liveMkt =
    liveFeed?.livePrices[cfg.portfolioSymbol] ??
    positions[cfg.portfolioSymbol]?.currentPrice;

  const openAlgoPnl =
    openPosition && liveMkt != null
      ? (liveMkt - openPosition.entryPrice) * openPosition.size
      : null;

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const algoActive = engineStatus === "running";
  const updatedLabel = liveFeed?.lastUpdated
    ? liveFeed.lastUpdated.toLocaleTimeString("en-US", { hour12: false })
    : "—";

  const lastSessionPnl = closedTrades[closedTrades.length - 1]?.pnl;

  return (
    <div className={styles.statsRow}>
      {[
        { label: "Time", value: clock, mono: true },
        { label: "NAV (live)", value: fmt(nav), accent: true },
        {
          label: "Book P&L (live)",
          value: fmtSigned(bookPnl),
          positive: bookPnl >= 0,
          sub: "total vs $100k",
        },
        {
          label: "Unrealized (live)",
          value: fmtSigned(unrealized),
          positive: unrealized >= 0,
          sub: updatedLabel !== "—" ? `mkt ${updatedLabel}` : "awaiting quotes",
        },
        {
          label: "Session realized",
          value: fmtSigned(sessionPnl),
          positive: sessionPnl >= 0,
          sub: `${closedTrades.length} closed trade(s)`,
        },
        ...(openAlgoPnl != null
          ? [{
              label: "Open algo P&L",
              value: fmtSigned(openAlgoPnl),
              positive: openAlgoPnl >= 0,
              sub: `${symbol} · live mark`,
            }]
          : []),
        ...(lastSessionPnl != null
          ? [{
              label: "Last trade P&L",
              value: fmtSigned(lastSessionPnl),
              positive: lastSessionPnl >= 0,
              sub: "algo session",
            }]
          : []),
        { label: "Buying power", value: fmt(cash) },
        {
          label: liveFeed?.loading ? "Prices…" : "Live feed",
          value: algoActive ? "ENGINE ON" : updatedLabel,
          active: algoActive || !!liveFeed?.lastUpdated,
          mono: !algoActive,
        },
      ].map(({ label, value, mono, accent, positive, active, sub }) => (
        <div key={label} className="stat-card" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
          <div style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            marginTop: 4,
            fontFamily: mono ? "var(--font-mono)" : undefined,
            color: accent ? "var(--accent-2)" : positive === true ? "var(--up)" : positive === false ? "var(--down)" : active ? "var(--live)" : "var(--text-primary)",
          }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
