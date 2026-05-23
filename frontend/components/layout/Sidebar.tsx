"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleAuthSessionChange } from "@/lib/auth/tradingSession";
import type { User } from "@supabase/supabase-js";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/markets",
    label: "Markets",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: "/trade",
    label: "Trade",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
      </svg>
    ),
  },
  {
    href: "/desk",
    label: "Broker & Clients",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: "/wealth",
    label: "Wealth Desk",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    href: "/algo-trading",
    label: "Algo Desk",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
  },
  {
    href: "/forex-options",
    label: "Forex & Options",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        <path d="M12 8v8M8 12h8"/>
      </svg>
    ),
  },
  {
    href: "/research",
    label: "Research",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
      </svg>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/terms" ||
    path.startsWith("/welcome");

  useEffect(() => {
    // Auth pages: no supabase subscription needed
    if (isAuthPage) return;
    setMounted(true);
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setUser(session?.user ?? null)
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthPage]);

  const handleSignOut = async () => {
    const supabase = createClient();
    handleAuthSessionChange(null);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const username = user?.email?.split("@")[0] ?? "";

  // Auth pages: inject CSS override so app-main has no left margin
  if (isAuthPage) {
    return <style>{":root{--sidebar-w:0px !important}"}</style>;
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          {/* Logo mark */}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <polyline points="3,16 7,10 11,13 15,6 19,9" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <div style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              QuantDesk
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1 }}>Paper Trading</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ href, label, icon }) => {
          const base = href.split("?")[0];
          const isActive = base === "/" ? path === "/" : path.startsWith(base);

          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                background: isActive ? "var(--accent)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.9rem",
                transition: "var(--t-fast)",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-surface-2)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <span style={{ flexShrink: 0 }}>{icon}</span>
              <span className="sidebar-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Live data indicator */}
      <div style={{
        padding: "12px 20px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--live)",
          boxShadow: "0 0 0 2px rgba(16,185,129,0.15)",
          display: "inline-block",
          animation: "pulse 2s infinite",
          flexShrink: 0,
        }} />
        <span className="sidebar-label" style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
          Live Market Data
        </span>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }`}</style>
      </div>

      {/* User section */}
      {mounted && (
        <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
          {user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link
                href="/desk?section=profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  transition: "var(--t-fast)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700, color: "#fff",
                  flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div className="sidebar-label" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {username}
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    View profile →
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn btn-ghost btn-sm sidebar-label"
                style={{ justifyContent: "center", margin: "0 2px" }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 2px" }}>
              <Link href="/login" className="btn btn-ghost btn-sm" style={{ justifyContent: "center" }}>
                <span className="sidebar-label">Sign In</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm" style={{ justifyContent: "center" }}>
                <span className="sidebar-label">Sign Up Free</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
