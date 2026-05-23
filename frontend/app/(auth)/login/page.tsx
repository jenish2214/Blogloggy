"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { GoogleButton } from "@/components/ui/GoogleButton";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    await syncPortfolioFromCloud();
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <polyline points="3,16 7,10 11,13 15,6 19,9" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", lineHeight: 1.1 }}>QuantDesk</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>Paper Trading Platform</div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow-lg)",
      }}>
        {/* Card header */}
        <div style={{ padding: "24px 28px 20px" }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", marginBottom: 6 }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Access your paper trading portfolio
          </p>
        </div>

        <div style={{ padding: "0 28px" }}>
          <GoogleButton label="Continue with Google" />
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
              Email address
            </label>
            <input
              className="input"
              type="email"
              placeholder="trader@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Password
              </label>
            </div>
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

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "var(--down-soft)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.875rem",
              color: "var(--down)",
            }}>
              ✗ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "0.95rem", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>

          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                Sign up free
              </Link>
            </span>
          </div>
        </form>
      </div>

      {/* Demo hint */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          Free to sign up · $100,000 virtual capital · No real money
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
