"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { useSidebar } from "@/components/layout/SidebarContext";
import type { User } from "@supabase/supabase-js";
import styles from "./MobileTopBar.module.css";

export function MobileTopBar() {
  const path = usePathname();
  const { mobileOpen, openMobile, closeMobile } = useSidebar();
  const [user, setUser] = useState<User | null>(null);

  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/terms" ||
    path.startsWith("/welcome") ||
    path.startsWith("/auth/");

  useEffect(() => {
    if (isAuthPage) return;
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));

    return () => subscription.unsubscribe();
  }, [isAuthPage]);

  useEffect(() => {
    closeMobile();
  }, [path, closeMobile]);

  if (isAuthPage) return null;

  const toggleMenu = () => {
    if (mobileOpen) closeMobile();
    else openMobile();
  };

  return (
    <header className={`mobile-header ${styles.bar}`}>
      <button
        type="button"
        className={styles.menuBtn}
        onClick={toggleMenu}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {mobileOpen ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>

      <Link href="/" className={styles.brand} aria-label="QuantDesk home">
        <span className={styles.brandMark}>
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none" aria-hidden>
            <polyline
              points="3,16 7,10 11,13 15,6 19,9"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className={styles.brandText}>QuantDesk</span>
      </Link>

      {!user ? (
        <div className={styles.inlineAuth}>
          <Link href="/login" className={`btn btn-ghost btn-sm ${styles.inlineBtn}`}>
            Sign in
          </Link>
          <Link href="/signup" className={`btn btn-primary btn-sm ${styles.inlineBtn}`}>
            Sign up
          </Link>
        </div>
      ) : (
        <Link href="/profile" className={styles.profileChip} aria-label="Profile">
          {user.email?.slice(0, 2).toUpperCase() ?? "ME"}
        </Link>
      )}
    </header>
  );
}
