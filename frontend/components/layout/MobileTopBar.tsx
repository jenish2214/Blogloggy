"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import styles from "./MobileTopBar.module.css";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Sign up" },
];

export function MobileTopBar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  }, [path]);

  if (isAuthPage) return null;

  const navItems = user
    ? NAV.filter((item) => item.href !== "/login" && item.href !== "/signup")
    : NAV;

  return (
    <header className={`mobile-header ${styles.bar}`}>
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

      {!user && (
        <div className={styles.inlineAuth}>
          <Link href="/login" className={`btn btn-ghost btn-sm ${styles.inlineBtn}`}>
            Sign in
          </Link>
          <Link href="/signup" className={`btn btn-primary btn-sm ${styles.inlineBtn}`}>
            Sign up
          </Link>
        </div>
      )}

      <button
        type="button"
        className={styles.menuBtn}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {open ? (
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

      {open && (
        <nav className={styles.drawer} aria-label="Mobile navigation">
          {navItems.map(({ href, label }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.drawerLink} ${active ? styles.drawerLinkActive : ""}`}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            );
          })}
          {user ? (
            <Link href="/profile" className={styles.drawerLink} onClick={() => setOpen(false)}>
              Profile
            </Link>
          ) : (
            <div className={styles.drawerAuth}>
              <Link href="/login" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary" onClick={() => setOpen(false)}>
                Sign up free
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
