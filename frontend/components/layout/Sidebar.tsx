"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { handleAuthSessionChange } from "@/lib/auth/tradingSession";
import { logAuthEvent } from "@/lib/auth/logAuthEvent";
import type { User } from "@supabase/supabase-js";
import { useFeatureAccess } from "@/lib/hooks/useFeatureAccess";
import { filterNavByAccess } from "@/lib/user/featureAccess";
import styles from "./Sidebar.module.css";

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
    href: "/quant-lab",
    label: "Quant Lab",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="M7 16l4-8 4 5 5-9"/>
      </svg>
    ),
  },
  {
    href: "/risk",
    label: "Risk Desk",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    href: "/screener",
    label: "Screener",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const { access: featureAccess } = useFeatureAccess();
  const navItems = filterNavByAccess(NAV, featureAccess);

  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/terms" ||
    path.startsWith("/welcome");

  useEffect(() => {
    if (isAuthPage) return;
    setMounted(true);
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    if (!supabase) return;

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
    if (!supabase) return;
    await logAuthEvent("logout", "platform");
    handleAuthSessionChange(null);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const username = user?.email?.split("@")[0] ?? "";

  if (isAuthPage) {
    return <style>{":root{--sidebar-w:0px !important}"}</style>;
  }

  return (
    <aside className="sidebar">
      <div className={styles.logoBlock}>
        <Link href="/" className={styles.logoLink} aria-label="QuantDesk home">
          <div className={styles.logoMark}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <polyline points="3,16 7,10 11,13 15,6 19,9" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <div className={styles.logoTitle}>QuantDesk</div>
            <div className={styles.logoSub}>Paper Trading</div>
          </div>
        </Link>
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {navItems.map(({ href, label, icon }) => {
          const base = href.split("?")[0];
          const isActive = base === "/" ? path === "/" : path.startsWith(base);

          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
              aria-label={label}
              title={label}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className="sidebar-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.liveRow} title="Live Market Data">
        <span className={styles.liveDot} aria-hidden />
        <span className={`sidebar-label ${styles.liveLabel}`}>Live Market Data</span>
      </div>

      {mounted && (
        <div className={styles.userBlock}>
          {user ? (
            <div className={styles.userStack}>
              <Link
                href="/profile"
                className={styles.profileLink}
                aria-label={`Profile: ${username}`}
                title={username}
              >
                <div className={styles.avatar}>{initials}</div>
                <div className={`sidebar-label ${styles.profileMeta}`}>
                  <div className={styles.profileName}>{username}</div>
                  <span className={styles.profileHint}>View profile →</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className={`btn btn-ghost btn-sm ${styles.signOutBtn}`}
                title="Sign out"
              >
                <span className="sidebar-label">Sign out</span>
              </button>
            </div>
          ) : (
            <div className={styles.authStack}>
              <Link href="/login" className={`btn btn-ghost btn-sm ${styles.authBtn}`} title="Sign In">
                <span className="sidebar-label">Sign In</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              </Link>
              <Link href="/signup" className={`btn btn-primary btn-sm ${styles.authBtn}`} title="Sign Up Free">
                <span className="sidebar-label">Sign Up Free</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
