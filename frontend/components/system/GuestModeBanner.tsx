"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import styles from "./GuestModeBanner.module.css";

const DISMISS_KEY = "quantdesk:guest-banner-dismissed";
const GUEST_PATHS = ["/trade", "/portfolio", "/wealth"];

export function GuestModeBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    if (!GUEST_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;

    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;

    const check = async () => {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && !session) setVisible(true);
    };

    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setVisible(false);
      else if (!sessionStorage.getItem(DISMISS_KEY)) setVisible(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return <GuestBannerBody dismiss={dismiss} />;
}

function GuestBannerBody({ dismiss }: { dismiss: () => void }) {
  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>
        <strong>Guest mode</strong> — sign in to sync your portfolio.
      </p>
      <div className={styles.actions}>
        <Link href="/login" className={styles.signIn}>
          Sign in
        </Link>
        <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss guest mode notice">
          Dismiss
        </button>
      </div>
    </div>
  );
}
