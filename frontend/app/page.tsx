import Link from "next/link";
import { TickerTape } from "@/components/trading/TickerTape";
import { MarketIndices } from "@/components/trading/MarketIndices";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Ticker */}
      <TickerTape />

      {/* Hero */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px 64px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Label */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent-soft)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 2,
            padding: "4px 12px",
            marginBottom: 28,
          }}
        >
          <span style={{ width: 6, height: 6, background: "var(--up)", borderRadius: "50%", boxShadow: "0 0 6px var(--up)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent-2)", letterSpacing: "0.1em" }}>
            PAPER TRADING — ZERO RISK, REAL MARKETS
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(2rem, 5vw, 4rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            lineHeight: 1.1,
            maxWidth: 700,
            marginBottom: 20,
          }}
        >
          Trade Like a{" "}
          <span style={{ color: "var(--accent-2)" }}>Quant</span>
          <br />Without the Capital
        </h1>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "1rem",
            color: "var(--text-secondary)",
            maxWidth: 520,
            lineHeight: 1.65,
            marginBottom: 40,
          }}
        >
          Real-time stock, options, and crypto data. Virtual $100,000 portfolio.
          Black-Scholes pricing, backtesting, and performance analytics — all free,
          all professional grade.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/trade" className="btn btn-primary btn-lg">
            Start Trading →
          </Link>
          <Link href="/markets" className="btn btn-ghost btn-lg">
            View Markets
          </Link>
          <Link href="/research" className="btn btn-ghost btn-lg">
            Research
          </Link>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 56,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { label: "Starting Capital", value: "$100,000" },
            { label: "Assets Available", value: "5,000+" },
            { label: "Data Providers", value: "Yahoo Finance · CoinGecko" },
            { label: "Pricing Models", value: "Black-Scholes · Greeks" },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>{value}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Market indices bar */}
      <MarketIndices />

      {/* Feature grid */}
      <section style={{ padding: "48px 24px 64px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            PLATFORM MODULES
          </div>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 500, color: "var(--text-primary)" }}>
            Everything a Quant Needs
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 1,
            background: "var(--border)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              style={{
                background: "var(--bg-surface)",
                padding: "24px 20px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                transition: "var(--t-mid)",
              }}
            >
              <div style={{ fontSize: "1.4rem" }}>{f.icon}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                {f.title}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {f.desc}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--accent-2)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Open →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Tech stack banner */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>BUILT WITH</span>
        {["Next.js 14", "TypeScript", "Python FastAPI", "C++ Quant Core", "Rust Data Layer", "Yahoo Finance API", "CoinGecko API"].map((t) => (
          <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-accent)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", padding: "3px 8px", borderRadius: 2 }}>{t}</span>
        ))}
      </section>

      {/* Disclaimer */}
      <div style={{ padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", maxWidth: 600, margin: "0 auto" }}>
          ⚠ PAPER TRADING ONLY. All trades use virtual money. This platform is for educational and
          demonstration purposes. Not financial advice. Not affiliated with any real brokerage.
        </p>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    href: "/markets",
    icon: "📊",
    title: "LIVE MARKETS",
    desc: "Real-time stock and crypto prices. Indices, movers, volume, and market cap. Watchlist included.",
  },
  {
    href: "/trade",
    icon: "⚡",
    title: "TRADE TERMINAL",
    desc: "Market & limit orders. Buy/sell stocks, ETFs, and crypto with your $100k virtual account.",
  },
  {
    href: "/portfolio",
    icon: "📈",
    title: "PORTFOLIO",
    desc: "Holdings, cost basis, unrealized P&L, trade history, and performance breakdown.",
  },
  {
    href: "/options",
    icon: "🧮",
    title: "OPTIONS CHAIN",
    desc: "Live options chains with IV, Greeks, bid/ask. Black-Scholes calculator built in.",
  },
  {
    href: "/research",
    icon: "🔬",
    title: "QUANT RESEARCH",
    desc: "Backtesting, Sharpe ratio, drawdown analysis, historical volatility, and strategy analytics.",
  },
];
