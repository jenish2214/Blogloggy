"use client";

import { useEffect, useState } from "react";
import { quantApi } from "@/lib/quantApi";
import { useQuantLabStore } from "@/lib/store/quantLab";
import type { ModelBenchmark } from "@/lib/quantApi";
import { LiveBadge, QuantLabError } from "./QuantLabShared";
import { greekLabel } from "./quantLabLabels";
import styles from "./quant-lab.module.css";

type OptInputs = { S: number; K: number; T: number; r: number; sigma: number; type: "call" | "put" };

export function MonteCarloTab({
  engineOk,
  benchmark,
}: {
  engineOk: boolean;
  benchmark: ModelBenchmark | null;
}) {
  const { activeSymbol, liveQuote, quantLabMode } = useQuantLabStore();
  const [opts, setOpts] = useState<OptInputs>({ S: 100, K: 100, T: 0.5, r: 0.05, sigma: 0.25, type: "call" });
  const [mc, setMc] = useState<{
    mc_price: number;
    bs_price: number;
    relative_error_pct: number;
    accuracy_grade: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const spot = liveQuote?.c;
    if (spot != null && spot > 0) {
      setOpts((o) => ({ ...o, S: spot }));
    }
  }, [activeSymbol, liveQuote?.c]);

  const runMc = async () => {
    setLoading(true);
    setError(null);
    try {
      const mcRes = await quantApi.monteCarlo({ ...opts, simulations: 80_000 });
      setMc(mcRes);
    } catch {
      setError("Monte Carlo simulation failed. Check that the quant engine is online.");
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: keyof OptInputs; label: string }[] = [
    { key: "S", label: greekLabel("S", quantLabMode) },
    { key: "K", label: greekLabel("K", quantLabMode) },
    { key: "T", label: greekLabel("T", quantLabMode) },
    { key: "r", label: greekLabel("r", quantLabMode) },
    { key: "sigma", label: greekLabel("sigma", quantLabMode) },
  ];

  return (
    <section className={styles.tabPanel}>
      <h2 className={styles.sectionHeader}>Monte Carlo · Antithetic</h2>
      <p className={styles.sectionSub}>Symbol: {activeSymbol}</p>
      <div className={styles.formRow}>
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label className={styles.label}>{label}</label>
            <div className={styles.inputWithBadge}>
              <input
                className={styles.input}
                type="number"
                step="any"
                value={opts[key] as number}
                onChange={(e) => setOpts({ ...opts, [key]: parseFloat(e.target.value) || 0 })}
              />
              {key === "S" && liveQuote?.c ? <LiveBadge price={liveQuote.c} /> : null}
            </div>
          </div>
        ))}
        <div>
          <label className={styles.label}>Type</label>
          <select
            className={styles.input}
            value={opts.type}
            onChange={(e) => setOpts({ ...opts, type: e.target.value as "call" | "put" })}
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </div>
      </div>
      <button type="button" className={styles.btn} disabled={loading || !engineOk} onClick={runMc}>
        {loading ? "SIMULATING…" : "RUN MONTE CARLO"}
      </button>
      {error && <QuantLabError message={error} onRetry={runMc} />}
      {mc ? (
        <>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>MC Price</div>
              <div className={styles.metricValue}>${mc.mc_price.toFixed(4)}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>BS Price</div>
              <div className={styles.metricValue}>${mc.bs_price.toFixed(4)}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{quantLabMode === "pro" ? "Rel. error" : "MC vs BS Error"}</div>
              <div className={styles.metricValue}>{mc.relative_error_pct.toFixed(4)}%</div>
            </div>
          </div>
          <p className={styles.cardHint}>
            Grade: <strong>{mc.accuracy_grade}</strong>
            {benchmark && quantLabMode === "pro" && (
              <> · Benchmark agreement {benchmark.model_agreement_pct.toFixed(2)}%</>
            )}
          </p>
        </>
      ) : (
        <p className={styles.emptyState}>Run simulation to compare MC vs closed-form Black–Scholes.</p>
      )}
    </section>
  );
}
