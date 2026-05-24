"use client";

import { useCallback, useEffect, useState } from "react";
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
import { quantApi, type BSResult, type ModelBenchmark } from "@/lib/quantApi";
import { PredictionsHub } from "./PredictionsHub";
import styles from "./quant-lab.module.css";

type OptInputs = { S: number; K: number; T: number; r: number; sigma: number; type: "call" | "put" };
const DEFAULT_OPTS: OptInputs = { S: 100, K: 100, T: 0.5, r: 0.05, sigma: 0.25, type: "call" };

export function QuantLabDashboard() {
  const [engineOk, setEngineOk] = useState<boolean | null>(null);
  const [benchmark, setBenchmark] = useState<ModelBenchmark | null>(null);
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const [bs, setBs] = useState<BSResult | null>(null);
  const [mc, setMc] = useState<{
    mc_price: number;
    bs_price: number;
    relative_error_pct: number;
    accuracy_grade: string;
  } | null>(null);
  const [iv, setIv] = useState<{ iv_pct: number; price_error: number } | null>(null);
  const [marketPrice, setMarketPrice] = useState(5.2);

  const [symbol, setSymbol] = useState("AAPL");
  const [strategy, setStrategy] = useState<"sma_cross" | "rsi" | "momentum" | "buy_hold">("sma_cross");
  const [bt, setBt] = useState<Awaited<ReturnType<typeof quantApi.backtest>> | null>(null);
  const [btLoading, setBtLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEngine = useCallback(async () => {
    try {
      await quantApi.health();
      const v = await quantApi.validateModels();
      setEngineOk(true);
      setBenchmark(v.benchmark);
      setError(null);
    } catch (e) {
      setEngineOk(false);
      setBenchmark(null);
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadEngine();
  }, [loadEngine]);

  const runPricing = async () => {
    setPricingLoading(true);
    setError(null);
    try {
      const [priceRes, mcRes] = await Promise.all([
        quantApi.price(opts),
        quantApi.monteCarlo({ ...opts, simulations: 80_000 }),
      ]);
      setBs(priceRes.result);
      setMc(mcRes);
      const ivRes = await quantApi.impliedVol({
        market_price: marketPrice,
        S: opts.S,
        K: opts.K,
        T: opts.T,
        r: opts.r,
        type: opts.type,
      });
      setIv({ iv_pct: ivRes.iv_pct, price_error: ivRes.price_error });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPricingLoading(false);
    }
  };

  const runBacktest = async () => {
    setBtLoading(true);
    setError(null);
    try {
      const { chart } = await marketApi.getChart(symbol, "1y", "1d");
      const prices = chart.candles.map((c) => c.close);
      if (prices.length < 30) throw new Error("Not enough price history");
      const result = await quantApi.backtest({ prices, strategy, sma_short: 20, sma_long: 50 });
      setBt(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBtLoading(false);
    }
  };

  const agreement = benchmark?.model_agreement_pct ?? null;

  const equityData =
    bt?.equity_curve.map((value, i) => ({ i, value })) ?? [];

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>QuantDesk · Quant Engine v2</p>
          <h1 className={styles.title}>Quant Lab</h1>
          <p className={styles.sub}>
            SciPy Black–Scholes, antithetic Monte Carlo, Sortino / Calmar / VaR backtests.
            Built for quants and engineers — paper trading only.
          </p>
        </div>
        <div className={styles.badgeRow}>
          <span className={engineOk ? styles.badgeOk : styles.badgeWarn}>
            {engineOk === null ? "CHECKING ENGINE…" : engineOk ? "ENGINE ONLINE" : "ENGINE OFFLINE"}
          </span>
          {agreement != null && (
            <span className={benchmark?.target_met ? styles.badgeOk : styles.badge}>
              MODEL AGREEMENT {agreement.toFixed(2)}%
            </span>
          )}
          <span className={styles.badge}>NUMPY · SCIPY · SKLEARN</span>
        </div>
      </header>

      {error && (
        <p className={styles.error}>
          {error}
          {engineOk === false && (
            <span>
              {" "}
              {error?.includes("not_configured") || error?.includes("not_deployed") ? (
                <>
                  Deploy the Python engine on{" "}
                  <a
                    href="https://dashboard.render.com/blueprint/new?repo=https://github.com/jenish2214/Blogloggy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Render (Blueprint)
                  </a>{" "}
                  and set <code>QUANT_SERVICE_URL</code> on Vercel — or locally run{" "}
                  <code>npm run dev</code> (starts quant on port 8000).
                </>
              ) : (
                <>
                  Start the Python engine locally (
                  <code>npm run dev</code>) or check <code>QUANT_SERVICE_URL</code> on Vercel.
                </>
              )}
            </span>
          )}
        </p>
      )}

      <PredictionsHub engineOk={engineOk === true} />

      <div className={styles.grid}>
        {/* Options pricer */}
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Options · Black–Scholes + IV</h2>
          <div className={styles.formRow}>
            {(
              [
                ["S", "Spot"],
                ["K", "Strike"],
                ["T", "Years"],
                ["r", "Rate"],
                ["sigma", "Vol σ"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className={styles.label}>{label}</label>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  value={opts[key]}
                  onChange={(e) => setOpts({ ...opts, [key]: parseFloat(e.target.value) || 0 })}
                />
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
          <button type="button" className={styles.btn} disabled={pricingLoading || !engineOk} onClick={runPricing}>
            {pricingLoading ? "COMPUTING…" : "RUN PRICING"}
          </button>
          {bs && (
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Price</div>
                <div className={styles.metricValue}>${bs.price.toFixed(4)}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Δ Delta</div>
                <div className={styles.metricValue}>{bs.delta.toFixed(4)}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Γ Gamma</div>
                <div className={styles.metricValue}>{bs.gamma.toFixed(6)}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Θ Theta</div>
                <div className={styles.metricValue}>{bs.theta.toFixed(4)}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>ν Vega</div>
                <div className={styles.metricValue}>{bs.vega.toFixed(4)}</div>
              </div>
              {iv && (
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>IV %</div>
                  <div className={styles.metricValue}>{iv.iv_pct.toFixed(2)}%</div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Monte Carlo */}
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Monte Carlo · Antithetic</h2>
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
                  <div className={styles.metricLabel}>Rel. error</div>
                  <div className={styles.metricValue}>{mc.relative_error_pct.toFixed(4)}%</div>
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 12 }}>
                Grade: <strong>{mc.accuracy_grade}</strong>
                {benchmark && (
                  <>
                    {" "}
                    · Benchmark agreement {benchmark.model_agreement_pct.toFixed(2)}% (target &lt;1% MC vs BS
                    error)
                  </>
                )}
              </p>
            </>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Run pricing to compare MC vs closed-form.</p>
          )}
        </section>

        {/* Backtest */}
        <section className={styles.panel} style={{ gridColumn: "1 / -1" }}>
          <h2 className={styles.panelTitle}>Strategy backtest · Pro metrics</h2>
          <div className={styles.formRow}>
            <div>
              <label className={styles.label}>Symbol</label>
              <input className={styles.input} value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
            </div>
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
          <button type="button" className={styles.btn} disabled={btLoading || !engineOk} onClick={runBacktest}>
            {btLoading ? "BACKTESTING…" : "RUN BACKTEST (1Y)"}
          </button>
          {bt && (
            <>
              <div className={styles.metrics}>
                {[
                  ["Return", `${bt.total_return_pct.toFixed(2)}%`],
                  ["Sharpe", bt.sharpe_ratio.toFixed(3)],
                  ["Sortino", bt.sortino_ratio.toFixed(3)],
                  ["Calmar", bt.calmar_ratio.toFixed(3)],
                  ["Max DD", `${bt.max_drawdown_pct.toFixed(2)}%`],
                  ["VaR 95", `${bt.var_95_day_pct.toFixed(3)}%`],
                  ["CVaR 95", `${bt.cvar_95_day_pct.toFixed(3)}%`],
                  ["Win rate", `${bt.win_rate_pct.toFixed(1)}%`],
                  ["Trades", String(bt.trades)],
                ].map(([label, val]) => (
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
        </section>
      </div>

      <p className={styles.disclaimer}>
        Model agreement measures consistency between Black–Scholes and Monte Carlo on the same inputs — not
        future market accuracy. No live trading. Start the Python service:{" "}
        <code>cd quant-service && pip install -r requirements.txt && uvicorn main:app --port 8000</code>
      </p>
    </div>
  );
}
