"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { NewUserStockSuggestions } from "@/components/dashboard/NewUserStockSuggestions";
import { ClientOnly } from "@/components/system/ClientOnly";
import { TickerTape } from "@/components/trading/TickerTape";
import { MarketIndices } from "@/components/trading/MarketIndices";
import { LiveMarketWatch } from "@/components/trading/LiveMarketWatch";
import { EarningsCalendar } from "@/components/features/EarningsCalendar";
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
  { label: "Market data", value: "Live", note: "Streaming quotes" },
  { label: "Workspaces", value: "12+", note: "Trade · Wallet · Algo" },
];

const QUICK_ACTIONS = [
  { href: "/trade", label: "Trade", desc: "Orders & execution" },
  { href: "/markets", label: "Markets", desc: "Quotes & watchlists" },
  { href: "/desk?section=wallet", label: "Client wallet", desc: "Balances & deposits" },
  { href: "/algo-trading", label: "Algo desk", desc: "Strategies & signals" },
] as const;

const FEATURED_WORKSPACES = [
  {
    href: "/algo-trading",
    code: "ALG",
    title: "Algo Desk",
    desc: "Live strategy engine, signals, and paper execution",
  },
  {
    href: "/quant-lab",
    code: "QLB",
    title: "Quant Lab",
    desc: "Greeks, Monte Carlo, ML predictions, and backtests",
  },
  {
    href: "/research",
    code: "RSH",
    title: "Research",
    desc: "Strategy backtests, Sharpe, VaR, and quant library",
  },
  {
    href: "/desk?section=clients",
    code: "CLT",
    title: "Clients",
    desc: "Books, onboarding, and client master detail",
  },
  {
    href: "/wealth",
    code: "WLT",
    title: "Wealth books",
    desc: "Multi-book capital and allocation view",
  },
  {
    href: "/risk",
    code: "RSK",
    title: "Risk desk",
    desc: "VaR, beta, and concentration limits",
  },
] as const;

const MODULES = [
  { id: "WDG · 01", title: "Live market watch", content: <LiveMarketWatch /> },
  {
    id: "WDG · 02",
    title: "Global indices & commodities",
    content: <MarketIndices />,
  },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function LandingPage() {
  const reduce = useReducedMotion();
  const pageStagger = dashboardStagger(reduce, 0.07);
  const kpiStagger = dashboardStagger(reduce, 0.08);
  const item = fadeUp(reduce, 14);
  const moduleIn = scaleIn(reduce);
  const tagIn = fadeIn(reduce);
  const greet = useMemo(() => greeting(), []);

  return (
    <div className={styles.root}>
      <TickerTape />

      <motion.div
        className={styles.workspace}
        variants={pageStagger}
        initial="hidden"
        animate="show"
      >
        <motion.header className={styles.hero} variants={item} initial="hidden" animate="show">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>QuantDesk workspace</p>
            <h1 className={styles.pageTitle}>{greet}</h1>
            <p className={styles.pageDesc}>
              Trade, manage client wallets, and run algos from one desk. Everything in the sidebar is
              available — no page toggles required.
            </p>
          </div>
          <div className={styles.quickActions} aria-label="Quick actions">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className={styles.quickAction}>
                <span className={styles.quickActionLabel}>{action.label}</span>
                <span className={styles.quickActionDesc}>{action.desc}</span>
              </Link>
            ))}
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

        <motion.section
          className={styles.workspaceSection}
          aria-label="Features and workspaces"
          variants={item}
          initial="hidden"
          animate="show"
        >
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Features &amp; workspaces</h2>
            <p className={styles.sectionDesc}>
              Algo desk, quant tools, wallets, and client management.
            </p>
          </div>
          <motion.div
            className={`${styles.workspaceGrid} ${styles.workspaceGridSix}`}
            variants={kpiStagger}
            initial="hidden"
            animate="show"
          >
            {FEATURED_WORKSPACES.map((ws) => (
              <motion.div
                key={ws.href}
                variants={item}
                whileHover={reduce ? undefined : { y: -4, transition: { duration: 0.2 } }}
                whileTap={reduce ? undefined : { scale: 0.99 }}
              >
                <Link href={ws.href} className={styles.workspaceCard}>
                  <span className={styles.workspaceCode}>{ws.code}</span>
                  <span className={styles.workspaceCardTitle}>{ws.title}</span>
                  <span className={styles.workspaceCardDesc}>{ws.desc}</span>
                  <span className={styles.workspaceOpen}>Open →</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.div variants={item}>
          <ClientOnly>
            <EarningsCalendar compact />
          </ClientOnly>
        </motion.div>

        <motion.div variants={item}>
          <ClientOnly>
            <NewUserStockSuggestions />
          </ClientOnly>
        </motion.div>

        <div className={styles.contentStack}>
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
              <h2 className={styles.moduleTitle}>{mod.title}</h2>
              <div className={styles.moduleBody}>{mod.content}</div>
            </motion.section>
          ))}
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
