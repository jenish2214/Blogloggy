"use client";
import { useState, useRef, useEffect } from "react";
import { tradingApi } from "@/lib/api";
import { WORLD_MARKETS, type MarketRegion, inferCountryFromSymbol } from "@/lib/markets/world-markets";
import { PriceChart } from "@/components/trading/PriceChart";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Strategy { name: string; totalReturn: number; annualReturn: number; equityCurve: { time: number; value: number }[]; startPrice?: number; endPrice?: number; }
interface BacktestFull {
  symbol: string; range: string;
  startPrice: number; endPrice: number;
  totalReturn: number; annualReturn: number; annualVolatility: number;
  sharpeRatio: number; sortinoRatio?: number; maxDrawdown: number;
  var95Day?: number; cvar95Day?: number; tradingDays: number;
  equityCurve: { time: number; value: number }[];
  rollingSharpe?: { time: number; sharpe: number }[];
  distribution?: { mid: number; count: number }[];
  strategies?: { buyAndHold: Strategy; smaCross: Strategy | null; rsi: Strategy | null; momentum: Strategy | null };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function sign(n: number) { return n >= 0 ? "+" : ""; }

/* ── Animated counter hook ───────────────────────────────────────────────── */
function useCountUp(target: number, duration = 800, trigger: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((target * ease).toFixed(2)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, trigger, duration]);
  return val;
}

/* ── KPI card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, animate, delay = 0 }: { label: string; value: string; sub?: string; color?: string; animate?: boolean; delay?: number }) {
  return (
    <div className={`stat-card anim-fade-up`} style={{ animationDelay: `${delay}ms` }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
      <div className={animate ? "anim-count" : ""} style={{ fontFamily: "var(--font-mono)", fontSize: "1.35rem", fontWeight: 700, color: color ?? "var(--text-primary)", lineHeight: 1, marginBottom: sub ? 6 : 0 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.04em" }}>{sub}</div>}
    </div>
  );
}

/* ── Equity curve SVG ────────────────────────────────────────────────────── */
function EquityChart({ curves, showAll }: { curves: { label: string; data: { time: number; value: number }[]; color: string }[]; showAll: boolean }) {
  const visibleCurves = showAll ? curves : curves.slice(0, 1);
  if (!visibleCurves[0]?.data.length) return null;
  const allVals = visibleCurves.flatMap((c) => c.data.map((d) => d.value));
  const min = Math.min(...allVals), max = Math.max(...allVals), range = max - min || 1;
  const W = 900, H = 260, PAD = { top: 12, right: 12, bottom: 28, left: 72 };
  const iW = W - PAD.left - PAD.right, iH = H - PAD.top - PAD.bottom;
  const primary = visibleCurves[0].data;
  const toX = (i: number, len: number) => PAD.left + (i / Math.max(len - 1, 1)) * iW;
  const toY = (v: number) => PAD.top + iH - ((v - min) / range) * iH;

  // Y-axis ticks
  const ticks = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max];
  // X-axis labels
  const step = Math.max(1, Math.floor(primary.length / 6));
  const xIdx = Array.from({ length: 7 }, (_, i) => Math.min(i * step, primary.length - 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {/* Grid */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)} stroke="#E5E5E5" strokeWidth={0.5} />
          <text x={PAD.left - 6} y={toY(t) + 4} textAnchor="end" fill="#737373" style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}>
            ${(t / 1000).toFixed(0)}k
          </text>
        </g>
      ))}

      {/* $100k baseline */}
      <line x1={PAD.left} y1={toY(100_000)} x2={W - PAD.right} y2={toY(100_000)} stroke="#A3A3A3" strokeWidth={1} strokeDasharray="5,5" />
      <text x={PAD.left - 6} y={toY(100_000) - 4} textAnchor="end" fill="#737373" style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}>BASE</text>

      {/* X labels */}
      {xIdx.map((i) => (
        <text key={i} x={toX(i, primary.length)} y={H - 6} textAnchor="middle" fill="#737373" style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}>
          {new Date(primary[i].time * 1000).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
        </text>
      ))}

      {/* Area fill (primary only) */}
      <path
        d={`M ${toX(0, primary.length)} ${toY(primary[0].value)} ` + primary.map((d, i) => `L ${toX(i, primary.length)} ${toY(d.value)}`).join(" ") + ` L ${toX(primary.length - 1, primary.length)} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`}
        fill="rgba(5,150,105,0.08)"
      />

      {/* Lines */}
      {visibleCurves.map((curve) => (
        <polyline
          key={curve.label}
          points={curve.data.map((d, i) => `${toX(i, curve.data.length)},${toY(d.value)}`).join(" ")}
          fill="none"
          stroke={curve.color}
          strokeWidth={curve.label === "Buy & Hold" ? 2 : 1.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ strokeDasharray: 1200, strokeDashoffset: 0, animation: "drawLine 1.6s ease forwards" }}
        />
      ))}

      {/* Cursor dot at end */}
      {visibleCurves.map((curve) => {
        const last = curve.data[curve.data.length - 1];
        return <circle key={curve.label + "dot"} cx={toX(curve.data.length - 1, curve.data.length)} cy={toY(last.value)} r={3} fill={curve.color} />;
      })}
    </svg>
  );
}

