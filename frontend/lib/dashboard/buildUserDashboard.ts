import type {
  DashboardAction,
  DashboardKpi,
  DashboardWorkspace,
} from "@/lib/dashboard/dashboardData";
import {
  DASHBOARD_QUICK_ACTIONS,
  DASHBOARD_WORKSPACES,
} from "@/lib/dashboard/dashboardData";
import { fmtPct, fmtUsd } from "@/lib/trading/portfolioSnapshot";
import type { DashboardSummaryPayload } from "@/lib/dashboard/types";

const WORKSPACE_ACTIVITY: Record<
  string,
  (a: DashboardSummaryPayload["activity"], p: DashboardSummaryPayload["portfolio"]) => number
> = {
  markets: (a) => (a.watchlistSymbols > 0 ? 100 : 25),
  trade: (_a, p) => (p.orderCount > 0 ? Math.min(100, 35 + p.orderCount * 8) : 20),
  portfolio: (_a, p) =>
    p.openPositions > 0 ? Math.min(100, 40 + p.openPositions * 12) : 15,
  "algo-trading": (_a, p) => (p.orderCount >= 3 ? 72 : p.orderCount > 0 ? 48 : 18),
  "quant-lab": (_a, p) => (p.openPositions > 0 ? 58 : 12),
  research: (_a, p) => (p.orderCount > 0 ? 64 : 12),
  wallet: (a) => (a.walletTransactions > 0 ? Math.min(100, 50 + a.walletTransactions * 10) : 20),
  clients: (a) =>
    a.clientBooks > 0 ? Math.min(100, 45 + a.clientBooks * 15) : 10,
  wealth: (a, p) =>
    a.clientBooks > 0 || p.openPositions > 0
      ? Math.min(100, 40 + a.clientBooks * 20)
      : 15,
};

function progressForHref(
  href: string,
  activity: DashboardSummaryPayload["activity"],
  portfolio: DashboardSummaryPayload["portfolio"]
): number {
  if (href.includes("wallet")) return WORKSPACE_ACTIVITY.wallet!(activity, portfolio);
  if (href.includes("clients")) return WORKSPACE_ACTIVITY.clients!(activity, portfolio);
  const key = href.split("?")[0]!.replace(/^\//, "") || "markets";
  const fn = WORKSPACE_ACTIVITY[key] ?? (() => 30);
  return fn(activity, portfolio);
}

function assignShares(workspaces: DashboardWorkspace[]): DashboardWorkspace[] {
  const scores = workspaces.map((w) => w.progress ?? 1);
  const total = scores.reduce((s, n) => s + n, 0) || 1;
  return workspaces.map((w, i) => ({
    ...w,
    share: Math.max(1, Math.round(((scores[i] ?? 1) / total) * 100)),
  }));
}

export function buildGuestDashboard() {
  return {
    greeting: "Dashboard",
    subtitle: "Sign in to see your total portfolio value with live market prices",
    kpis: null as DashboardKpi[] | null,
    workspaces: DASHBOARD_WORKSPACES,
    quickActions: DASHBOARD_QUICK_ACTIONS,
    totals: null,
    books: [],
    benchmark: null,
  };
}

export function buildDashboardFromSummary(data: DashboardSummaryPayload) {
  if (data.guest) return buildGuestDashboard();

  const name =
    data.profile?.fullName?.trim() ||
    data.user?.displayName?.trim() ||
    data.user?.email?.split("@")[0] ||
    "there";

  const { portfolio: p, activity: a, totals: t, benchmark } = data;
  const pnlDir: DashboardKpi["changeDirection"] =
    t.totalPnlPct > 0.05 ? "up" : t.totalPnlPct < -0.05 ? "down" : "neutral";

  const vsMarket =
    benchmark != null ? t.totalPnlPct - benchmark.changePct : null;
  const vsMarketDir: DashboardKpi["changeDirection"] =
    vsMarket == null ? "neutral" : vsMarket > 0.1 ? "up" : vsMarket < -0.1 ? "down" : "neutral";

  const kpis: DashboardKpi[] = [
    {
      label: "Total portfolio",
      value: fmtUsd(t.totalPortfolioValue),
      note: `${t.bookCount} book${t.bookCount === 1 ? "" : "s"} · live API prices`,
      trend: "All accounts",
      change: fmtPct(t.totalPnlPct),
      changeDirection: pnlDir,
    },
    {
      label: "Total P&L",
      value: fmtUsd(t.totalPnl, { signed: true }),
      note: `Started ${fmtUsd(t.totalStartingCapital)}`,
      trend: "vs cost basis",
      change: fmtPct(t.totalPnlPct),
      changeDirection: pnlDir,
    },
    {
      label: benchmark ? `vs ${benchmark.name}` : "Unrealized",
      value:
        benchmark && vsMarket != null
          ? `${vsMarket >= 0 ? "+" : ""}${vsMarket.toFixed(2)}%`
          : fmtUsd(t.unrealizedPnl, { signed: true }),
      note: benchmark
        ? `Market ${fmtPct(benchmark.changePct)} today · you ${fmtPct(t.totalPnlPct)}`
        : `${t.openPositions} open positions`,
      trend: benchmark ? "Alpha" : "Holdings",
      change: benchmark ? fmtPct(benchmark.changePct) : fmtUsd(t.totalInvested),
      changeDirection: vsMarketDir,
    },
    {
      label: "Cash & invested",
      value: fmtUsd(t.totalCash),
      note: `${fmtUsd(t.totalInvested)} in markets`,
      trend: p.accountLabel,
      change: `${p.orderCount} orders`,
      changeDirection: "neutral",
    },
  ];

  const workspaces = assignShares(
    DASHBOARD_WORKSPACES.map((ws) => ({
      ...ws,
      progress: progressForHref(ws.href, a, p),
      desc: personalizeDesc(ws.href, data),
    }))
  ).sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));

  const subtitle = [
    `Total ${fmtUsd(t.totalPortfolioValue)}`,
    t.totalPnl !== 0 ? `${fmtUsd(t.totalPnl, { signed: true })} all-time P&L` : null,
    benchmark ? `${benchmark.name} ${fmtPct(benchmark.changePct)} today` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    greeting: `Welcome back, ${name}`,
    subtitle,
    kpis,
    workspaces,
    quickActions: DASHBOARD_QUICK_ACTIONS,
    totals: t,
    books: data.books,
    benchmark,
  };
}

function personalizeDesc(href: string, data: DashboardSummaryPayload): string {
  const { portfolio: p, activity: a } = data;
  if (href === "/portfolio" && p.openPositions > 0) {
    return `${p.openPositions} open position${p.openPositions === 1 ? "" : "s"} · ${fmtUsd(p.invested)} market value`;
  }
  if (href === "/trade" && p.orderCount > 0) {
    return `${p.orderCount} paper order${p.orderCount === 1 ? "" : "s"} on your book`;
  }
  if (href === "/markets" && a.watchlistSymbols > 0) {
    return `${a.watchlistSymbols} symbol${a.watchlistSymbols === 1 ? "" : "s"} on your watchlist`;
  }
  if (href.includes("wallet") && a.walletTransactions > 0) {
    return `${a.walletTransactions} wallet movement${a.walletTransactions === 1 ? "" : "s"}`;
  }
  if (href.includes("clients") && a.clientBooks > 0) {
    return `${a.clientBooks} active client book${a.clientBooks === 1 ? "" : "s"}`;
  }
  const base = DASHBOARD_WORKSPACES.find((w) => w.href === href);
  return base?.desc ?? "";
}
