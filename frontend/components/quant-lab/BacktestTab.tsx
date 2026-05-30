"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { marketApi } from "@/lib/api";
import { quantApi } from "@/lib/quantApi";
import { useQuantLabStore } from "@/lib/store/quantLab";
import { QuantLabError } from "./QuantLabShared";
import styles from "./quant-lab.module.css";

export function BacktestTab({ engineOk }: { engineOk: boolean }) {
  const { activeSymbol, quantLabMode } = useQuantLabStore();
  const [strategy, setStrategy] = useState<"sma_cross" | "rsi" | "momentum" | "buy_hold">("sma_cross");
  const [bt, setBt] = useState<Awaited<ReturnType<typeof quantApi.backtest>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const { chart } = await marketApi.getChart(activeSymbol, "1y", "1d");
      const prices = chart.candles.map((c) => c.close);
      if (prices.length < 30) throw new Error("Not enough price history");
      const result = await quantApi.backtest({ prices, strategy, sma_short: 20, sma_long: 50 });
      setBt(result);
    } catch {
      setError("Backtest failed. Check symbol and quant engine.");
    } finally {
      setLoading(false);
    }
  };

  const equityData = bt?.equity_curve.map((value, i) => ({ i, value })) ?? [];

  const metrics: [string, string][] = bt
    ? [
        ["Return", `${bt.total_return_pct.toFixed(2)}%`],
        ["Sharpe", bt.sharpe_ratio.toFixed(3)],
        ["Sortino", bt.sortino_ratio.toFixed(3)],
        ["Calmar", bt.calmar_ratio.toFixed(3)],
        ["Max DD", `${bt.max_drawdown_pct.toFixed(2)}%`],
        ["VaR 95", `${bt.var_95_day_pct.toFixed(3)}%`],
        ["CVaR 95", `${bt.cvar_95_day_pct.toFixed(3)}%`],
        ["Win rate", `${bt.win_rate_pct.toFixed(1)}%`],
        ["Trades", String(bt.trades)],
      ]
    : [];

  return (
    <div className={styles.tabPanel}>
      <h2 className={styles.sectionHeader}>Strategy Backtest</h2>
      <p className={styles.sectionSub}>Symbol: {activeSymbol} · 1Y daily history</p>
      <div className={styles.formRow}>
        <div>
          <label className={styles.label}>Strategy</label>
          <select
            className={styles.input}
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as typeof strategy)}
          >
            <option value="sma_cross">SMA Cross (20/50)</option>
            <option value="rsi">RSI (30/70)</option>
            <option value="momentum">Momentum</option>
            <option value="buy_hold">Buy & Hold</option>
          </select>
        </div>
      </div>
      <button type="button" className={styles.btn} disabled={loading || !engineOk} onClick={runBacktest}>
        {loading ? "BACKTESTING…" : "RUN BACKTEST (1Y)"}
      </button>
      {error && <QuantLabError message={error} onRetry={runBacktest} />}
      {bt && (
        <>
          <div className={styles.metrics}>
            {metrics.map(([label, val]) => (
              <div key={label} className={styles.metric}>
                <div className={styles.metricLabel}>{label}</div>
                <div className={styles.metricValue}>{val}</div>
              </div>
            ))}
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={56} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
