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
  ReferenceLine,
} from "recharts";
import { marketApi } from "@/lib/api";
import { quantApi, type PredictSuiteResult } from "@/lib/quantApi";
import { useQuantLabStore } from "@/lib/store/quantLab";
import { ExplainerPanel, QuantLabError } from "./QuantLabShared";
import { sentimentTag } from "./quantLabLabels";
import styles from "./quant-lab.module.css";

function signalClass(sig: string) {
  const s = sig.toLowerCase();
  if (s.includes("buy") || s === "bullish") return styles.signalBuy;
  if (s.includes("sell") || s === "bearish") return styles.signalSell;
  return styles.signalNeutral;
}

export function PredictionsHub({ engineOk }: { engineOk: boolean }) {
  const { activeSymbol, liveQuote, quantLabMode } = useQuantLabStore();
  const [horizon, setHorizon] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suite, setSuite] = useState<PredictSuiteResult | null>(null);

  const runAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { chart } = await marketApi.getChart(activeSymbol, "1y", "1d");
      const prices = chart.candles.map((c) => c.close);
      const volumes = chart.candles.map((c) => c.volume);
      const res = await quantApi.predictSuite({
        prices,
        volumes,
        symbol: activeSymbol,
        horizon_days: horizon,
      });
      setSuite(res);
    } catch {
      setError("Predictions failed. Check symbol and quant engine.");
      setSuite(null);
    } finally {
      setLoading(false);
    }
  };

  const splitIndex = suite?.chart.historical.length ?? 0;
  const chartData = suite
    ? [
        ...suite.chart.historical.map((p) => ({
          i: p.i,
          hist: p.price,
          fc: null as number | null,
        })),
        ...suite.chart.forecast.map((p) => ({
          i: p.i,
          hist: splitIndex > 0 ? suite.chart.historical[splitIndex - 1]?.price ?? null : null,
          fc: p.price,
        })),
      ]
    : [];

  const displaySignal = (sig: string) => {
    if (quantLabMode === "beginner") return sentimentTag(sig.includes("bull") ? 60 : sig.includes("bear") ? 0 : 30, sig.includes("bear") ? 60 : 0);
    return sig.replace("_", " ").toUpperCase();
  };

  return (
    <section className={styles.tabPanel}>
      <h2 className={styles.sectionHeader}>Predictions · Algorithms + ML</h2>
      <p className={styles.sectionSub}>
        RSI, SMA, MACD, Bollinger plus Ridge, Random Forest, and Gradient Boosting on 1Y daily data for{" "}
        <strong>{activeSymbol}</strong>
        {liveQuote?.c != null && liveQuote.c > 0 ? ` (live $${liveQuote.c.toFixed(2)})` : ""}.
      </p>

      <div className={styles.formRow}>
        <div>
          <label className={styles.label}>Forecast days</label>
          <select
            className={styles.input}
            value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value, 10))}
          >
            {[1, 3, 5, 7, 10].map((d) => (
              <option key={d} value={d}>
                {d}d
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="button" className={styles.btn} disabled={loading || !engineOk} onClick={runAll}>
        {loading ? "RUNNING ALL MODELS…" : "RUN ALL PREDICTIONS"}
      </button>

      {error && <QuantLabError message={error} onRetry={runAll} />}

      {suite && (
        <>
          <div className={styles.heroMetrics}>
            <div className={styles.heroCard}>
              <div className={styles.metricLabel}>Spot</div>
              <div className={styles.heroValue}>${suite.current_price.toFixed(2)}</div>
            </div>
            <div className={styles.heroCard}>
              <div className={styles.metricLabel}>{suite.horizon_days}D forecast</div>
              <div className={styles.heroValue}>${suite.predicted_price.toFixed(2)}</div>
              <div className={suite.predicted_change_pct >= 0 ? styles.upText : styles.downText}>
                {suite.predicted_change_pct >= 0 ? "+" : ""}
                {suite.predicted_change_pct.toFixed(2)}%
              </div>
            </div>
            <div className={styles.heroCard}>
              <div className={styles.metricLabel}>{quantLabMode === "pro" ? "ML direction" : "ML Signal"}</div>
              <div className={`${styles.heroValue} ${signalClass(suite.direction)}`}>
                {displaySignal(suite.direction)}
              </div>
            </div>
            <div className={styles.heroCard}>
              <div className={styles.metricLabel}>Ensemble</div>
              <div className={`${styles.heroValue} ${signalClass(suite.ensemble.signal)}`}>
                {displaySignal(suite.ensemble.signal)}
              </div>
              <div className={styles.metricLabel}>{suite.ensemble.confidence_pct}% conf.</div>
            </div>
            <div className={styles.heroCard}>
              <div className={styles.metricLabel}>Algo composite</div>
              <div className={`${styles.heroValue} ${signalClass(suite.algorithm.composite)}`}>
                {displaySignal(suite.algorithm.composite)}
              </div>
            </div>
          </div>

          <div className={styles.chartWrapTall}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="i" hide />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={64} />
                <ReferenceLine x={splitIndex - 0.5} stroke="var(--warn)" strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Price"]}
                />
                <Line type="monotone" dataKey="hist" stroke="var(--accent)" dot={false} strokeWidth={2} connectNulls={false} />
                <Line type="monotone" dataKey="fc" stroke="var(--warn)" strokeDasharray="6 4" dot={false} strokeWidth={2} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className={styles.subPanelTitle}>Daily price path (Ridge ML)</h3>
          <div className={styles.pathRow}>
            {suite.predictions.map((p) => (
              <div key={p.day} className={styles.pathChip}>
                <span className={styles.metricLabel}>D+{p.day}</span>
                <strong>${p.price.toFixed(2)}</strong>
                <span className={p.change_pct >= 0 ? styles.upText : styles.downText}>
                  {p.change_pct >= 0 ? "+" : ""}
                  {p.change_pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          <h3 className={styles.subPanelTitle}>All models & signals</h3>
          <div className={styles.tableWrap}>
            <table className={styles.predTable}>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Signal / metric</th>
                  <th>Confidence / accuracy</th>
                </tr>
              </thead>
              <tbody>
                {suite.all_signals.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>
                      <span className={row.family === "machine_learning" ? styles.mlTag : styles.algoTag}>
                        {row.family === "machine_learning" ? "ML" : "ALGO"}
                      </span>
                    </td>
                    <td className={signalClass(String(row.signal))}>
                      {String(row.signal).toUpperCase()} · {row.value}
                    </td>
                    <td>{row.confidence_pct != null ? `${row.confidence_pct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className={styles.subPanelTitle}>ML model holdout metrics</h3>
          <div className={styles.metrics}>
            {suite.models.map((m) => (
              <div key={m.name} className={styles.metric}>
                <div className={styles.metricLabel}>{m.name}</div>
                <div className={styles.metricValue} style={{ fontSize: "0.85rem" }}>
                  {m.task === "direction"
                    ? `Acc ${m.holdout_accuracy_pct?.toFixed(1) ?? "—"}%`
                    : `MAPE ${m.holdout_mape_pct?.toFixed(2) ?? "—"}%`}
                </div>
                {m.confidence_pct != null && (
                  <div className={styles.metricLabel}>{m.confidence_pct}% conf.</div>
                )}
              </div>
            ))}
          </div>

          <p className={styles.disclaimerInline}>{suite.disclaimer}</p>
        </>
      )}

      <ExplainerPanel mode={quantLabMode}>
        <p>Forecasts blend rule-based signals with ML models trained on historical prices. Not investment advice.</p>
      </ExplainerPanel>
    </section>
  );
}
