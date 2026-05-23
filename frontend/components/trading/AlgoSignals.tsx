"use client";
import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type SignalDir = "buy" | "sell" | "neutral";
type Composite = "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";

interface Signals {
  symbol: string;
  currentPrice: number;
  rsi: { value: number; signal: SignalDir };
  sma: { sma20: number; sma50: number; signal: SignalDir };
  macd: { macd: number; signal_line: number; histogram: number; signal: "buy" | "sell" };
  bollingerBands: { upper: number; middle: number; lower: number; pct: number; signal: SignalDir };
  volume: { ratio: number; avgVol: number; lastVol: number };
  composite: Composite;
  change5d: number;
  change20d: number;
  dataPoints: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const COMPOSITE_META: Record<Composite, { label: string; color: string; bg: string }> = {
  strong_buy:  { label: "STRONG BUY",  color: "var(--up)",        bg: "var(--up-soft)" },
  buy:         { label: "BUY",         color: "var(--up)",        bg: "var(--up-soft)" },
  neutral:     { label: "NEUTRAL",     color: "var(--text-muted)", bg: "var(--bg-elevated)" },
  sell:        { label: "SELL",        color: "var(--down)",      bg: "var(--down-soft)" },
  strong_sell: { label: "STRONG SELL", color: "var(--down)",      bg: "var(--down-soft)" },
};

function sigColor(s: SignalDir) {
  return s === "buy" ? "var(--up)" : s === "sell" ? "var(--down)" : "var(--text-muted)";
}
function sigBg(s: SignalDir) {
  return s === "buy" ? "var(--up-soft)" : s === "sell" ? "var(--down-soft)" : "var(--bg-elevated)";
}

function SignalChip({ signal }: { signal: SignalDir }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 7px",
      background: sigBg(signal),
      color: sigColor(signal),
      fontFamily: "var(--font-mono)",
      fontSize: "0.6rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
      borderRadius: "var(--radius-sm)",
      border: `1px solid ${sigColor(signal)}33`,
    }}>
      {signal.toUpperCase()}
    </span>
  );
}

function MiniBar({ pct, signal }: { pct: number; signal: SignalDir }) {
  return (
    <div style={{ height: 3, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden", marginTop: 5 }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        height: "100%",
        background: sigColor(signal),
        borderRadius: 2,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AlgoSignals({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Signals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/trading/signals/${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => { setError("signals_unavailable"); setLoading(false); });
  }, [symbol]);

  if (loading) {
    return (
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 48, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "16px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", textAlign: "center" }}>
        Signals unavailable for {symbol}
      </div>
    );
  }

  const comp = COMPOSITE_META[data.composite];

  const indicators = [
    {
      label: "RSI (14)",
      algo: "Relative Strength Index",
      detail: `Current: ${Number(data.rsi.value).toFixed(1)}`,
      description: data.rsi.value < 35
        ? "Oversold — mean reversion likely"
        : data.rsi.value > 65
        ? "Overbought — momentum fading"
        : "Neutral zone — no clear bias",
      signal: data.rsi.signal,
      barPct: Number(data.rsi.value),
    },
    {
      label: "SMA Cross",
      algo: "20/50 Moving Average",
      detail: `SMA20 $${Number(data.sma.sma20).toFixed(2)}  ·  SMA50 $${Number(data.sma.sma50).toFixed(2)}`,
      description: data.sma.signal === "buy"
        ? "Golden cross — short MA above long MA"
        : data.sma.signal === "sell"
        ? "Death cross — short MA below long MA"
        : "MAs converging — trend unclear",
      signal: data.sma.signal,
      barPct: data.sma.signal === "buy" ? 80 : data.sma.signal === "sell" ? 20 : 50,
    },
    {
      label: "MACD",
      algo: "12/26/9 Momentum",
      detail: `MACD ${Number(data.macd.macd).toFixed(3)}  ·  Signal ${Number(data.macd.signal_line).toFixed(3)}  ·  Hist ${Number(data.macd.histogram).toFixed(3)}`,
      description: data.macd.signal === "buy"
        ? "MACD above signal — bullish momentum"
        : "MACD below signal — bearish momentum",
      signal: data.macd.signal,
      barPct: data.macd.signal === "buy" ? 72 : 28,
    },
    {
      label: "Bollinger %B",
      algo: "2σ Bollinger Bands",
      detail: `%B: ${Number(data.bollingerBands.pct).toFixed(1)}%  ·  Upper $${Number(data.bollingerBands.upper).toFixed(2)}  Lower $${Number(data.bollingerBands.lower).toFixed(2)}`,
      description: data.bollingerBands.pct < 25
        ? "Near lower band — statistically cheap"
        : data.bollingerBands.pct > 75
        ? "Near upper band — statistically stretched"
        : "Mid-channel — consolidating",
      signal: data.bollingerBands.signal,
      barPct: Number(data.bollingerBands.pct),
    },
  ];

  const votes = {
    buy: indicators.filter((i) => i.signal === "buy").length,
    sell: indicators.filter((i) => i.signal === "sell").length,
    neutral: indicators.filter((i) => i.signal === "neutral").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Composite header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
            Algo Verdict · {data.dataPoints}d data
          </div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.05rem",
            fontWeight: 700,
            color: comp.color,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            {comp.label}
            <span style={{ fontSize: "0.65rem", background: comp.bg, padding: "2px 8px", borderRadius: "var(--radius-sm)", border: `1px solid ${comp.color}33` }}>
              {votes.buy}B · {votes.sell}S · {votes.neutral}N
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
            5D · 20D
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
            <span style={{ color: Number(data.change5d) >= 0 ? "var(--up)" : "var(--down)" }}>
              {Number(data.change5d) >= 0 ? "+" : ""}{Number(data.change5d).toFixed(2)}%
            </span>
            <span style={{ color: "var(--border-strong)", margin: "0 4px" }}>/</span>
            <span style={{ color: Number(data.change20d) >= 0 ? "var(--up)" : "var(--down)" }}>
              {Number(data.change20d) >= 0 ? "+" : ""}{Number(data.change20d).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Individual indicators */}
      {indicators.map((ind, i) => (
        <div
          key={ind.label}
          style={{
            padding: "10px 16px",
            borderBottom: i < indicators.length - 1 ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {ind.label}
                </span>
                <SignalChip signal={ind.signal} />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ind.detail}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.62rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                {ind.description}
              </div>
              <MiniBar pct={ind.barPct} signal={ind.signal} />
            </div>
          </div>
        </div>
      ))}

      {/* Volume & data footer */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-surface-2)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Volume
          </div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: Number(data.volume.ratio) > 1.5 ? "var(--up)" : Number(data.volume.ratio) < 0.7 ? "var(--down)" : "var(--text-secondary)",
            marginTop: 1,
          }}>
            {Number(data.volume.ratio).toFixed(2)}× avg
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Updated
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1 }}>
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
