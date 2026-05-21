"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/ui/GoogleButton";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/markets";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
            <rect x="1" y="1" width="20" height="20" rx="3" stroke="var(--accent)" strokeWidth="1.5" />
            <polyline points="4,15 8,9 11,12 15,6 18,9" stroke="var(--accent-2)" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            QUANT<span style={{ color: "var(--accent-2)" }}>DESK</span>
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
          PAPER TRADING PLATFORM
        </p>
      </div>

      {/* Card */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            SIGN IN TO YOUR ACCOUNT
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Access your paper trading portfolio
          </p>
        </div>

        <div style={{ padding: "20px 24px 0" }}>
          <GoogleButton label="Continue with Google" />
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 4px" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ padding: "12px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Email Address
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
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
              padding: "8px 12px",
              background: "var(--down-soft)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--down)",
            }}>
              ✗ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              background: loading ? "var(--bg-elevated)" : "var(--accent)",
              color: loading ? "var(--text-muted)" : "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.9rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "var(--t-fast)",
            }}
          >
            {loading ? "AUTHENTICATING..." : "SIGN IN →"}
          </button>

          <div style={{ textAlign: "center", marginTop: 4 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              No account?{" "}
              <Link href="/signup" style={{ color: "var(--accent-2)", textDecoration: "none", fontWeight: 500 }}>
                Create one free →
              </Link>
            </span>
          </div>
        </form>
      </div>

      {/* Demo hint */}
      <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--accent-soft)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--accent-2)" }}>
          📊 Sign up free · $100,000 virtual capital · No real money involved
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
