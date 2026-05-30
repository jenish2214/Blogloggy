import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { DashboardPortfolioHero } from "@/components/dashboard/DashboardPortfolioHero";
import type {
  DashboardAction,
  DashboardKpi,
  DashboardWorkspace,
} from "@/lib/dashboard/dashboardData";
import type {
  DashboardBenchmark,
  DashboardBookSummary,
  DashboardTotals,
} from "@/lib/dashboard/types";
import styles from "@/app/(platform)/dashboard.module.css";

export type DashboardViewProps = {
  greeting: string;
  subtitle?: string;
  kpis: DashboardKpi[];
  quickActions?: DashboardAction[];
  workspaces?: DashboardWorkspace[];
  portfolioTotals?: DashboardTotals | null;
  portfolioBooks?: DashboardBookSummary[];
  benchmark?: DashboardBenchmark | null;
  portfolioRefreshing?: boolean;
  scope?: "all" | "book";
  activePortfolioId?: string | null;
  personalAum?: number;
  clientAum?: number;
  guest?: boolean;
  earnings: ReactNode;
  suggestions?: ReactNode;
  marketWatch: ReactNode;
  marketIndices: ReactNode;
};

function TrendIcon({ direction }: { direction: DashboardKpi["changeDirection"] }) {
  if (direction === "down") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Reference-style analytics dashboard — data via props; motion via CSS */
export function DashboardView({
  greeting,
  subtitle = "",
  kpis,
  portfolioTotals,
  portfolioBooks = [],
  benchmark = null,
  portfolioRefreshing,
  scope = "all",
  activePortfolioId = null,
  personalAum = 0,
  clientAum = 0,
  guest = false,
  earnings,
  marketWatch,
  marketIndices,
}: DashboardViewProps) {
  return (
    <div className={styles.root}>
      <header className={`${styles.header} ${styles.fadeIn}`} style={{ "--i": 0 } as CSSProperties}>
        <div>
          <h1 className={styles.title}>{greeting}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        <div className={styles.headerActions}>
          <label className={styles.periodLabel}>
            <select className={styles.periodSelect} defaultValue="7d" aria-label="Time period">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </label>
        </div>
      </header>

      {portfolioTotals ? (
        <DashboardPortfolioHero
          totals={portfolioTotals}
          books={portfolioBooks}
          benchmark={benchmark}
          loading={portfolioRefreshing}
          scope={scope}
          activePortfolioId={activePortfolioId}
          personalAum={personalAum}
          clientAum={clientAum}
        />
      ) : null}

      <section className={styles.kpiRow} aria-label="Key metrics">
        {kpis.map((k, i) => (
          <article
            key={k.label}
            className={`${styles.kpiCard} ${styles.fadeIn}`}
            style={{ "--i": i + 1 } as CSSProperties}
          >
            <div className={styles.kpiTop}>
              <span className={styles.kpiIconWrap} aria-hidden>
                <span className={styles.kpiIconDot} />
              </span>
              <span className={styles.kpiLabel}>{k.label}</span>
            </div>
            <p className={styles.kpiValue}>{k.value}</p>
            {k.change ? (
              <span
                className={`${styles.kpiChange} ${
                  k.changeDirection === "down"
                    ? styles.kpiChangeDown
                    : k.changeDirection === "up"
                      ? styles.kpiChangeUp
                      : styles.kpiChangeNeutral
                }`}
              >
                <TrendIcon direction={k.changeDirection} />
                {k.change}
              </span>
            ) : null}
          </article>
        ))}
        <Link
          href="/trade"
          className={`${styles.addCard} ${styles.fadeIn}`}
          style={{ "--i": 5 } as CSSProperties}
          prefetch
        >
          <span className={styles.addIcon}>+</span>
          <span className={styles.addLabel}>New trade</span>
        </Link>
      </section>

      <section
        className={`${styles.panel} ${styles.chartPanel} ${styles.fadeIn}`}
        style={{ "--i": 6 } as CSSProperties}
        aria-labelledby="activity-heading"
      >
        <h2 id="activity-heading" className={styles.panelTitle}>
          {guest ? "Markets" : "Watchlist"}
        </h2>
        <div className={styles.widgetFade}>{marketWatch}</div>
      </section>

      {!guest ? (
        <div className={styles.bottomGrid}>
          <section
            className={`${styles.panel} ${styles.fadeIn}`}
            style={{ "--i": 9 } as CSSProperties}
            aria-labelledby="idx-heading"
          >
            <h2 id="idx-heading" className={styles.panelTitle}>
              Indices &amp; commodities
            </h2>
            <div className={styles.widgetFade}>{marketIndices}</div>
          </section>
          <section
            className={`${styles.panel} ${styles.fadeIn}`}
            style={{ "--i": 10 } as CSSProperties}
            aria-label="Earnings"
          >
            <h2 className={styles.panelTitle}>Earnings calendar</h2>
            <div className={styles.widgetFade}>{earnings}</div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
