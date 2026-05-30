"use client";

import { useEffect, useState } from "react";
import { quantApi, type BSResult } from "@/lib/quantApi";
import { useQuantLabStore } from "@/lib/store/quantLab";
import { LiveBadge, QuantLabError } from "./QuantLabShared";
import { greekLabel } from "./quantLabLabels";
import styles from "./quant-lab.module.css";

type OptInputs = { S: number; K: number; T: number; r: number; sigma: number; type: "call" | "put" };

export function OptionsPricerTab({ engineOk }: { engineOk: boolean }) {
  const { activeSymbol, liveQuote, quantLabMode } = useQuantLabStore();
  const [opts, setOpts] = useState<OptInputs>({ S: 100, K: 100, T: 0.5, r: 0.05, sigma: 0.25, type: "call" });
  const [marketPrice, setMarketPrice] = useState(5.2);
  const [bs, setBs] = useState<BSResult | null>(null);
  const [iv, setIv] = useState<{ iv_pct: number; price_error: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const spot = liveQuote?.c;
    if (spot != null && spot > 0) {
      setOpts((o) => ({ ...o, S: spot }));
    }
  }, [activeSymbol, liveQuote?.c]);

  const runPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const priceRes = await quantApi.price(opts);
      setBs(priceRes.result);
      const ivRes = await quantApi.impliedVol({
        market_price: marketPrice,
        S: opts.S,
        K: opts.K,
        T: opts.T,
        r: opts.r,
        type: opts.type,
      });
      setIv({ iv_pct: ivRes.iv_pct, price_error: ivRes.price_error });
    } catch {
      setError("Pricing failed. Check that the quant engine is online.");
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
    <div className={styles.tabPanel}>
      <h2 className={styles.sectionHeader}>Options · Black–Scholes + IV</h2>
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
        <div>
          <label className={styles.label}>Mkt price (IV)</label>
          <input
            className={styles.input}
            type="number"
            step="any"
            value={marketPrice}
            onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
      <button type="button" className={styles.btn} disabled={loading || !engineOk} onClick={runPricing}>
        {loading ? "COMPUTING…" : "RUN PRICING"}
      </button>
      {error && <QuantLabError message={error} onRetry={runPricing} />}
      {bs && (
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Price</div>
            <div className={styles.metricValue}>${bs.price.toFixed(4)}</div>
          </div>
          {(["delta", "gamma", "theta", "vega"] as const).map((g) => (
            <div key={g} className={styles.metric}>
              <div className={styles.metricLabel}>{greekLabel(g, quantLabMode)}</div>
              <div className={styles.metricValue}>
                {g === "gamma" ? bs[g].toFixed(6) : bs[g].toFixed(4)}
              </div>
            </div>
          ))}
          {iv && (
            <div className={styles.metric}>
              <div className={styles.metricLabel}>{quantLabMode === "pro" ? "IV %" : "Implied Volatility"}</div>
              <div className={styles.metricValue}>{iv.iv_pct.toFixed(2)}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
