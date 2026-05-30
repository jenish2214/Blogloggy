"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { logAuthEvent } from "@/lib/auth/logAuthEvent";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/markets", label: "MARKETS" },
  { href: "/trade", label: "TRADE" },
  { href: "/portfolio", label: "PORTFOLIO" },
  { href: "/options", label: "OPTIONS" },
  { href: "/research", label: "RESEARCH" },
];

export function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));

    // Fetch unread count
    const fetchUnread = async () => {
      const u = await supabase.auth.getUser();
      if (!u.data.user) return;
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("user_id", u.data.user.id).eq("read", false);
      setUnread(count ?? 0);
    };
    fetchUnread();

    // Subscribe to new messages
    const channel = supabase.channel("messages_count").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { fetchUnread(); }).subscribe();

    return () => { subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (!supabase) return;
    await logAuthEvent("logout", "platform");
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, height: "var(--navbar-h)", background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", zIndex: 1000, display: "flex", alignItems: "center", padding: "0 24px", gap: 20, boxShadow: "0 1px 0 var(--border)" }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <rect x="1" y="1" width="20" height="20" rx="3" stroke="var(--accent)" strokeWidth="1.5" />
          <polyline points="4,15 8,9 11,12 15,6 18,9" stroke="var(--accent-2)" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            QUANT<span style={{ color: "var(--accent)" }}>DESK</span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid rgba(79,70,229,0.2)", padding: "1px 5px", borderRadius: 3 }}>
            PAPER
          </span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: "flex", gap: 0, flex: 1 }} className="hide-mobile">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", color: path === href ? "var(--accent)" : "var(--text-secondary)", textDecoration: "none", padding: "4px 10px", borderRadius: 2, borderBottom: path === href ? "2px solid var(--accent)" : "2px solid transparent", transition: "var(--t-fast)" }}>
            {label}
          </Link>
        ))}
      </nav>

      {/* Right section */}
      {mounted && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexShrink: 0 }} className="hide-mobile">
          {user ? (
            <>
              {/* Messages bell */}
              <Link href="/messages" style={{ position: "relative", textDecoration: "none", display: "flex", alignItems: "center" }}>
                <div style={{ padding: "4px 8px", background: unread > 0 ? "var(--accent-soft)" : "transparent", border: "1px solid " + (unread > 0 ? "rgba(79,70,229,0.25)" : "var(--border)"), borderRadius: 3, cursor: "pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={unread > 0 ? "var(--accent-2)" : "var(--text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                {unread > 0 && (
                  <span style={{ position: "absolute", top: -2, right: -2, background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              {/* Avatar + menu */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: 4, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: 26, height: 26, borderRadius: 4, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>
                  {initials}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-secondary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email?.split("@")[0]}
                </span>
              </div>

              <button onClick={handleSignOut} className="btn btn-ghost btn-sm" style={{ fontSize: "0.65rem" }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Sign Up Free</Link>
            </>
          )}
        </div>
      )}

      {/* Live dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} className="hide-mobile">
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--up)", boxShadow: "0 0 5px var(--up)", display: "inline-block", animation: "pulse 2s infinite" }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>LIVE</span>
      </div>

      {/* Mobile hamburger */}
      <button className="hide-desktop" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", padding: 4, marginLeft: "auto" }} aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          {menuOpen ? <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /> : <><rect y="4" width="20" height="1.5" rx="1" /><rect y="9" width="20" height="1.5" rx="1" /><rect y="14" width="20" height="1.5" rx="1" /></>}
        </svg>
      </button>

      {menuOpen && (
        <div style={{ position: "fixed", top: "var(--navbar-h)", left: 0, right: 0, background: "#fff", borderBottom: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 4, zIndex: 999, boxShadow: "var(--shadow)" }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 500, letterSpacing: "0.08em", color: path === href ? "var(--accent)" : "var(--text-secondary)", textDecoration: "none", padding: "10px 14px", borderRadius: 4, background: path === href ? "var(--accent-soft)" : "transparent" }}>
              {label}
            </Link>
          ))}
          {mounted && user ? (
            <button onClick={handleSignOut} className="btn btn-ghost" style={{ marginTop: 8, width: "100%" }}>Sign Out</button>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Link href="/login" className="btn btn-ghost" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>Sign In</Link>
              <Link href="/signup" className="btn btn-primary" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
