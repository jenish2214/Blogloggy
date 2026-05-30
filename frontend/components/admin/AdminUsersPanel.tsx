"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserRow } from "@/lib/admin/users";
import { AdminUserCard } from "@/components/admin/AdminUserCard";
import styles from "./admin.module.css";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
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
        setTotal(0);
        return;
      }
      setUsers(data.users ?? []);
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
          Every account from Supabase Auth — newest first, one card per user (no duplicates).
          Includes admin and all registered traders.
        </p>
      </header>

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
              <li>Copy the <strong>service_role</strong> secret (not the anon key)</li>
              <li>
                Paste into <code>frontend/.env.local</code>:
                <pre className={styles.setupCode}>SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret</pre>
              </li>
              <li>Restart the dev server (<code>npm run dev</code>)</li>
              <li>Click Refresh above</li>
            </ol>
          )}
        </div>
      )}

      {loading && users.length === 0 && !error && (
        <div className={styles.activityPanel}>
          <p className={styles.activityEmpty}>Loading users from Supabase…</p>
        </div>
      )}

      {!loading && users.length === 0 && !error && (
        <div className={styles.activityPanel}>
          <p className={styles.activityEmpty}>No users found in Supabase Auth yet.</p>
        </div>
      )}

      {users.length > 0 && (
        <div className={styles.userGrid}>
          {users.map((user, index) => (
            <AdminUserCard key={user.id} user={user} index={index} />
          ))}
        </div>
      )}
    </>
  );
}
