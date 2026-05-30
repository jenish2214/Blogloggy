import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/adminServer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

import type { AdminUserRow } from "@/lib/admin/users";

function pickName(
  profile: { full_name?: string | null } | null,
  meta: Record<string, unknown>
): string {
  const fromProfile = profile?.full_name?.trim();
  if (fromProfile) return fromProfile;
  const fromMeta =
    (meta.full_name as string)?.trim() ||
    (meta.display_name as string)?.trim() ||
    (meta.name as string)?.trim();
  return fromMeta || "—";
}

function enabledFeatures(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, boolean>)
    .filter(([, on]) => on === true)
    .map(([key]) => key);
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured",
        hint: "Add it to .env.local to load users from Supabase Auth.",
        users: [] as AdminUserRow[],
      },
      { status: 503 }
    );
  }

  const admin = createAdminClient();

  const authUsers: Array<{
    id: string;
    email?: string;
    created_at?: string;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }> = [];

  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    authUsers.push(...(data.users ?? []));
    if ((data.users?.length ?? 0) < perPage) break;
    page += 1;
  }

  const ids = authUsers.map((u) => u.id);

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("*")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: eventCounts, error: countsErr } = await admin
    .from("user_auth_event_counts")
    .select("*")
    .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  let countsByUser = new Map<
    string,
    {
      loginCount: number;
      logoutCount: number;
      lastLoginAt: string | null;
      lastLogoutAt: string | null;
    }
  >();

  if (!countsErr && eventCounts) {
    countsByUser = new Map(
      eventCounts.map((row) => [
        row.user_id as string,
        {
          loginCount: Number(row.login_count ?? 0),
          logoutCount: Number(row.logout_count ?? 0),
          lastLoginAt: (row.last_login_at as string | null) ?? null,
          lastLogoutAt: (row.last_logout_at as string | null) ?? null,
        },
      ])
    );
  } else {
    const { data: events } = await admin
      .from("user_auth_events")
      .select("user_id, event_type, created_at")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    for (const ev of events ?? []) {
      const uid = ev.user_id as string;
      const row = countsByUser.get(uid) ?? {
        loginCount: 0,
        logoutCount: 0,
        lastLoginAt: null as string | null,
        lastLogoutAt: null as string | null,
      };
      if (ev.event_type === "login") {
        row.loginCount += 1;
        const at = ev.created_at as string;
        if (!row.lastLoginAt || at > row.lastLoginAt) row.lastLoginAt = at;
      } else if (ev.event_type === "logout") {
        row.logoutCount += 1;
        const at = ev.created_at as string;
        if (!row.lastLogoutAt || at > row.lastLogoutAt) row.lastLogoutAt = at;
      }
      countsByUser.set(uid, row);
    }
  }

  const byId = new Map<string, AdminUserRow>();

  for (const u of authUsers) {
    if (!u.id || byId.has(u.id)) continue;

    const profile = profileById.get(u.id) ?? null;
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const counts = countsByUser.get(u.id);

    byId.set(u.id, {
      id: u.id,
      email: u.email ?? "—",
      fullName: pickName(profile, meta),
      createdAt: u.created_at ?? new Date(0).toISOString(),
      lastSignInAt: u.last_sign_in_at ?? null,
      emailConfirmed: Boolean(u.email_confirmed_at),
      isAdmin: u.app_metadata?.role === "admin",
      experienceLevel: profile?.experience_level ?? (meta.experience_level as string) ?? null,
      yearsExperience:
        profile?.years_experience != null
          ? Number(profile.years_experience)
          : meta.years_experience != null
            ? Number(meta.years_experience)
            : null,
      primaryInterest: profile?.primary_interest ?? (meta.primary_interest as string) ?? null,
      profileCompletedAt: profile?.profile_completed_at ?? (meta.profile_completed_at as string) ?? null,
      termsAcceptedAt: profile?.terms_accepted_at ?? null,
      loginCount: counts?.loginCount ?? 0,
      logoutCount: counts?.logoutCount ?? 0,
      lastLoginAt: counts?.lastLoginAt ?? u.last_sign_in_at ?? null,
      lastLogoutAt: counts?.lastLogoutAt ?? null,
      enabledFeatures: enabledFeatures(profile?.feature_access ?? meta.feature_access),
    });
  }

  const users = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({
    users,
    total: users.length,
    orderedBy: "created_at_desc",
  });
}
