"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import { GoogleButton } from "@/components/ui/GoogleButton";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split("@")[0] } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    await syncPortfolioFromCloud();
    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/welcome/terms"), 2000);
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
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>QuantDesk</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>Paper Trading Platform</div>
          </div>
        </div>
      </div>

      <div style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ padding: "24px 28px 20px" }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Start with $100,000 virtual capital — free
          </p>
        </div>

        {success ? (
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bg-surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "1.5rem", color: "var(--text-primary)" }}>✓</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Account created!</div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Redirecting to markets…</div>
          </div>
        ) : (
          <>
            <div style={{ padding: "0 28px" }}>
              <GoogleButton label="Sign up with Google" />
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
            </div>

            <form onSubmit={handleSignup} style={{ padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                  Display name <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
                </label>
                <input className="input" type="text" placeholder="e.g. AlphaTrader" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>Email address</label>
                <input className="input" type="email" placeholder="trader@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>Password</label>
                <input className="input" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
                <div style={{ fontSize: "0.75rem", color: password.length === 0 ? "var(--text-muted)" : password.length < 8 ? "var(--down)" : password.length < 12 ? "var(--warn)" : "var(--up)", marginTop: 5, fontWeight: 500 }}>
                  {password.length === 0 ? "Enter a password" : password.length < 8 ? "Too short" : password.length < 12 ? "Moderate strength" : "Strong password ✓"}
                </div>
              </div>

              {error && (
                <div style={{ padding: "10px 14px", background: "var(--down-soft)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", color: "var(--down)" }}>
                  ✗ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "0.95rem", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Creating account…" : "Create account →"}
              </button>

              {/* What you get */}
              <div style={{ padding: "14px 16px", background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  "$100,000 paper capital instantly",
                  "Live stock & crypto prices",
                  "Options chain + Black-Scholes Greeks",
                  "Backtest any strategy",
                  "Trade history synced to cloud",
                ].map((f) => (
                  <div key={f} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: 8, fontWeight: 500 }}>
                    <span style={{ color: "var(--text-primary)" }}>✓</span> {f}
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Already have an account?{" "}
                  <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                    Sign in
                  </Link>
                </span>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
