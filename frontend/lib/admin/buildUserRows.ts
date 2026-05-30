import { FEATURE_KEYS } from "@/lib/user/featureAccess";
import type { AdminUserRow, AdminUserStats } from "@/lib/admin/users";

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  years_experience?: number | null;
  experience_level?: string | null;
  primary_interest?: string | null;
  feature_access?: unknown;
  terms_accepted_at?: string | null;
  profile_completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function pickName(profile: ProfileRow | null, meta: Record<string, unknown>): string {
  const fromProfile = profile?.full_name?.trim();
  if (fromProfile) return fromProfile;
  const fromMeta =
    (meta.full_name as string)?.trim() ||
    (meta.display_name as string)?.trim() ||
    (meta.name as string)?.trim();
  return fromMeta || "—";
}

export function featureLists(raw: unknown): { enabled: string[]; disabled: string[] } {
  const enabled: string[] = [];
  const disabled: string[] = [];
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};

  for (const key of FEATURE_KEYS) {
    if (obj[key] === true) enabled.push(key);
    else if (obj[key] === false) disabled.push(key);
  }
  return { enabled, disabled };
}

export function authProvider(user: AuthUser): string {
  const id = user.identities?.[0]?.provider;
  if (id) return id;
  const provider = user.app_metadata?.provider;
  if (typeof provider === "string") return provider;
  return "email";
}

export function countByUserId<T extends { user_id?: string }>(
  rows: T[] | null | undefined
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    const id = row.user_id;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export function buildUserStats(users: AdminUserRow[]): AdminUserStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  return {
    totalUsers: users.length,
    activeToday: users.filter((u) => {
      const ts = u.lastSignInAt || u.lastLoginAt;
      return ts ? new Date(ts).getTime() >= todayMs : false;
    }).length,
    onboardedUsers: users.filter((u) => Boolean(u.profileCompletedAt)).length,
    adminUsers: users.filter((u) => u.isAdmin).length,
    openPositions: users.reduce((s, u) => s + u.positionCount, 0),
    totalOrders: users.reduce((s, u) => s + u.orderCount, 0),
    pendingAlerts: users.reduce((s, u) => s + u.alertCount, 0),
  };
}

export function mergeAuthUser(
  u: AuthUser,
  profile: ProfileRow | null,
  counts: {
    loginCount: number;
    logoutCount: number;
    lastLoginAt: string | null;
    lastLogoutAt: string | null;
  },
  aggregates: {
    portfolio?: { cash?: number; starting_capital?: number } | null;
    positionCount: number;
    orderCount: number;
    watchlistCount: number;
    messageCount: number;
    alertCount: number;
    clientCount: number;
  }
): AdminUserRow {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const featureAccess = profile?.feature_access ?? meta.feature_access;
  const { enabled, disabled } = featureLists(featureAccess);

  return {
    id: u.id,
    email: u.email ?? "—",
    phone: u.phone ?? null,
    fullName: pickName(profile, meta),
    createdAt: u.created_at ?? new Date(0).toISOString(),
    updatedAt: u.updated_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
    emailConfirmed: Boolean(u.email_confirmed_at),
    isAdmin: u.app_metadata?.role === "admin",
    authProvider: authProvider(u),
    experienceLevel: profile?.experience_level ?? (meta.experience_level as string) ?? null,
    yearsExperience:
      profile?.years_experience != null
        ? Number(profile.years_experience)
        : meta.years_experience != null
          ? Number(meta.years_experience)
          : null,
    primaryInterest: profile?.primary_interest ?? (meta.primary_interest as string) ?? null,
    profileCompletedAt:
      profile?.profile_completed_at ?? (meta.profile_completed_at as string) ?? null,
    profileCreatedAt: profile?.created_at ?? null,
    profileUpdatedAt: profile?.updated_at ?? null,
    termsAcceptedAt: profile?.terms_accepted_at ?? null,
    onboardingAppliedAt: (meta.onboarding_applied_at as string) ?? null,
    loginCount: counts.loginCount,
    logoutCount: counts.logoutCount,
    lastLoginAt: counts.lastLoginAt ?? u.last_sign_in_at ?? null,
    lastLogoutAt: counts.lastLogoutAt,
    enabledFeatures: enabled,
    disabledFeatures: disabled,
    portfolioCash: aggregates.portfolio?.cash != null ? Number(aggregates.portfolio.cash) : null,
    startingCapital:
      aggregates.portfolio?.starting_capital != null
        ? Number(aggregates.portfolio.starting_capital)
        : null,
    positionCount: aggregates.positionCount,
    orderCount: aggregates.orderCount,
    watchlistCount: aggregates.watchlistCount,
    messageCount: aggregates.messageCount,
    alertCount: aggregates.alertCount,
    clientCount: aggregates.clientCount,
  };
}
