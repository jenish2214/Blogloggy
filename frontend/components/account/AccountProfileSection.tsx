"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { handleAuthSessionChange } from "@/lib/auth/tradingSession";
import type { User } from "@supabase/supabase-js";
import { PnlStatementPanel } from "@/components/trading/PnlStatementPanel";
import { OrderHistoryTable } from "@/components/trading/OrderHistoryTable";
import {
  loadPortfolioSnapshot,
  INITIAL_CASH,
  type PortfolioSnapshot,
} from "@/lib/trading/portfolioSnapshot";
import { subscribeOrderPlaced } from "@/lib/trading/orderEvents";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { ProfilePreferencesSection } from "@/components/account/ProfilePreferencesSection";
import styles from "@/app/(platform)/profile/profile.module.css";

type Tab = "statement" | "orders";
type OrderFilter = "all" | "buy" | "sell";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtUsd(n: number) {
  const sign = n >= 0 ? "" : "−";
  return `${sign}$${fmt(Math.abs(n))}`;
}

function fmtPnl(n: number) {
  return `${n >= 0 ? "+" : "−"}$${fmt(Math.abs(n))}`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function pnlClass(n: number) {
  return n >= 0 ? styles.plRowGain : styles.plRowLoss;
}

export function AccountProfileSection() {
  const router = useRouter();
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("statement");
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    if (!hasSupabaseEnv()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) setMemberSince(u.created_at ?? null);
    setSnapshot(await loadPortfolioSnapshot());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
    return subscribeOrderPlaced(() => void loadProfile());
  }, [loadProfile, activeBook?.portfolioId, activeBook?.clientId]);

  if (loading && !snapshot) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading profile…</p>;
  }

  const pnl = snapshot?.pnl;
  const orders = snapshot?.orders ?? [];
  const cash = snapshot?.cash ?? INITIAL_CASH;
  const investedValue = snapshot?.investedValue ?? 0;
  const unrealizedPnl = snapshot?.unrealizedPnl ?? 0;
  const totalValue = snapshot?.totalValue ?? cash;
  const totalPnl = snapshot?.totalPnl ?? 0;
  const totalPnlPct = snapshot?.totalPnlPct ?? 0;
  const ordersPlacedLabel = snapshot?.orderCount ?? orders.length;

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.display_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Guest Trader";
  const email = user?.email ?? "Not signed in";
  const initials = (displayName.slice(0, 2) || "??").toUpperCase();

  const handleSignOut = async () => {
    const supabase = createClient();
    if (!supabase) return;
    handleAuthSessionChange(null);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div>
      <div className={styles.profileCard} style={{ marginBottom: 16 }}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.profileMeta}>
          <h2 className={styles.displayName}>{displayName}</h2>
          <p className={styles.email}>{email}</p>
          {activeBook && (
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Active book: <strong>{activeBook.label}</strong>
            </p>
          )}
          {memberSince && (
            <span className={styles.metaItem}>
              Member since <strong>{fmtDateShort(memberSince)}</strong>
            </span>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {user && (
              <button type="button" onClick={() => void handleSignOut()} className="btn btn-ghost btn-sm">
                Sign out
              </button>
            )}
            {!user && (
              <Link href="/login" className="btn btn-primary btn-sm">
                Sign in
              </Link>
            )}
            <button type="button" onClick={() => void loadProfile()} className="btn btn-ghost btn-sm">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {user && <ProfilePreferencesSection />}

      <div className={styles.statsGrid} style={{ marginBottom: 16 }}>
        {[
          { label: "Portfolio Value", value: fmtUsd(totalValue) },
          { label: "Total P&L", value: fmtPnl(totalPnl), color: totalPnl >= 0 ? "var(--up)" : "var(--down)" },
          { label: "Cash", value: fmtUsd(cash) },
          { label: "Orders", value: String(ordersPlacedLabel) },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className={styles.statLabel}>{label}</div>
            <div className={styles.statValue} style={{ color: color ?? "var(--text-primary)" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tabs} style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === "statement" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("statement")}
        >
          P&L Statement
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === "orders" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("orders")}
        >
          Trades ({ordersPlacedLabel})
        </button>
      </div>

      {tab === "statement" && pnl ? (
        <PnlStatementPanel
          openingBalance={INITIAL_CASH}
          totalBuyVolume={pnl.totalBuyVolume}
          totalSellVolume={pnl.totalSellVolume}
          realizedPnl={pnl.realizedPnl}
          unrealizedPnl={unrealizedPnl}
          cash={cash}
          investedValue={investedValue}
          totalValue={totalValue}
          totalPnl={totalPnl}
          totalPnlPct={totalPnlPct}
          buyCount={pnl.buyCount}
          sellCount={pnl.sellCount}
          compact
        />
      ) : (
        <>
          <div className={styles.tabs} style={{ marginBottom: 12 }}>
            {(["all", "buy", "sell"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? `All (${orders.length})` : f === "buy" ? `Buys` : `Sells`}
              </button>
            ))}
          </div>
          <OrderHistoryTable orders={orders} filter={filter} showRowNumbers emptyMessage="No trades yet." />
        </>
      )}
    </div>
  );
}
