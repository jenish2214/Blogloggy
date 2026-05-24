"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { NewUserStockSuggestions } from "@/components/dashboard/NewUserStockSuggestions";
import { ClientOnly } from "@/components/system/ClientOnly";
import { TickerTape } from "@/components/trading/TickerTape";
import { MarketIndices } from "@/components/trading/MarketIndices";
import { LiveMarketWatch } from "@/components/trading/LiveMarketWatch";
import {
  dashboardStagger,
  fadeIn,
  fadeUp,
  scaleIn,
} from "@/lib/motion/dashboardVariants";
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

const MODULES = [
  { id: "WDG · 01", title: "Live market watch", content: <LiveMarketWatch /> },
  {
    id: "WDG · 02",
    title: "Global indices & commodities",
    content: <MarketIndices />,
  },
] as const;

export default function LandingPage() {
  const reduce = useReducedMotion();
  const pageStagger = dashboardStagger(reduce, 0.07);
  const kpiStagger = dashboardStagger(reduce, 0.08);
  const navStagger = dashboardStagger(reduce, 0.05);
  const item = fadeUp(reduce, 14);
  const moduleIn = scaleIn(reduce);
  const tagIn = fadeIn(reduce);

  return (
    <div className={styles.root}>
      <TickerTape />

      <motion.div
        className={styles.workspace}
        variants={pageStagger}
        initial="hidden"
        animate="show"
      >
        <motion.header className={styles.pageHead} variants={item}>
          <div>
            <motion.p
              className={styles.eyebrow}
              variants={fadeUp(reduce, 8)}
              initial="hidden"
              animate="show"
              transition={{ delay: reduce ? 0 : 0.05 }}
            >
              Institutional paper trading workspace
            </motion.p>
            <h1 className={styles.pageTitle}>Market dashboard</h1>
            <p className={styles.pageDesc}>
              Real-time surveillance, execution shortcuts, and portfolio analytics — structured for
              professional workflows. No live capital at risk.
            </p>
          </div>
        </motion.header>

        <motion.section
          className={styles.kpiBand}
          aria-label="Key metrics"
          variants={kpiStagger}
          initial="hidden"
          animate="show"
        >
          {KPI.map((k, i) => (
            <motion.div
              key={k.label}
              className={styles.kpiCell}
              variants={item}
              whileHover={reduce ? undefined : { y: -3, transition: { duration: 0.2 } }}
              whileTap={reduce ? undefined : { scale: 0.99 }}
            >
              <span className={styles.kpiLabel}>{k.label}</span>
              <motion.span
                className={styles.kpiValue}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.15 + i * 0.07, duration: 0.35 }}
              >
                {k.value}
              </motion.span>
              <span className={styles.kpiNote}>{k.note}</span>
            </motion.div>
          ))}
        </motion.section>

        <motion.div variants={item}>
          <ClientOnly>
            <NewUserStockSuggestions />
          </ClientOnly>
        </motion.div>

        <div className={styles.terminalGrid}>
          <div className={styles.mainColumn}>
            {MODULES.map((mod, i) => (
              <motion.section
                key={mod.id}
                className={styles.module}
                variants={moduleIn}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-48px" }}
                transition={{ delay: reduce ? 0 : i * 0.08 }}
              >
                <div className={styles.moduleHead}>
                  <span className={styles.moduleId}>{mod.id}</span>
                  <h2 className={styles.moduleTitle}>{mod.title}</h2>
                </div>
                <div className={styles.moduleBody}>{mod.content}</div>
              </motion.section>
            ))}
          </div>

          <motion.aside
            className={styles.sideColumn}
            variants={item}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            <motion.section
              className={styles.module}
              whileHover={reduce ? undefined : { y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.moduleHead}>
                <span className={styles.moduleId}>NAV</span>
                <h2 className={styles.moduleTitle}>Application map</h2>
              </div>
              <nav className={styles.navGroups}>
                {NAV_GROUPS.map((group, gi) => (
                  <motion.div
                    key={group.title}
                    className={styles.navGroup}
                    variants={navStagger}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                  >
                    <h3 className={styles.navGroupTitle}>{group.title}</h3>
                    <ul className={styles.navList}>
                      {group.items.map((navItem, ii) => (
                        <motion.li key={navItem.href} variants={fadeUp(reduce, 10)}>
                          <motion.div whileHover={reduce ? undefined : { x: 4 }} whileTap={{ scale: 0.99 }}>
                            <Link href={navItem.href} className={styles.navLink}>
                              <span className={styles.navCode}>{navItem.code}</span>
                              <span className={styles.navText}>
                                <span className={styles.navLinkTitle}>{navItem.title}</span>
                                <span className={styles.navLinkDesc}>{navItem.desc}</span>
                              </span>
                              <span className={styles.navArrow} aria-hidden>
                                →
                              </span>
                            </Link>
                          </motion.div>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </nav>
            </motion.section>

            <motion.section
              className={styles.module}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={moduleIn}
            >
              <div className={styles.moduleHead}>
                <span className={styles.moduleId}>ACT</span>
                <h2 className={styles.moduleTitle}>Quick actions</h2>
              </div>
              <motion.div
                className={styles.actionStack}
                variants={navStagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                {[
                  { href: "/trade", label: "Open trade terminal", primary: true },
                  { href: "/portfolio", label: "View holdings", primary: false },
                  { href: "/quant-lab", label: "Launch quant lab", primary: false },
                ].map((action) => (
                  <motion.div key={action.href} variants={fadeUp(reduce, 8)}>
                    <motion.div whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link
                        href={action.href}
                        className={`btn ${action.primary ? "btn-primary" : "btn-ghost"} ${styles.actionBtn}`}
                      >
                        {action.label}
                      </Link>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          </motion.aside>
        </div>

        <motion.footer
          className={styles.compliance}
          variants={item}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className={styles.complianceRow}>
            <span className={styles.complianceLabel}>Stack</span>
            {["Next.js", "TypeScript", "Supabase", "Yahoo Finance", "Finnhub"].map((t, i) => (
              <motion.span
                key={t}
                className={styles.complianceTag}
                variants={tagIn}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: reduce ? 0 : i * 0.05 }}
                whileHover={reduce ? undefined : { y: -2 }}
              >
                {t}
              </motion.span>
            ))}
          </div>
          <p className={styles.complianceText}>
            Paper trading only. Prices and analytics are for education — not investment advice.
            Past simulated performance does not guarantee future results.
          </p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
