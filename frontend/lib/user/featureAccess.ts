import type { User } from "@supabase/supabase-js";

/** Keys stored in profile.feature_access / user_metadata.feature_access */
export const FEATURE_KEYS = [
  "dashboard",
  "markets",
  "trade",
  "portfolio",
  "desk",
  "wealth",
  "algo",
  "forex",
  "quant_lab",
  "risk",
  "screener",
  "research",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureAccessMap = Record<FeatureKey, boolean>;

export interface FeatureOption {
  key: FeatureKey;
  label: string;
  description: string;
  href: string;
  /** Shown in onboarding — core paths default on */
  defaultOn?: boolean;
}

export const FEATURE_OPTIONS: FeatureOption[] = [
  { key: "dashboard", label: "Dashboard", description: "Home overview and market snapshot", href: "/", defaultOn: true },
  { key: "markets", label: "Markets", description: "Live quotes, watchlists, and screeners", href: "/markets", defaultOn: true },
  { key: "trade", label: "Trade", description: "Paper trade stocks and crypto", href: "/trade", defaultOn: true },
  { key: "portfolio", label: "Portfolio", description: "Holdings, heatmap, and sector view", href: "/portfolio", defaultOn: true },
  { key: "desk", label: "Broker & Clients", description: "Client books and broker tools", href: "/desk" },
  { key: "wealth", label: "Wealth Desk", description: "Wallets and multi-book capital", href: "/wealth" },
  { key: "algo", label: "Algo Desk", description: "Strategy signals and automation UI", href: "/algo-trading" },
  { key: "forex", label: "Forex & Options", description: "FX and listed options workspace", href: "/forex-options" },
  { key: "quant_lab", label: "Quant Lab", description: "Greeks, Monte Carlo, ML hub, backtests", href: "/quant-lab" },
  { key: "risk", label: "Risk Desk", description: "VaR, beta, and concentration limits", href: "/risk" },
  { key: "screener", label: "Screener", description: "US equity filter workspace", href: "/screener" },
  { key: "research", label: "Research", description: "Digest and quant research library", href: "/research" },
];

export function defaultFeatureAccess(): FeatureAccessMap {
  return Object.fromEntries(
    FEATURE_OPTIONS.map((o) => [o.key, o.defaultOn === true])
  ) as FeatureAccessMap;
}

export function normalizeFeatureAccess(raw: unknown): FeatureAccessMap {
  const base = defaultFeatureAccess();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, boolean>;
  for (const key of FEATURE_KEYS) {
    if (typeof obj[key] === "boolean") base[key] = obj[key];
  }
  base.dashboard = true;
  return base;
}

/** All signed-in users see every workspace (no per-page gating). */
export function getFeatureAccessFromUser(_user: User | null | undefined): FeatureAccessMap {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])) as FeatureAccessMap;
}

export function isFeatureEnabled(
  access: FeatureAccessMap,
  pathname: string
): boolean {
  const path = pathname.split("?")[0]!;
  for (const opt of FEATURE_OPTIONS) {
    const base = opt.href.split("?")[0]!;
    const matches = base === "/" ? path === "/" : path.startsWith(base);
    if (matches) return access[opt.key];
  }
  return true;
}

/** Account profile is always available when signed in (not tied to Broker desk). */
export const PROFILE_PATH = "/profile";

export function featureKeyForPath(pathname: string): FeatureKey | null {
  const path = pathname.split("?")[0]!;
  if (path === PROFILE_PATH || path.startsWith(`${PROFILE_PATH}/`)) return null;
  for (const opt of FEATURE_OPTIONS) {
    const base = opt.href.split("?")[0]!;
    if (base === "/" ? path === "/" : path.startsWith(base)) return opt.key;
  }
  return null;
}

export function filterNavByAccess<T extends { href: string }>(
  items: T[],
  access: FeatureAccessMap
): T[] {
  return items.filter((item) => {
    const key = featureKeyForPath(item.href);
    if (!key) return true;
    return access[key];
  });
}
