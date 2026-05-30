export type AdminNavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "users" | "features" | "trading" | "wealth" | "alerts" | "messages" | "system" | "legal";
};

export type AdminModuleDef = {
  href: string;
  title: string;
  description: string;
  tier: "core" | "operations" | "platform";
  status: "ready" | "coming_soon";
  icon: AdminNavItem["icon"];
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/features", label: "Feature Access", icon: "features" },
  { href: "/admin/trading", label: "Trading Monitor", icon: "trading" },
  { href: "/admin/wealth", label: "Wealth & Clients", icon: "wealth" },
  { href: "/admin/alerts", label: "Alerts", icon: "alerts" },
  { href: "/admin/messages", label: "Messages", icon: "messages" },
  { href: "/admin/system", label: "System Health", icon: "system" },
  { href: "/admin/legal", label: "Legal & Compliance", icon: "legal" },
];

export const ADMIN_MODULES: AdminModuleDef[] = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Search users, view profiles, and onboarding status.",
    tier: "core",
    status: "coming_soon",
    icon: "users",
  },
  {
    href: "/admin/features",
    title: "Feature Access",
    description: "Toggle per-user desk modules and platform capabilities.",
    tier: "core",
    status: "coming_soon",
    icon: "features",
  },
  {
    href: "/admin/trading",
    title: "Trading Monitor",
    description: "Read-only view of orders, positions, and portfolios.",
    tier: "core",
    status: "coming_soon",
    icon: "trading",
  },
  {
    href: "/admin/wealth",
    title: "Wealth & Clients",
    description: "Advisors, client books, and broker profiles.",
    tier: "operations",
    status: "coming_soon",
    icon: "wealth",
  },
  {
    href: "/admin/alerts",
    title: "Alerts",
    description: "Price alerts across all users.",
    tier: "operations",
    status: "coming_soon",
    icon: "alerts",
  },
  {
    href: "/admin/messages",
    title: "Messages",
    description: "System notifications and in-app messages.",
    tier: "operations",
    status: "coming_soon",
    icon: "messages",
  },
  {
    href: "/admin/system",
    title: "System Health",
    description: "API health checks and live metrics.",
    tier: "platform",
    status: "coming_soon",
    icon: "system",
  },
  {
    href: "/admin/legal",
    title: "Legal & Compliance",
    description: "Terms acceptance and onboarding audit trail.",
    tier: "platform",
    status: "coming_soon",
    icon: "legal",
  },
];

export const ADMIN_KPIS = [
  { label: "Total users", value: "—", note: "All registered accounts" },
  { label: "Active today", value: "—", note: "Sessions in last 24h" },
  { label: "Open positions", value: "—", note: "Across all portfolios" },
  { label: "Pending alerts", value: "—", note: "Active price alerts" },
] as const;

export const ADMIN_QUICK_ACTIONS = [
  { href: "/admin/users", label: "View users" },
  { href: "/admin/features", label: "Feature flags" },
  { href: "/admin/system", label: "System health" },
] as const;
