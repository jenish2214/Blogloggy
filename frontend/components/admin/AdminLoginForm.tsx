"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminUser } from "@/lib/auth/admin";
import { STATIC_ADMIN_EMAIL } from "@/lib/auth/staticAdmin";
import styles from "./admin.module.css";

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push(redirectTo.startsWith("/admin") ? redirectTo : "/admin");
        router.refresh();
        return;
      }

      const supabase = createClient();
      if (supabase) {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInErr && isAdminUser(data.user)) {
          router.push(redirectTo.startsWith("/admin") ? redirectTo : "/admin");
          router.refresh();
          return;
        }

        if (!signInErr && data.user) {
          await supabase.auth.signOut();
        }
      }

      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Invalid email or password");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginRoot}>
      <div className={styles.loginGrid} aria-hidden />
      <div className={styles.loginWrap}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: "var(--accent)",
              borderRadius: "var(--radius)",
              color: "#fff",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <polyline points="3,16 7,10 11,13 15,6 19,9" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>QuantDesk Admin</span>
          </div>
        </div>

        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <h1 className={styles.loginTitle}>Admin Console</h1>
            <p className={styles.loginSubtitle}>QuantDesk platform administration</p>
          </div>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Email address
              </label>
              <input
                className="input"
                type="email"
                placeholder={STATIC_ADMIN_EMAIL}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className={styles.loginError}>✗ {error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>

        <div className={styles.loginFooter}>
          <p>
            Dev static admin: <strong>{STATIC_ADMIN_EMAIL}</strong> / change via{" "}
            <code style={{ fontSize: "0.7rem" }}>ADMIN_EMAIL</code> and{" "}
            <code style={{ fontSize: "0.7rem" }}>ADMIN_PASSWORD</code> in{" "}
            <code style={{ fontSize: "0.7rem" }}>.env.local</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