/* ── Return distribution histogram ──────────────────────────────────────── */
function ReturnDist({ data }: { data: { mid: number; count: number }[] }) {
  if (!data.length) return null;
  const maxCount = Math.max(...data.map((d) => d.count));
  const W = 700, H = 140, PAD = { top: 8, right: 8, bottom: 28, left: 40 };
  const bW = (W - PAD.left - PAD.right) / data.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {data.map((d, i) => {
        const bH = Math.max(1, ((d.count / maxCount) * (H - PAD.top - PAD.bottom)));
        const x = PAD.left + i * (bW + 1);
        const y = H - PAD.bottom - bH;
        const isNeg = d.mid < 0;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={bH} fill={isNeg ? "rgba(220,38,38,0.65)" : "rgba(5,150,105,0.65)"} rx={1} style={{ transformOrigin: `${x}px ${H - PAD.bottom}px`, animation: `expandBar 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 20}ms both` }} />
          </g>
        );
      })}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.08)" />
      {[data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((d) => {
        const i = data.indexOf(d);
        return <text key={i} x={PAD.left + i * (bW + 1) + bW / 2} y={H - 8} textAnchor="middle" fill="#555568" style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}>{d.mid.toFixed(1)}%</text>;
      })}
      <text x={6} y={PAD.top + 6} fill="#555568" style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}>freq</text>
    </svg>
  );
}

