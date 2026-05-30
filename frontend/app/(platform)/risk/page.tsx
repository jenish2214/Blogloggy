"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { getDailyLossLimit, setDailyLossLimit } from "@/lib/features/riskLimits";
import { loadPortfolioSnapshot } from "@/lib/trading/portfolioSnapshot";
import { getBasicFinancials } from "@/lib/finnhub";
import styles from "@/components/features/features.module.css";

export default function RiskPage() {
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<
    Array<{
      symbol: string;
      marketValue: number;
      costBasis: number;
      unrealizedPnl: number;
      beta?: number;
    }>
  >([]);
  const [cash, setCash] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(2500);
  const [limitInput, setLimitInput] = useState("2500");

  useEffect(() => {
    const lim = getDailyLossLimit();
    setDailyLimit(lim);
    setLimitInput(String(lim));
  }, []);

  useEffect(() => {
    void loadPortfolioSnapshot().then((snap) => {
      setCash(snap.cash);
      setTotalValue(snap.totalValue);
      const pos = snap.positions.map((p) => ({
        symbol: p.symbol,
        marketValue: p.marketValue,
        costBasis: p.costBasis,
        unrealizedPnl: p.unrealizedPnl,
      }));
      setPositions(pos);
      setLoading(false);
      Promise.all(
        pos.map(async (p) => {
          const f = await getBasicFinancials(p.symbol);
          return { symbol: p.symbol, beta: f?.metric?.beta };
        })
      ).then((betas) => {
        setPositions((prev) =>
          prev.map((p) => ({
            ...p,
            beta: betas.find((b) => b.symbol === p.symbol)?.beta ?? 1,
          }))
        );
      });
    });
  }, [activeBook?.portfolioId]);

  const metrics = useMemo(() => {
    const tv = totalValue || 1;
    const rows = positions.map((p) => {
      const beta = p.beta ?? 1;
      const concentration = (p.marketValue / tv) * 100;
      const betaContrib = beta * (p.marketValue / tv);
      return { ...p, concentration, beta, betaContrib };
    });
    const maxConc = rows.reduce((m, r) => Math.max(m, r.concentration), 0);
    const portfolioBeta = rows.reduce((s, r) => s + r.betaContrib, 0);
    const atRisk = rows.reduce((s, r) => s + r.marketValue, 0);
    const dailyVol = 0.02;
    const var95 = atRisk * portfolioBeta * 1.65 * dailyVol;
    const stress5 = atRisk * portfolioBeta * 0.05;
    const topBeta = [...rows].sort((a, b) => b.betaContrib - a.betaContrib).slice(0, 5);

    const warnings: string[] = [];
    if (maxConc > 25) warnings.push(`Single-name concentration ${maxConc.toFixed(1)}% exceeds 25% guideline.`);
    if (portfolioBeta > 1.3) warnings.push(`Portfolio beta ${portfolioBeta.toFixed(2)} is aggressive vs market.`);
    if (cash / tv < 0.05) warnings.push("Cash buffer below 5% — limited dry powder for dips.");
    if (var95 > dailyLimit) {
      warnings.push(
        `1-day 95% VaR (~$${var95.toFixed(0)}) exceeds your $${dailyLimit.toLocaleString()} daily loss limit.`
      );
    }

    return {
      rows,
      maxConc,
      portfolioBeta,
      atRisk,
      var95,
      stress5,
      topBeta,
      warnings,
      cashPct: (cash / tv) * 100,
    };
  }, [positions, totalValue, cash, dailyLimit]);

  const saveLimit = () => {
    const n = Number(limitInput);
    if (!Number.isFinite(n) || n <= 0) return;
    setDailyLossLimit(n);
    setDailyLimit(n);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: 8 }}>Risk dashboard</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
        {activeBook ? (
          <>
            Book: <strong>{activeBook.label}</strong> — VaR, beta contribution, concentration, and limit
            checks (institutional desk view).
          </>
        ) : (
          "Select a book on Wealth Desk to scope risk to that account."
        )}
      </p>

      <div className={styles.panel} style={{ marginBottom: 16 }}>
        <h2 className={styles.title}>Daily loss limit</h2>
        <p className={styles.sub}>
          Used by earnings exposure alerts and VaR breach warnings. Stored locally on this device.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            type="number"
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            style={{ width: 140 }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={saveLimit}>
            Save limit
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Capital at risk", value: `$${metrics.atRisk.toLocaleString()}` },
          { label: "Portfolio beta", value: metrics.portfolioBeta.toFixed(2) },
          { label: "1-day VaR (95%)", value: `$${metrics.var95.toFixed(0)}` },
          { label: "Stress −5% mkt", value: `−$${metrics.stress5.toFixed(0)}` },
          { label: "Max concentration", value: `${metrics.maxConc.toFixed(1)}%` },
          { label: "Cash buffer", value: `${metrics.cashPct.toFixed(1)}%` },
        ].map((k) => (
          <div key={k.label} className={styles.panel} style={{ margin: 0 }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {k.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {metrics.warnings.length > 0 && (
        <div className={styles.panel} style={{ borderColor: "var(--down)" }}>
          <h2 className={styles.title}>Limit breaches & warnings</h2>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {metrics.warnings.map((w) => (
              <li key={w} style={{ marginBottom: 6, color: "var(--down)" }}>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.panel}>
        <h2 className={styles.title}>Beta contribution</h2>
        <p className={styles.sub}>
          Position beta × weight — how much each name drives portfolio volatility.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>β</th>
              <th>Weight</th>
              <th>Beta contrib</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {metrics.topBeta.map((r) => (
              <tr key={r.symbol}>
                <td>{r.symbol}</td>
                <td>{r.beta?.toFixed(2)}</td>
                <td>{r.concentration.toFixed(1)}%</td>
                <td>{(r.betaContrib * 100).toFixed(1)}% of β</td>
                <td>${r.marketValue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.title}>Position concentration</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Value</th>
              <th>% of book</th>
              <th>Unrealized P&L</th>
            </tr>
          </thead>
          <tbody>
            {metrics.rows.map((r) => (
              <tr key={r.symbol}>
                <td>{r.symbol}</td>
                <td>${r.marketValue.toLocaleString()}</td>
                <td>{r.concentration.toFixed(1)}%</td>
                <td style={{ color: r.unrealizedPnl >= 0 ? "var(--up)" : "var(--down)" }}>
                  {r.unrealizedPnl >= 0 ? "+" : ""}${r.unrealizedPnl.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {positions.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>
            No positions — <Link href="/trade">place a trade</Link> to see risk metrics.
          </p>
        )}
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 12 }}>
        <Link href="/portfolio">Portfolio heatmap</Link> ·{" "}
        <Link href="/">Earnings calendar</Link> uses the same daily loss limit for pre-event alerts.
      </p>
    </div>
  );
}
