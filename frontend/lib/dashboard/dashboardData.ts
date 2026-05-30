/** Dashboard data — edit values here; layout is fixed in DashboardView */

export type DashboardKpi = {
  label: string;
  value: string;
  note: string;
  trend?: string;
  change?: string;
  changeDirection?: "up" | "down" | "neutral";
};

export type DashboardAction = {
  href: string;
  label: string;
  desc: string;
};

export type DashboardWorkspace = {
  href: string;
  code: string;
  title: string;
  desc: string;
  progress?: number;
  /** Share weight for sidebar breakdown chart (optional) */
  share?: number;
};

export const DASHBOARD_KPIS: DashboardKpi[] = [
  {
    label: "Paper capital",
    value: "$100,000",
    note: "Virtual balance",
    trend: "Paper",
    change: "+0.0%",
    changeDirection: "neutral",
  },
  {
    label: "Universe",
    value: "5,000+",
    note: "Symbols tracked",
    trend: "Live",
    change: "+2.5%",
    changeDirection: "up",
  },
  {
    label: "Market data",
    value: "Live",
    note: "Streaming quotes",
    trend: "Connected",
    change: "+0.5%",
    changeDirection: "up",
  },
  {
    label: "Workspaces",
    value: "12+",
    note: "All modules open",
    trend: "Active",
    change: "−0.2%",
    changeDirection: "down",
  },
];

export const DASHBOARD_QUICK_ACTIONS: DashboardAction[] = [
  { href: "/trade", label: "Trade", desc: "Orders & execution" },
  { href: "/markets", label: "Markets", desc: "Quotes & watchlists" },
  { href: "/desk?section=wallet", label: "Client wallet", desc: "Balances & deposits" },
  { href: "/algo-trading", label: "Algo desk", desc: "Strategies & signals" },
];

export const DASHBOARD_WORKSPACES: DashboardWorkspace[] = [
  {
    href: "/markets",
    code: "MKT",
    title: "Markets",
    desc: "Live quotes, watchlists, and symbol search",
    progress: 100,
    share: 18,
  },
  {
    href: "/trade",
    code: "TRD",
    title: "Trade",
    desc: "Place and manage paper orders",
    progress: 100,
    share: 16,
  },
  {
    href: "/portfolio",
    code: "PRT",
    title: "Portfolio",
    desc: "Holdings, P&L, and allocation view",
    progress: 100,
    share: 14,
  },
  {
    href: "/algo-trading",
    code: "ALG",
    title: "Algo Desk",
    desc: "Strategy engine and paper execution",
    progress: 72,
    share: 12,
  },
  {
    href: "/quant-lab",
    code: "QLB",
    title: "Quant Lab",
    desc: "Greeks, Monte Carlo, and backtests",
    progress: 58,
    share: 10,
  },
  {
    href: "/research",
    code: "RSH",
    title: "Research",
    desc: "Backtests, Sharpe, and quant library",
    progress: 64,
    share: 9,
  },
  {
    href: "/desk?section=wallet",
    code: "WAL",
    title: "Client wallet",
    desc: "Deposits and client capital",
    progress: 85,
    share: 8,
  },
  {
    href: "/desk?section=clients",
    code: "CLT",
    title: "Clients",
    desc: "Books and client master detail",
    progress: 45,
    share: 7,
  },
  {
    href: "/wealth",
    code: "WLT",
    title: "Wealth",
    desc: "Multi-book capital view",
    progress: 51,
    share: 6,
  },
];

export function dashboardGreeting(): string {
  return "Dashboard";
}