/* ── Rolling Sharpe ──────────────────────────────────────────────────────── */
function RollingSharpeChart({ data }: { data: { time: number; sharpe: number }[] }) {
  if (!data.length) return null;
  const sharpes = data.map((d) => d.sharpe);
  const min = Math.min(...sharpes), max = Math.max(...sharpes), range = max - min || 1;
  const W = 700, H = 120, PAD = { top: 8, right: 8, bottom: 20, left: 40 };
  const iW = W - PAD.left - PAD.right, iH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * iW;
  const toY = (v: number) => PAD.top + iH - ((v - min) / range) * iH;
  const zero = toY(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {[0].map((t) => <line key={t} x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} strokeDasharray="4,4" />)}
      {[min, 0, max].map((t) => <text key={t} x={PAD.left - 4} y={toY(t) + 4} textAnchor="end" fill="#555568" style={{ fontSize: 9, fontFamily: "IBM Plex Mono" }}>{t.toFixed(1)}</text>)}
      <polyline points={data.map((d, i) => `${toX(i)},${toY(d.sharpe)}`).join(" ")} fill="none" stroke="var(--accent-2)" strokeWidth={1.5} strokeLinejoin="round" />
      <text x={PAD.left + 4} y={H - 6} fill="#555568" style={{ fontSize: 9, fontFamily: "IBM Plex Mono" }}>{new Date(data[0].time * 1000).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</text>
      <text x={W - PAD.right} y={H - 6} textAnchor="end" fill="#555568" style={{ fontSize: 9, fontFamily: "IBM Plex Mono" }}>{new Date(data[data.length - 1].time * 1000).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</text>
      <line x1={PAD.left} y1={Math.min(Math.max(zero, PAD.top), H - PAD.bottom)} x2={W - PAD.right} y2={Math.min(Math.max(zero, PAD.top), H - PAD.bottom)} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
    </svg>
  );
}

/* ── Strategy colors ─────────────────────────────────────────────────────── */
const STRATEGY_COLORS = ["#059669", "#0F172A", "#64748B", "#94A3B8"];
const REGIONS = Object.values(WORLD_MARKETS);
const RANGES = [{ v: "3mo", l: "3M" }, { v: "6mo", l: "6M" }, { v: "1y", l: "1Y" }, { v: "2y", l: "2Y" }, { v: "5y", l: "5Y" }, { v: "10y", l: "10Y" }];

const GLOSSARY = [
  { term: "Sharpe Ratio", formula: "(Rp − Rf) / σp", def: "Return per unit of total risk. Above 1 is good, above 2 is excellent." },
  { term: "Sortino Ratio", formula: "Rp / σ_downside", def: "Like Sharpe but penalizes only downside volatility — a more realistic measure." },
  { term: "VaR 95%", formula: "5th percentile of daily returns", def: "Worst expected daily loss 95% of the time. If VaR = -2%, you lose more than 2% only 1 in 20 days." },
  { term: "CVaR / ES", formula: "E[loss | loss > VaR]", def: "Expected Shortfall — average loss in the worst 5% of days. More conservative than VaR." },
  { term: "Max Drawdown", formula: "(Peak − Trough) / Peak", def: "Largest peak-to-trough decline. The key metric for downside risk tolerance." },
  { term: "Annual Volatility", formula: "σ_daily × √252", def: "Annualized standard deviation of daily log-returns. Scales by √time." },
  { term: "SMA Crossover", formula: "Buy: SMA₅₀ > SMA₂₀₀", def: "Classic trend-following. Enter long when fast MA crosses above slow MA; exit on reversal." },
  { term: "RSI Mean Reversion", formula: "RSI = 100 − 100/(1 + RS)", def: "Relative Strength Index. Buy oversold (<30), sell overbought (>70). Contrarian approach." },
  { term: "Momentum", formula: "Ret₂₀D = (P_t − P_{t−20}) / P_{t−20}", def: "Hold when 20-day return is positive; exit when negative. Trend continuation strategy." },
  { term: "Black-Scholes", formula: "C = S·N(d₁) − K·e^(−rT)·N(d₂)", def: "Closed-form options pricing model. Assumes log-normal prices, constant vol, no dividends." },
  { term: "Delta (Δ)", formula: "∂C/∂S", def: "Rate of change of option price per $1 move in underlying. ATM call ≈ 0.50." },
  { term: "Gamma (Γ)", formula: "∂²C/∂S²", def: "Convexity of option — how fast delta changes. Highest near expiry at-the-money." },
];

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ResearchPage() {
  const [region, setRegion] = useState<MarketRegion>("us");
  const [symbol, setSymbol] = useState("AAPL");
  const [range, setRange] = useState("1y");
  const [result, setResult] = useState<BacktestFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"curve" | "distribution" | "rolling" | "compare">("curve");
  const [showAllStrategies, setShowAllStrategies] = useState(false);
  const [vol, setVol] = useState<number | null>(null);
  const hasResult = !!result;
  const regionMeta = WORLD_MARKETS[region];
  const regionSymbols = regionMeta.symbols;

  const selectRegion = (r: MarketRegion) => {
    setRegion(r);
    setSymbol(WORLD_MARKETS[r].symbols[0] ?? symbol);
    setResult(null);
  };

  const run = async () => {
    const sym = symbol.trim().toUpperCase();
    setLoading(true); setError(""); setResult(null); setVol(null);
    try {
      const [bt, v] = await Promise.allSettled([
        tradingApi.backtest(sym, range),
        tradingApi.getVolatility(sym),
      ]);
      if (bt.status === "fulfilled") setResult(bt.value as BacktestFull);
      else setError("Backtest failed: " + (bt.reason as Error).message);
      if (v.status === "fulfilled") setVol(v.value.historicalVolatility30d);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  // Build strategy curves
  const strategyCurves = result?.strategies ? [
    { label: "Buy & Hold", data: result.strategies.buyAndHold.equityCurve, color: STRATEGY_COLORS[0] },
    ...(result.strategies.smaCross ? [{ label: "SMA 50/200", data: result.strategies.smaCross.equityCurve, color: STRATEGY_COLORS[1] }] : []),
    ...(result.strategies.rsi ? [{ label: "RSI 14", data: result.strategies.rsi.equityCurve, color: STRATEGY_COLORS[2] }] : []),
    ...(result.strategies.momentum ? [{ label: "Momentum 20D", data: result.strategies.momentum.equityCurve, color: STRATEGY_COLORS[3] }] : []),
  ] : [];

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div className="anim-fade-up" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 3, height: 28, background: "var(--accent)", borderRadius: 2 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em" }}>QUANTITATIVE RESEARCH</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 8 }}>Research Terminal</h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Multi-strategy backtesting · Sharpe · Sortino · VaR · CVaR · Return distribution · Rolling risk metrics
        </p>
      </div>

      {/* Controls */}
      <div className="anim-fade-up delay-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "20px 24px", marginBottom: 24 }}>
        {/* Region picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Market / Country</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRegion(r.id)}
                style={{
                  padding: "7px 14px", fontFamily: "var(--font-mono)", fontSize: "0.78rem", cursor: "pointer",
                  background: region === r.id ? "var(--accent-soft)" : "var(--bg-surface-2)",
                  color: region === r.id ? "var(--accent-2)" : "var(--text-muted)",
                  border: `1px solid ${region === r.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)", transition: "var(--t-fast)",
                }}
              >
                {r.flag} {r.label}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 8 }}>
            {regionMeta.exchange} · {regionMeta.currency} · {regionSymbols.length} symbols
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Symbol</label>
            <input
              className="input"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              style={{ fontSize: "1rem", fontWeight: 600 }}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Range</label>
            <div style={{ display: "flex", gap: 4 }}>
              {RANGES.map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setRange(v)}
                  style={{
                    padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                    background: range === v ? "var(--accent)" : "var(--bg-surface-2)", color: range === v ? "#fff" : "var(--text-muted)",
                    border: `1px solid ${range === v ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", transition: "var(--t-fast)",
                  }}
                >{l}</button>
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={run}
            disabled={loading}
            style={{ alignSelf: "flex-end", padding: "11px 28px", fontSize: "0.9rem", letterSpacing: "0.06em", minWidth: 160 }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                RUNNING…
              </span>
            ) : "▶ RUN BACKTEST"}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Symbol grid for selected region */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 140, overflowY: "auto", padding: "4px 0" }}>
          {regionSymbols.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setSymbol(s); setResult(null); }}
              title={inferCountryFromSymbol(s)}
              style={{
                padding: "5px 10px", fontFamily: "var(--font-mono)", fontSize: "0.74rem", cursor: "pointer",
                background: symbol === s ? "var(--accent-soft)" : "transparent",
                color: symbol === s ? "var(--accent-2)" : "var(--text-muted)",
                border: `1px solid ${symbol === s ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)", transition: "var(--t-fast)",
              }}
            >{s.replace(".NS", "").replace(".L", "").replace(".DE", "").replace(".PA", "").replace(".AS", "").replace(".HK", "").replace(".AX", "").replace(".T", "")}</button>
          ))}
        </div>
      </div>

      {/* Live price chart */}
      {symbol.trim() && (
        <div className="anim-fade-up delay-2 card" style={{ padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>PRICE CHART</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                {symbol} <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>· {inferCountryFromSymbol(symbol)}</span>
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)" }}>Backtest range: {range.toUpperCase()}</span>
          </div>
          <PriceChart symbol={symbol.trim().toUpperCase()} height={300} />
        </div>
      )}

      {error && (
        <div className="anim-fade-up" style={{ padding: "12px 16px", background: "var(--down-soft)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 20, fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--down)" }}>
          ✗ {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      )}

      {result && (
        <>
          {/* KPI grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
            <KpiCard animate label="Total Return" value={`${sign(result.totalReturn)}${fmt(result.totalReturn)}%`} color={result.totalReturn >= 0 ? "var(--up)" : "var(--down)"} sub={`$${(100_000 * (1 + result.totalReturn / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })} final`} delay={0} />
            <KpiCard animate label="Annual Return" value={`${sign(result.annualReturn)}${fmt(result.annualReturn)}%`} color={result.annualReturn >= 0 ? "var(--up)" : "var(--down)"} delay={40} />
            <KpiCard animate label="Sharpe Ratio" value={fmt(result.sharpeRatio, 2)} sub="(Rp−Rf)/σp" color={result.sharpeRatio >= 1.5 ? "var(--up)" : result.sharpeRatio >= 0.5 ? "var(--warn)" : "var(--down)"} delay={80} />
            {result.sortinoRatio != null && <KpiCard animate label="Sortino Ratio" value={fmt(result.sortinoRatio, 2)} sub="Rp/σ_downside" color={result.sortinoRatio >= 1.5 ? "var(--up)" : "var(--warn)"} delay={120} />}
            <KpiCard animate label="Max Drawdown" value={`−${fmt(result.maxDrawdown)}%`} sub="peak → trough" color="var(--down)" delay={160} />
            <KpiCard animate label="Annual Volatility" value={`${fmt(result.annualVolatility)}%`} sub="σ × √252" delay={200} />
            {result.var95Day != null && <KpiCard animate label="VaR 95% (1D)" value={`${fmt(result.var95Day)}%`} sub="5th pctile loss" color="var(--down)" delay={240} />}
            {result.cvar95Day != null && <KpiCard animate label="CVaR / ES" value={`${fmt(result.cvar95Day)}%`} sub="expected shortfall" color="var(--down)" delay={280} />}
            {vol != null && <KpiCard animate label="HV 30D" value={`${fmt(vol)}%`} sub="log-ret σ × √252" delay={320} />}
            <KpiCard label="Trading Days" value={result.tradingDays.toLocaleString()} sub={`${result.symbol} · ${result.range}`} delay={360} />
          </div>

          {/* Chart panel */}
          <div className="anim-fade-up delay-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", marginBottom: 16, overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 0, padding: "0 4px" }}>
              <div className="tabs" style={{ border: "none" }}>
                {([["curve","EQUITY CURVE"],["distribution","RETURN DIST."],["rolling","ROLLING SHARPE"],["compare","STRATEGY COMPARE"]] as [string, string][]).map(([id, label]) => (
                  <button key={id} className={`tab-btn ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id as typeof activeTab)}>{label}</button>
                ))}
              </div>
              {activeTab === "curve" && strategyCurves.length > 1 && (
                <button className="btn btn-ghost btn-sm" style={{ margin: "4px 8px" }} onClick={() => setShowAllStrategies(!showAllStrategies)}>
                  {showAllStrategies ? "Buy & Hold only" : "All strategies"}
                </button>
              )}
            </div>

            <div style={{ padding: "20px 16px" }}>
              {activeTab === "curve" && (
                <>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                    {(showAllStrategies ? strategyCurves : strategyCurves.slice(0, 1)).map((c) => (
                      <span key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        <span style={{ width: 14, height: 2, background: c.color, display: "inline-block", borderRadius: 1 }} />{c.label}
                      </span>
                    ))}
                  </div>
                  <EquityChart curves={strategyCurves} showAll={showAllStrategies} />
                </>
              )}

              {activeTab === "distribution" && result.distribution && (
                <>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
                    Daily return distribution — <span style={{ color: "var(--down)" }}>■</span> negative days &nbsp;
                    <span style={{ color: "var(--up)" }}>■</span> positive days
                  </div>
                  <ReturnDist data={result.distribution} />
                  <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Mean daily return", val: `${sign(result.annualReturn / 252)}${fmt(result.annualReturn / 252, 3)}%` },
                      { label: "Daily vol (σ)", val: `${fmt(result.annualVolatility / Math.sqrt(252))}%` },
                      { label: "Skewness proxy", val: result.totalReturn >= 0 ? "right-skewed ▶" : "left-skewed ◀" },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>{label}: </span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "rolling" && result.rollingSharpe && (
                <>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
                    30-day rolling Sharpe ratio — above 0 line = risk-adjusted profit
                  </div>
                  <RollingSharpeChart data={result.rollingSharpe} />
                </>
              )}

              {activeTab === "compare" && result.strategies && (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Strategy</th>
                        <th>Total Return</th>
                        <th>Annual Return</th>
                        <th>vs Buy & Hold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategyCurves.map((c, i) => {
                        const s = [result.strategies!.buyAndHold, result.strategies!.smaCross, result.strategies!.rsi, result.strategies!.momentum].find((st) => st?.name === c.label) ?? result.strategies!.buyAndHold;
                        const excess = (s.totalReturn ?? 0) - result.strategies!.buyAndHold.totalReturn;
                        return (
                          <tr key={c.label}>
                            <td>
                              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, display: "inline-block", flexShrink: 0 }} />
                                <span style={{ fontWeight: i === 0 ? 600 : 400 }}>{c.label}</span>
                              </span>
                            </td>
                            <td className={s.totalReturn >= 0 ? "up" : "down"}>{sign(s.totalReturn)}{fmt(s.totalReturn)}%</td>
                            <td className={s.annualReturn >= 0 ? "up" : "down"}>{sign(s.annualReturn)}{fmt(s.annualReturn)}%</td>
                            <td>{i === 0 ? <span className="badge badge-neutral">baseline</span> : <span className={excess >= 0 ? "up" : "down"}>{sign(excess)}{fmt(excess)}% α</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Interpretation */}
          <div className="anim-fade-up delay-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>STATISTICAL INTERPRETATION</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
              {[
                { metric: "Risk-Adjusted Return (Sharpe)", value: result.sharpeRatio, explain: result.sharpeRatio >= 2 ? "Exceptional — top-decile risk-adjusted performance" : result.sharpeRatio >= 1 ? "Strong — earns meaningful reward per unit of risk" : result.sharpeRatio >= 0.5 ? "Moderate — acceptable for individual equities" : "Poor — insufficient compensation for volatility" },
                { metric: "Drawdown Risk", value: result.maxDrawdown, explain: result.maxDrawdown <= 10 ? "Low drawdown — capital preservation strategy" : result.maxDrawdown <= 25 ? "Typical for equity long — within S&P 500 norms" : result.maxDrawdown <= 50 ? "High drawdown — requires strong conviction to hold" : "Extreme drawdown — unsuitable for most risk profiles" },
                { metric: "Tail Risk (VaR/CVaR)", value: result.var95Day ?? 0, explain: result.var95Day != null ? `On worst 5% of days you lose more than ${Math.abs(result.var95Day).toFixed(1)}%. CVaR = ${result.cvar95Day?.toFixed(1) ?? "—"}% average in those days.` : "N/A" },
                { metric: "Volatility Regime", value: result.annualVolatility, explain: result.annualVolatility <= 15 ? "Low vol — bond-like behaviour, suitable for conservative allocations" : result.annualVolatility <= 30 ? "Mid vol — typical large-cap equity range" : "High vol — crypto / small-cap territory, size positions carefully" },
              ].map(({ metric, value, explain }) => (
                <div key={metric} style={{ padding: "12px 14px", background: "var(--bg-surface-2)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid var(--border-strong)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--accent-2)", fontWeight: 600, marginBottom: 4 }}>{metric}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: 4 }}>{typeof value === "number" ? fmt(value) : value}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{explain}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Quant Glossary */}
      <div className="anim-fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 3, height: 20, background: "var(--accent)", borderRadius: 2 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>QUANT GLOSSARY</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
          {GLOSSARY.map(({ term, formula, def }) => (
            <div key={term} style={{ padding: "14px 16px", background: "var(--bg-surface-2)", borderRadius: "var(--radius-sm)", transition: "var(--t-fast)", cursor: "default" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderLeft = "2px solid var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderLeft = "2px solid transparent")}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-2)" }}>{term}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 2 }}>{formula}</span>
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{def}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
