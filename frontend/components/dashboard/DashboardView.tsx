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
  quickActions: DashboardAction[];
  workspaces: DashboardWorkspace[];
  portfolioTotals?: DashboardTotals | null;
  portfolioBooks?: DashboardBookSummary[];
  benchmark?: DashboardBenchmark | null;
  portfolioRefreshing?: boolean;
  earnings: ReactNode;
  suggestions: ReactNode;
  marketWatch: ReactNode;
  marketIndices: ReactNode;
};

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

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
  subtitle = "Paper trading overview · live market data",
  kpis,
  quickActions,
  workspaces,
  portfolioTotals,
  portfolioBooks = [],
  benchmark = null,
  portfolioRefreshing,
  earnings,
  suggestions,
  marketWatch,
  marketIndices,
}: DashboardViewProps) {
  const breakdown = workspaces.filter((w) => w.share != null).slice(0, 6);
  const donutStops = breakdown
    .reduce<{ parts: string[]; acc: number }>(
      (state, ws, i) => {
        const end = state.acc + (ws.share ?? 0);
        state.parts.push(`${CHART_COLORS[i % CHART_COLORS.length]} ${state.acc}% ${end}%`);
        return { parts: state.parts, acc: end };
      },
      { parts: [] as string[], acc: 0 }
    )
    .parts.join(", ");

  return (
    <div className={styles.root}>
      <header className={`${styles.header} ${styles.fadeIn}`} style={{ "--i": 0 } as CSSProperties}>
        <div>
          <h1 className={styles.title}>{greeting}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.periodLabel}>
            <span className={styles.periodText}>Time period</span>
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
            <p className={styles.kpiNote}>{k.note}</p>
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

      <div className={styles.mainGrid}>
        <section
          className={`${styles.panel} ${styles.chartPanel} ${styles.fadeIn}`}
          style={{ "--i": 6 } as CSSProperties}
          aria-labelledby="activity-heading"
        >
          <div className={styles.panelHead}>
            <h2 id="activity-heading" className={styles.panelTitle}>
              Market activity
            </h2>
            <span className={styles.panelBadge}>Live</span>
          </div>
          <div className={styles.widgetFade}>{marketWatch}</div>
        </section>

        <aside
          className={`${styles.panel} ${styles.sidePanel} ${styles.fadeIn}`}
          style={{ "--i": 7 } as CSSProperties}
          aria-labelledby="breakdown-heading"
        >
          <h2 id="breakdown-heading" className={styles.panelTitle}>
            Workspace usage
          </h2>
          <div className={styles.donutRow}>
            <div
              className={styles.donut}
              style={{ background: donutStops ? `conic-gradient(${donutStops})` : undefined }}
              aria-hidden
            />
            <ul className={styles.legend}>
              {breakdown.map((ws, i) => (
                <li key={ws.href}>
                  <span className={styles.legendDot} style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className={styles.legendLabel}>{ws.title}</span>
                  <span className={styles.legendPct}>{ws.share}%</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className={styles.rankList}>
            {workspaces.slice(0, 5).map((ws) => (
              <li key={ws.href}>
                <Link href={ws.href} className={styles.rankRow} prefetch>
                  <span className={styles.rankName}>{ws.title}</span>
                  <div className={styles.rankBarTrack}>
                    <span
                      className={styles.rankBarFill}
                      style={{ width: `${ws.progress ?? 0}%` }}
                    />
                  </div>
                  <span className={styles.rankVal}>{ws.progress}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section
        className={`${styles.panel} ${styles.fadeIn}`}
        style={{ "--i": 8 } as CSSProperties}
        aria-label="Quick actions"
      >
        <h2 className={styles.panelTitle}>Quick actions</h2>
        <div className={styles.quickGrid}>
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className={styles.quickCard} prefetch>
              <span className={styles.quickTitle}>{a.label}</span>
              <span className={styles.quickDesc}>{a.desc}</span>
            </Link>
          ))}
        </div>
      </section>

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

      <section
        className={`${styles.panel} ${styles.fadeIn}`}
        style={{ "--i": 11 } as CSSProperties}
        aria-labelledby="ws-table-heading"
      >
        <div className={styles.panelHead}>
          <h2 id="ws-table-heading" className={styles.panelTitle}>
            All workspaces
          </h2>
          <Link href="/markets" className={styles.viewAll}>
            View all →
          </Link>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Description</th>
                <th scope="col">Ready</th>
                <th scope="col" className={styles.thRight}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr key={ws.href}>
                  <td>
                    <span className={styles.moduleName}>{ws.title}</span>
                    <span className={styles.moduleCode}>{ws.code}</span>
                  </td>
                  <td className={styles.cellMuted}>{ws.desc}</td>
                  <td>
                    <span className={styles.readyBadge}>{ws.progress ?? 0}%</span>
                  </td>
                  <td className={styles.thRight}>
                    <Link href={ws.href} className={styles.linkBtn} prefetch>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={`${styles.panel} ${styles.fadeIn}`}
        style={{ "--i": 12 } as CSSProperties}
        aria-label="Suggestions"
      >
        <h2 className={styles.panelTitle}>Suggestions</h2>
        <div className={styles.widgetFade}>{suggestions}</div>
      </section>

      <p className={`${styles.disclaimer} ${styles.fadeIn}`} style={{ "--i": 13 } as CSSProperties}>
        Paper trading only. Not investment advice.
      </p>
    </div>
  );
}
