"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminUserRow, AdminUserStats } from "@/lib/admin/users";
import { AdminModuleCard } from "@/components/admin/AdminModuleCard";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ADMIN_MODULES, ADMIN_QUICK_ACTIONS } from "@/lib/admin/modules";
import styles from "./admin.module.css";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminDashboardPanel() {
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [recent, setRecent] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not load dashboard data");
          return;
        }
        setStats(data.stats ?? null);
        setRecent((data.users ?? []).slice(0, 6));
      } catch {
        setError("Could not load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpis = stats
    ? [
        { label: "Total users", value: String(stats.totalUsers), note: "Supabase Auth accounts" },
        { label: "Active today", value: String(stats.activeToday), note: "Signed in last 24h" },
        { label: "Open positions", value: String(stats.openPositions), note: "Across all books" },
        { label: "Total orders", value: String(stats.totalOrders), note: "Paper trades placed" },
      ]
    : [
        { label: "Total users", value: loading ? "…" : "—", note: "Supabase Auth accounts" },
        { label: "Active today", value: loading ? "…" : "—", note: "Signed in last 24h" },
        { label: "Open positions", value: loading ? "…" : "—", note: "Across all books" },
        { label: "Total orders", value: loading ? "…" : "—", note: "Paper trades placed" },
      ];

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Platform overview</p>
        <h1 className={styles.pageTitle}>Admin dashboard</h1>
        <p className={styles.pageDesc}>
          Live stats from Supabase — users, sessions, portfolios, and orders.
        </p>
      </header>

      {error && (
        <div className={styles.usersError}>
          <p>{error}</p>
          <p className={styles.usersErrorHint}>
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to .env.local to load live data.
          </p>
        </div>
      )}

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <AdminStatCard key={kpi.label} label={kpi.label} value={kpi.value} note={kpi.note} />
        ))}
      </div>

      <div className={styles.quickActions}>
        {ADMIN_QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} className={styles.quickAction}>
            {action.label} →
          </Link>
        ))}
      </div>

      <p className={styles.sectionTitle}>Recent users (newest first)</p>
      {loading ? (
        <div className={styles.activityPanel}>
          <p className={styles.activityEmpty}>Loading user details…</p>
        </div>
      ) : recent.length === 0 ? (
        <div className={styles.activityPanel}>
          <p className={styles.activityEmpty}>No users yet.</p>
        </div>
      ) : (
        <div className={styles.userTableWrap}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Registered</th>
                <th>Logins</th>
                <th>Orders</th>
                <th>Positions</th>
                <th>Cash</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{u.fullName}</strong>
                    {u.isAdmin && <span className={styles.tableAdmin}>Admin</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>{u.loginCount}</td>
                  <td>{u.orderCount}</td>
                  <td>{u.positionCount}</td>
                  <td>
                    {u.portfolioCash != null
                      ? u.portfolioCash.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                  <td>{u.profileCompletedAt ? "Onboarded" : "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/admin/users" className={styles.viewAllLink}>
            View all users with full details →
          </Link>
        </div>
      )}

      <p className={styles.sectionTitle}>Management modules</p>
      <div className={styles.moduleGrid}>
        {ADMIN_MODULES.map((mod) => (
          <AdminModuleCard key={mod.href} module={mod} />
        ))}
      </div>
    </>
  );
}
