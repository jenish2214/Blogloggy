"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, SUPABASE_CONFIG_ERROR } from "@/lib/supabase/client";
import { isAdminUser } from "@/lib/auth/admin";
import { logAuthEvent } from "@/lib/auth/logAuthEvent";
import { STATIC_ADMIN_EMAIL } from "@/lib/auth/staticAdmin";
import styles from "./admin.module.css";

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/admin";

  const [email, setEmail] = useState(STATIC_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);

  const goAdmin = () => {
    router.push(redirectTo.startsWith("/admin") ? redirectTo : "/admin");
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBootstrapMsg(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const supabase = createClient();

      if (supabase) {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!signInErr && isAdminUser(data.user)) {
          void logAuthEvent("login", "admin");
          goAdmin();
          return;
        }

        if (!signInErr && data.user) {
          await supabase.auth.signOut();
          setError("This account is not an admin. Click “Create admin in Supabase” or run npm run seed:admin.");
          return;
        }
      } else if (normalizedEmail !== STATIC_ADMIN_EMAIL) {
        setError(SUPABASE_CONFIG_ERROR);
        return;
      }

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (res.ok) {
        goAdmin();
        return;
      }

      const body = await res.json().catch(() => ({}));
      setError(
        normalizedEmail === STATIC_ADMIN_EMAIL
          ? `Login failed. Use password Admin@12345, or click “Create admin in Supabase” first.`
          : ((body as { error?: string }).error ?? "Invalid email or password")
      );
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    setBootstrapMsg(null);
    setError("");
    try {
      const res = await fetch("/api/admin/bootstrap", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bootstrap failed");
        if (data.hint) setBootstrapMsg(data.hint);
        return;
      }
      setBootstrapMsg(data.message ?? "Admin created. Sign in with admin@quantdesk.com / Admin@12345");
    } catch {
      setError("Bootstrap request failed");
    } finally {
      setBootstrapping(false);
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
            <p className={styles.loginSubtitle}>Supabase admin or dev static login</p>
          </div>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                Email address
              </label>
              <input
                className="input"
                type="email"
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
                placeholder="Admin@12345"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className={styles.loginError}>✗ {error}</div>}
            {bootstrapMsg && (
              <div style={{ padding: "10px 14px", background: "var(--up-soft)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", color: "var(--up)" }}>
                {bootstrapMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>

            <button
              type="button"
              disabled={bootstrapping}
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem" }}
              onClick={() => void handleBootstrap()}
            >
              {bootstrapping ? "Creating admin in Supabase…" : "Create admin in Supabase (first time)"}
            </button>
          </form>
        </div>

        <div className={styles.loginFooter}>
          <p>
            Default: <strong>{STATIC_ADMIN_EMAIL}</strong> / <strong>Admin@12345</strong>
            <br />
            Supabase login fails until admin is created — static dev login always works with these credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
