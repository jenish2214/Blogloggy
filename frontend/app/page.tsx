"use client";

import Link from "next/link";
import { NewUserStockSuggestions } from "@/components/dashboard/NewUserStockSuggestions";
import { ClientOnly } from "@/components/system/ClientOnly";
import { TickerTape } from "@/components/trading/TickerTape";
import { MarketIndices } from "@/components/trading/MarketIndices";
import { LiveMarketWatch } from "@/components/trading/LiveMarketWatch";
import styles from "./dashboard.module.css";

const KPI = [
  { label: "Paper capital", value: "$100,000", note: "Starting balance" },
  { label: "Universe", value: "5,000+", note: "Equities · ETFs · Crypto" },
  { label: "Market data", value: "10s", note: "Live refresh cycle" },
  { label: "Risk engine", value: "Built-in", note: "Greeks · VaR · Backtest" },
];

const NAV_GROUPS = [
  {
    title: "Trading",
    items: [
      { href: "/trade", code: "TRD", title: "Trade Terminal", desc: "Market & limit orders" },
      { href: "/markets", code: "MKT", title: "Live Markets", desc: "Quotes · movers · regions" },
      { href: "/portfolio", code: "PRT", title: "Portfolio", desc: "Holdings · P&L · history" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { href: "/quant-lab", code: "QLB", title: "Quant Lab", desc: "ML · options · Monte Carlo" },
      { href: "/research", code: "RSH", title: "Research", desc: "Backtest · Sharpe · VaR" },
      { href: "/algo-trading", code: "ALG", title: "Algo Desk", desc: "Strategy simulation" },
    ],
  },
  {
    title: "Advisory",
    items: [
      { href: "/wealth", code: "WLT", title: "Wealth Desk", desc: "Client & personal books" },
      { href: "/desk", code: "DSK", title: "Broker & Clients", desc: "Books · wallet · orders" },
      { href: "/options", code: "OPT", title: "Options", desc: "Chain · Greeks · pricing" },
      { href: "/forex", code: "FX", title: "Forex", desc: "Major pairs" },
    ],
  },
];

export default function LandingPage() {
  return (
    <div className={styles.root}>
      <TickerTape />

      <div className={styles.workspace}>
        <header className={styles.pageHead}>
          <div>
            <p className={styles.eyebrow}>Institutional paper trading workspace</p>
            <h1 className={styles.pageTitle}>Market dashboard</h1>
            <p className={styles.pageDesc}>
              Real-time surveillance, execution shortcuts, and portfolio analytics — structured for
              professional workflows. No live capital at risk.
            </p>
          </div>
        </header>

        <section className={styles.kpiBand} aria-label="Key metrics">
          {KPI.map((k) => (
            <div key={k.label} className={styles.kpiCell}>
              <span className={styles.kpiLabel}>{k.label}</span>
              <span className={styles.kpiValue}>{k.value}</span>
              <span className={styles.kpiNote}>{k.note}</span>
            </div>
          ))}
        </section>

        <ClientOnly>
          <NewUserStockSuggestions />
        </ClientOnly>

        <div className={styles.terminalGrid}>
          <div className={styles.mainColumn}>
            <section className={styles.module}>
              <div className={styles.moduleHead}>
                <span className={styles.moduleId}>WDG · 01</span>
                <h2 className={styles.moduleTitle}>Live market watch</h2>
              </div>
              <div className={styles.moduleBody}>
                <LiveMarketWatch />
              </div>
            </section>

            <section className={styles.module}>
              <div className={styles.moduleHead}>
                <span className={styles.moduleId}>WDG · 02</span>
                <h2 className={styles.moduleTitle}>Global indices & commodities</h2>
              </div>
              <div className={styles.moduleBody}>
                <MarketIndices />
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.module}>
              <div className={styles.moduleHead}>
                <span className={styles.moduleId}>NAV</span>
                <h2 className={styles.moduleTitle}>Application map</h2>
              </div>
              <nav className={styles.navGroups}>
                {NAV_GROUPS.map((group) => (
                  <div key={group.title} className={styles.navGroup}>
                    <h3 className={styles.navGroupTitle}>{group.title}</h3>
                    <ul className={styles.navList}>
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} className={styles.navLink}>
                            <span className={styles.navCode}>{item.code}</span>
                            <span className={styles.navText}>
                              <span className={styles.navLinkTitle}>{item.title}</span>
                              <span className={styles.navLinkDesc}>{item.desc}</span>
                            </span>
                            <span className={styles.navArrow} aria-hidden>
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </section>

            <section className={styles.module}>
              <div className={styles.moduleHead}>
                <span className={styles.moduleId}>ACT</span>
                <h2 className={styles.moduleTitle}>Quick actions</h2>
              </div>
              <div className={styles.actionStack}>
                <Link href="/trade" className={`btn btn-primary ${styles.actionBtn}`}>
                  Open trade terminal
                </Link>
                <Link href="/portfolio" className={`btn btn-ghost ${styles.actionBtn}`}>
                  View holdings
                </Link>
                <Link href="/quant-lab" className={`btn btn-ghost ${styles.actionBtn}`}>
                  Launch quant lab
                </Link>
              </div>
            </section>
          </aside>
        </div>

        <footer className={styles.compliance}>
          <div className={styles.complianceRow}>
            <span className={styles.complianceLabel}>Stack</span>
            {["Next.js", "TypeScript", "Supabase", "Yahoo Finance", "Finnhub"].map((t) => (
              <span key={t} className={styles.complianceTag}>
                {t}
              </span>
            ))}
          </div>
          <p className={styles.complianceText}>
            Paper trading only. Prices and analytics are for education — not investment advice.
            Past simulated performance does not guarantee future results.
          </p>
        </footer>
      </div>
    </div>
  );
}
