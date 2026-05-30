"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import { getSymbolConfig } from "@/types/algoTrading";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}${usd.format(Math.abs(n))}`;
}

function pnlClass(n: number) {
  return n >= 0 ? styles.livePnlUp : styles.livePnlDown;
}

export function PnLDashboard() {
  const {
    totalPnl: sessionPnl,
    winRate,
    sharpeRatio,
    maxDrawdown,
    closedTrades,
    cumulativePnl,
    openPosition,
    symbol,
    totalTrades,
  } = useAlgoTradingStore();
  const { totalPnl: bookPnl, totalValue, cash, positions } = usePortfolioStore();
  const liveFeed = useLivePricesOptional();

  const cfg = getSymbolConfig(symbol);
  const liveMark =
    liveFeed?.livePrices[cfg.portfolioSymbol] ??
    positions[cfg.portfolioSymbol]?.currentPrice;

  const unrealized = Object.values(positions).reduce((s, p) => s + p.unrealizedPnl, 0);
  const costBasis = Object.values(positions).reduce((s, p) => s + p.avgPrice * p.qty, 0);
  const marketValue = Object.values(positions).reduce((s, p) => s + p.currentPrice * p.qty, 0);

  const openAlgoPnl =
    openPosition && liveMark != null
      ? (liveMark - openPosition.entryPrice) * openPosition.size
      : null;

  const pnlChartData = useMemo(
    () => cumulativePnl.map((v, i) => ({ idx: i, pnl: v, label: i === 0 ? "Start" : `#${i}` })),
    [cumulativePnl]
  );

  const recentTrades = useMemo(() => closedTrades.slice(-25).reverse(), [closedTrades]);

  const liveMetrics = [
    { label: "Book total P&L", value: fmtSigned(bookPnl), tone: bookPnl },
    { label: "Unrealized (live)", value: fmtSigned(unrealized), tone: unrealized },
    { label: "NAV (live)", value: usd0.format(totalValue), tone: 1 },
    { label: "Cash wallet", value: usd0.format(cash), tone: 1 },
    { label: "Holdings basis", value: usd0.format(costBasis), tone: 1 },
    { label: "Holdings mkt", value: usd0.format(marketValue), tone: 1 },
  ];

  const sessionMetrics = [
    { label: "Session realized", value: fmtSigned(sessionPnl), tone: sessionPnl },
    { label: "Open algo P&L", value: openAlgoPnl != null ? fmtSigned(openAlgoPnl) : "—", tone: openAlgoPnl ?? 0 },
    { label: "Win rate", value: `${winRate.toFixed(1)}%`, tone: winRate >= 50 ? 1 : -1 },
    { label: "Trades", value: String(totalTrades), tone: 1 },
    { label: "Sharpe", value: sharpeRatio.toFixed(2), tone: sharpeRatio >= 1 ? 1 : -1 },
    { label: "Max drawdown", value: usd0.format(maxDrawdown), tone: -1 },
  ];

  return (
    <div className={styles.pnlColumn}>
      <div className={`card ${styles.panel} ${styles.panelActive}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Live book P&amp;L</span>
          <span className={styles.panelMeta}>
            {liveFeed?.lastUpdated
              ? `● ${liveFeed.lastUpdated.toLocaleTimeString()}`
              : "connecting"}
          </span>
        </div>
        <div className={styles.metricGrid}>
          {liveMetrics.map((m) => (
            <div key={m.label} className={styles.metricCard}>
              <div className={styles.metricLabel}>{m.label}</div>
              <div
                className={`${styles.metricValue} ${
                  m.label.includes("NAV") || m.label.includes("Cash") || m.label.includes("basis") || m.label.includes("mkt")
                    ? ""
                    : pnlClass(m.tone)
                }`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`card ${styles.panel}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Algo session P&amp;L</span>
          <span className={styles.panelMeta}>sim engine · closed trades</span>
        </div>
        <div className={styles.metricGrid}>
          {sessionMetrics.map((m) => (
            <div key={m.label} className={styles.metricCard}>
              <div className={styles.metricLabel}>{m.label}</div>
              <div
                className={`${styles.metricValue} ${
                  m.label === "Trades" || m.label === "Sharpe"
                    ? ""
                    : m.label === "Max drawdown"
                      ? styles.livePnlDown
                      : pnlClass(m.tone)
                }`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`card ${styles.panel} ${styles.panelActive}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Session cumulative P&amp;L</span>
          <span className={`${styles.panelMeta} ${pnlClass(sessionPnl)}`}>
            {fmtSigned(sessionPnl)} total
          </span>
        </div>
        <div className={styles.pnlChartArea}>
          {pnlChartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="idx" hide />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--algo-text-muted)", fontFamily: "var(--algo-font-mono)" }}
                  width={52}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--algo-bg-tertiary)",
                    border: "1px solid var(--algo-border)",
                    fontSize: 11,
                  }}
                  formatter={(value) => {
                    const v = typeof value === "number" ? value : Number(value);
                    return [usd.format(Number.isFinite(v) ? v : 0), "Session P&L"];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke={sessionPnl >= 0 ? "var(--up)" : "var(--down)"}
                  fill={sessionPnl >= 0 ? "var(--up-soft)" : "var(--down-soft)"}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className={styles.emptyRow}>Run the engine — cumulative P&amp;L builds after each closed trade.</p>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Closed trades · P&amp;L</span>
          <span className={styles.panelMeta}>{recentTrades.length} shown</span>
        </div>
        <div className={styles.tradesScroll}>
          <table className={styles.tradesTable}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Size</th>
                <th>P&amp;L</th>
                <th>%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.emptyRow}>
                    No closed algo trades yet — P&amp;L appears when the engine exits a position.
                  </td>
                </tr>
              ) : (
                recentTrades.map((t) => {
                  const pct =
                    t.entryPrice > 0
                      ? ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100
                      : 0;
                  return (
                    <tr key={t.id}>
                      <td>{fmtTime(t.exitTime)}</td>
                      <td className={styles.tradeSym}>{t.symbol}</td>
                      <td className={t.side === "BUY" ? styles.buyText : styles.sellText}>{t.side}</td>
                      <td>${t.entryPrice.toFixed(2)}</td>
                      <td>${t.exitPrice.toFixed(2)}</td>
                      <td>{t.size.toFixed(2)}</td>
                      <td className={pnlClass(t.pnl)}>{fmtSigned(t.pnl)}</td>
                      <td className={pnlClass(pct)}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</td>
                      <td>
                        <span className={t.status === "WIN" ? styles.badgeWin : styles.badgeLoss}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className={styles.disclaimer}>
        <strong>Charts</strong> use yfinance (Python). Algo desk runs <strong>7 days/week</strong> (no Sat/Sun block). Portfolio sync mirrors paper fills to your book.
      </p>
    </div>
  );
}
