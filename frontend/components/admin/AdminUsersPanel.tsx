"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminUserRow, AdminUserStats } from "@/lib/admin/users";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminUserCard } from "@/components/admin/AdminUserCard";
import styles from "./admin.module.css";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load users");
        setHint(data.hint ?? null);
        setUsers([]);
        setStats(data.stats ?? null);
        setTotal(0);
        return;
      }
      setUsers(data.users ?? []);
      setStats(data.stats ?? null);
      setTotal(data.total ?? 0);
    } catch {
      setError("Failed to load users");
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>User directory</p>
        <h1 className={styles.pageTitle}>Users</h1>
        <p className={styles.pageDesc}>
          Full Supabase Auth + profile + trading details per user. Newest registered first — one
          card per account, no duplicates.
        </p>
      </header>

      {stats && (
        <div className={styles.kpiGrid}>
          <AdminStatCard label="Total users" value={String(stats.totalUsers)} note="Supabase Auth" />
          <AdminStatCard label="Active today" value={String(stats.activeToday)} note="Signed in today" />
          <AdminStatCard label="Onboarded" value={String(stats.onboardedUsers)} note="Profile complete" />
          <AdminStatCard label="Open positions" value={String(stats.openPositions)} note="All portfolios" />
        </div>
      )}

      <div className={styles.usersToolbar}>
        <span className={styles.usersCount}>
          {loading ? "Loading…" : `${total} unique user${total === 1 ? "" : "s"}`}
        </span>
        <button type="button" className={styles.quickAction} onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && (
        <div className={styles.usersError}>
          <p>{error}</p>
          {hint && <p className={styles.usersErrorHint}>{hint}</p>}
          {error.includes("SUPABASE_SERVICE_ROLE_KEY") && (
            <ol className={styles.setupSteps}>
              <li>
                Open{" "}
                <a
                  href="https://supabase.com/dashboard/project/jarxgqxgcrucsbgggjoo/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Supabase → Settings → API
                </a>
              </li>
              <li>Copy the <strong>service_role</strong> secret</li>
              <li>
                Add to <code>frontend/.env.local</code> and restart dev server
              </li>
            </ol>
          )}
        </div>
      )}

      {loading && users.length === 0 && !error && (
        <div className={styles.activityPanel}>
          <p className={styles.activityEmpty}>Loading all user details from Supabase…</p>
        </div>
      )}

      {!loading && users.length === 0 && !error && (
        <div className={styles.activityPanel}>
          <p className={styles.activityEmpty}>No users in Supabase Auth yet.</p>
          <Link href="/admin/login" className={styles.quickAction} style={{ marginTop: 12, display: "inline-flex" }}>
            Run seed:admin →
          </Link>
        </div>
      )}

      {users.length > 0 && (
        <div className={styles.userGrid}>
          {users.map((user, index) => (
            <AdminUserCard key={user.id} user={user} index={index} onChanged={load} />
          ))}
        </div>
      )}
    </>
  );
}
