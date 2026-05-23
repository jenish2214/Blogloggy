"use client";
import Link from "next/link";
import { NewUserStockSuggestions } from "@/components/dashboard/NewUserStockSuggestions";
import { TickerTape } from "@/components/trading/TickerTape";
import { MarketIndices } from "@/components/trading/MarketIndices";
import { LiveMarketWatch } from "@/components/trading/LiveMarketWatch";
import styles from "./dashboard.module.css";

const STATS = [
  { label: "Starting Capital", value: "$100,000", delta: "Paper money · $100k", icon: "capital" },
  { label: "Assets", value: "5,000+", delta: "Stocks · ETFs · Crypto", icon: "assets" },
  { label: "Live Data", value: "10 sec", delta: "Yahoo Finance refresh", icon: "live" },
  { label: "Quant Tools", value: "Built-in", delta: "Greeks · VaR · Backtest", icon: "tools" },
];

const FEATURES = [
  { href: "/markets", title: "Live Markets", desc: "Real-time prices & movers", icon: "markets" },
  { href: "/trade", title: "Trade Terminal", desc: "Market & limit orders", icon: "trade" },
  { href: "/portfolio", title: "Portfolio", desc: "P&L · holdings · history", icon: "portfolio" },
  { href: "/wealth", title: "Wealth Desk", desc: "Personal + client books · live AUM", icon: "wealth" },
  { href: "/algo-trading", title: "Algo Desk", desc: "Strategies · live sim", icon: "algo" },
  { href: "/options", title: "Options", desc: "Chain · Greeks · B-S calc", icon: "options" },
  { href: "/research", title: "Research", desc: "Backtest · Sharpe · VaR", icon: "research" },
  { href: "/forex", title: "Forex", desc: "Major pairs paper trading", icon: "forex" },
];

function StatIcon({ type }: { type: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "capital": return <svg {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case "assets": return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case "live": return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "tools": return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>;
    default: return null;
  }
}

function FeatureIcon({ type }: { type: string }) {
  const props = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "markets": return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case "trade": return <svg {...props}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
    case "portfolio": return <svg {...props}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
    case "wealth": return <svg {...props}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
    case "algo": return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>;
    case "options": return <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/></svg>;
    case "research": return <svg {...props}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>;
    case "forex": return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    default: return null;
  }
}

export default function LandingPage() {
  return (
    <div className={styles.root}>
      <TickerTape />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Welcome to QuantDesk</h1>
          <p className={styles.heroSub}>Professional paper trading — real markets, zero risk.</p>
          <div className={styles.heroActions}>
            <Link href="/trade" className="btn btn-primary">Start Trading →</Link>
            <Link href="/markets" className="btn btn-ghost">Markets</Link>
            <Link href="/portfolio" className="btn btn-ghost">Portfolio</Link>
            <Link href="/research" className="btn btn-ghost">Research</Link>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <div className={styles.shellInner}>
          <section className={styles.statsGrid}>
            {STATS.map(({ label, value, delta, icon }) => (
              <div key={label} className="stat-card">
                <div className={styles.statIcon}><StatIcon type={icon} /></div>
                <div className={styles.statLabel}>{label}</div>
                <div className={styles.statValue}>{value}</div>
                <div className={styles.statDelta}>{delta}</div>
              </div>
            ))}
          </section>

          <NewUserStockSuggestions />

          <div className={styles.mainGrid}>
            <div className={styles.primary}>
              <LiveMarketWatch />
              <MarketIndices />
            </div>

            <aside className={styles.rail}>
              <div className={styles.railCard}>
                <div className={styles.railHeader}>Quick Access</div>
                <nav className={styles.quickLinks}>
                  {FEATURES.map((f) => (
                    <Link key={f.href} href={f.href} className={styles.quickLink}>
                      <span className={styles.quickIcon}><FeatureIcon type={f.icon} /></span>
                      <span className={styles.quickText}>
                        <div className={styles.quickTitle}>{f.title}</div>
                        <div className={styles.quickDesc}>{f.desc}</div>
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className={styles.railCard}>
                <div className={styles.railHeader}>Get Started</div>
                <div className={styles.railActions}>
                  <Link href="/trade" className="btn btn-primary btn-sm" style={{ justifyContent: "center" }}>
                    Open Trade Terminal
                  </Link>
                  <Link href="/algo-trading" className="btn btn-ghost btn-sm" style={{ justifyContent: "center" }}>
                    Launch Algo Desk
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          <footer className={styles.footerRow}>
            <div className={styles.techStack}>
              <span className={styles.techLabel}>Built with</span>
              {["Next.js 14", "TypeScript", "Supabase", "Yahoo Finance", "CoinGecko"].map((t) => (
                <span key={t} className={styles.techTag}>{t}</span>
              ))}
            </div>
            <p className={styles.disclaimer}>
              Paper trading only. Virtual money — not financial advice.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
