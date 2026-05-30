import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/adminServer";
import {
  buildUserStats,
  countByUserId,
  mergeAuthUser,
} from "@/lib/admin/buildUserRows";
import type { AdminUserRow } from "@/lib/admin/users";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

const EMPTY_ID = "00000000-0000-0000-0000-000000000000";

async function loadAuthEventCounts(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[]
) {
  const empty = {
    loginCount: 0,
    logoutCount: 0,
    lastLoginAt: null as string | null,
    lastLogoutAt: null as string | null,
  };

  const map = new Map<string, typeof empty>();
  const filterIds = ids.length ? ids : [EMPTY_ID];

  const { data: eventCounts, error: countsErr } = await admin
    .from("user_auth_event_counts")
    .select("*")
    .in("user_id", filterIds);

  if (!countsErr && eventCounts) {
    for (const row of eventCounts) {
      map.set(row.user_id as string, {
        loginCount: Number(row.login_count ?? 0),
        logoutCount: Number(row.logout_count ?? 0),
        lastLoginAt: (row.last_login_at as string | null) ?? null,
        lastLogoutAt: (row.last_logout_at as string | null) ?? null,
      });
    }
    return map;
  }

  const { data: events } = await admin
    .from("user_auth_events")
    .select("user_id, event_type, created_at")
    .in("user_id", filterIds);

  for (const ev of events ?? []) {
    const uid = ev.user_id as string;
    const row = map.get(uid) ?? { ...empty };
    if (ev.event_type === "login") {
      row.loginCount += 1;
      const at = ev.created_at as string;
      if (!row.lastLoginAt || at > row.lastLoginAt) row.lastLoginAt = at;
    } else if (ev.event_type === "logout") {
      row.logoutCount += 1;
      const at = ev.created_at as string;
      if (!row.lastLogoutAt || at > row.lastLogoutAt) row.lastLogoutAt = at;
    }
    map.set(uid, row);
  }

  return map;
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
        total: 0,
        stats: buildUserStats([]),
      },
      { status: 503 }
    );
  }

  const admin = createAdminClient();

  const authUsers: Array<{
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
  const filterIds = ids.length ? ids : [EMPTY_ID];

  const [
    profilesRes,
    portfoliosRes,
    positionsRes,
    ordersRes,
    watchlistRes,
    messagesRes,
    alertsRes,
    clientsRes,
    eventCountsMap,
  ] = await Promise.all([
    admin.from("user_profiles").select("*").in("id", filterIds),
    admin.from("portfolios").select("user_id, cash, starting_capital").in("user_id", filterIds),
    admin.from("positions").select("user_id").in("user_id", filterIds),
    admin.from("orders").select("user_id").in("user_id", filterIds),
    admin.from("watchlist").select("user_id").in("user_id", filterIds),
    admin.from("messages").select("user_id").in("user_id", filterIds),
    admin.from("price_alerts").select("user_id").in("user_id", filterIds),
    admin.from("wealth_clients").select("advisor_id").in("advisor_id", filterIds),
    loadAuthEventCounts(admin, ids),
  ]);

  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const portfolioByUser = new Map(
    (portfoliosRes.data ?? []).map((p) => [p.user_id as string, p])
  );
  const positionCounts = countByUserId(positionsRes.data);
  const orderCounts = countByUserId(ordersRes.data);
  const watchlistCounts = countByUserId(watchlistRes.data);
  const messageCounts = countByUserId(messagesRes.data);
  const alertCounts = countByUserId(alertsRes.data);
  const clientCounts = countByUserId(
    (clientsRes.data ?? []).map((c) => ({ user_id: c.advisor_id as string }))
  );

  const byId = new Map<string, AdminUserRow>();

  for (const u of authUsers) {
    if (!u.id || byId.has(u.id)) continue;

    byId.set(
      u.id,
      mergeAuthUser(
        u,
        profileById.get(u.id) ?? null,
        eventCountsMap.get(u.id) ?? {
          loginCount: 0,
          logoutCount: 0,
          lastLoginAt: null,
          lastLogoutAt: null,
        },
        {
          portfolio: portfolioByUser.get(u.id) ?? null,
          positionCount: positionCounts.get(u.id) ?? 0,
          orderCount: orderCounts.get(u.id) ?? 0,
          watchlistCount: watchlistCounts.get(u.id) ?? 0,
          messageCount: messageCounts.get(u.id) ?? 0,
          alertCount: alertCounts.get(u.id) ?? 0,
          clientCount: clientCounts.get(u.id) ?? 0,
        }
      )
    );
  }

  const users = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({
    users,
    total: users.length,
    orderedBy: "created_at_desc",
    stats: buildUserStats(users),
  });
}
