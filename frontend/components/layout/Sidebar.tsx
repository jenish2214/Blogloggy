"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { signOutPlatform } from "@/lib/auth/signOut";
import type { User } from "@supabase/supabase-js";
import { SIDEBAR_NAV_SECTIONS } from "@/components/layout/sidebarNav";
import styles from "./Sidebar.module.css";

function isNavActive(path: string, search: URLSearchParams, href: string) {
  const [base, queryString] = href.split("?");
  const pathMatch = base === "/" ? path === "/" : path.startsWith(base!);
  if (!pathMatch) return false;
  if (!queryString) {
    if (base === "/desk" && search.has("section")) return false;
    return true;
  }
  const expected = new URLSearchParams(queryString);
  for (const [key, value] of expected.entries()) {
    if (search.get(key) !== value) return false;
  }
  return true;
}

export function Sidebar() {
  const path = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!hasSupabaseEnv());

  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/terms" ||
    path.startsWith("/welcome");

  useEffect(() => {
    if (isAuthPage) return;
    if (!hasSupabaseEnv()) {
      setAuthReady(true);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthPage]);

  const handleSignOut = () => {
    void signOutPlatform();
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
              <polyline
                points="3,16 7,10 11,13 15,6 19,9"
                stroke="#fff"
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <div className={styles.logoTitle}>QuantDesk</div>
            <div className={styles.logoSub}>Paper Trading</div>
          </div>
        </Link>
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {SIDEBAR_NAV_SECTIONS.map((section) => (
          <div key={section.title || "primary"} className={styles.navSection}>
            {section.title ? (
              <h2 className={`${styles.navSectionTitle} sidebar-label`}>{section.title}</h2>
            ) : null}
            {section.items.map(({ href, label, icon }) => {
              const isActive = isNavActive(path, searchParams, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  title={label}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  <span className="sidebar-label">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.liveRow} title="Live Market Data">
        <span className={styles.liveDot} aria-hidden />
        <span className={`sidebar-label ${styles.liveLabel}`}>Live Market Data</span>
      </div>

      <div className={styles.userBlock}>
        {authReady && user ? (
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
              <span className={styles.authIcon} aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="sidebar-label">Sign out</span>
            </button>
          </div>
        ) : (
          <div className={styles.authStack}>
            <Link href="/login" className={`btn btn-ghost btn-sm ${styles.authBtn}`} title="Sign In">
              <span className={styles.authIcon} aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </span>
              <span className="sidebar-label">Sign In</span>
            </Link>
            <Link href="/signup" className={`btn btn-primary btn-sm ${styles.authBtn}`} title="Sign Up Free">
              <span className={styles.authIcon} aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </span>
              <span className="sidebar-label">Sign Up Free</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
