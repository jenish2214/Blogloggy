"use client";

import { useState } from "react";
import type { AdminUserRow } from "@/lib/admin/users";
import { FEATURE_OPTIONS } from "@/lib/user/featureAccess";
import { AdminUserEditModal } from "@/components/admin/AdminUserEditModal";
import styles from "./admin.module.css";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function featureLabel(key: string): string {
  return FEATURE_OPTIONS.find((f) => f.key === key)?.label ?? key.replace(/_/g, " ");
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.userDetail}>
      <dt>{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}

type Props = {
  user: AdminUserRow;
  index: number;
  onChanged: () => void;
};

export function AdminUserCard({ user, index, onChanged }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initials = user.fullName !== "—" ? user.fullName.slice(0, 2).toUpperCase() : "??";

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Remove ${user.fullName} (${user.email}) from Supabase Auth? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "Delete failed");
        return;
      }
      onChanged();
    } catch {
      window.alert("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <article className={styles.userCard}>
        <header className={styles.userCardHead}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userCardTitleBlock}>
            <div className={styles.userCardRank}>User #{index + 1}</div>
            <h2 className={styles.userCardName}>{user.fullName}</h2>
            <p className={styles.userCardEmail}>{user.email}</p>
          </div>
          <div className={styles.userBadges}>
            {user.isAdmin && <span className={styles.userBadgeAdmin}>Admin</span>}
            <span className={styles.userBadgeProvider}>{user.authProvider}</span>
          </div>
        </header>

        <div className={styles.userActions}>
          <button type="button" className={styles.userActionBtn} onClick={() => setEditOpen(true)}>
            Update
          </button>
          <button
            type="button"
            className={`${styles.userActionBtn} ${styles.userActionDanger}`}
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>

        <div className={styles.userStatRow}>
          <div className={styles.userStat}>
            <span className={styles.userStatValue}>{user.loginCount}</span>
            <span className={styles.userStatLabel}>Logins</span>
          </div>
          <div className={styles.userStat}>
            <span className={styles.userStatValue}>{user.logoutCount}</span>
            <span className={styles.userStatLabel}>Logouts</span>
          </div>
          <div className={styles.userStat}>
            <span className={styles.userStatValue}>{user.orderCount}</span>
            <span className={styles.userStatLabel}>Orders</span>
          </div>
          <div className={styles.userStat}>
            <span className={styles.userStatValue}>{user.positionCount}</span>
            <span className={styles.userStatLabel}>Positions</span>
          </div>
        </div>

        <section className={styles.userSection}>
          <h3 className={styles.userSectionTitle}>Account & auth</h3>
          <dl className={styles.userMeta}>
            <Detail label="User ID" value={<code className={styles.inlineCode}>{user.id}</code>} />
            <Detail label="Phone" value={user.phone} />
            <Detail label="Email verified" value={user.emailConfirmed ? "Yes" : "No"} />
            <Detail label="Auth provider" value={user.authProvider} />
            <Detail label="Registered" value={fmtDate(user.createdAt)} />
            <Detail label="Last sign-in" value={fmtDate(user.lastSignInAt)} />
            <Detail label="Last login event" value={fmtDate(user.lastLoginAt)} />
            <Detail label="Last logout event" value={fmtDate(user.lastLogoutAt)} />
          </dl>
        </section>

        <section className={styles.userSection}>
          <h3 className={styles.userSectionTitle}>Profile & onboarding</h3>
          <dl className={styles.userMeta}>
            <Detail label="Experience level" value={user.experienceLevel} />
            <Detail
              label="Years experience"
              value={user.yearsExperience != null ? `${user.yearsExperience} years` : null}
            />
            <Detail label="Primary interest" value={user.primaryInterest} />
            <Detail label="Onboarding" value={user.profileCompletedAt ? "Complete" : "Pending"} />
            <Detail label="Terms accepted" value={fmtDate(user.termsAcceptedAt)} />
          </dl>
        </section>

        <section className={styles.userSection}>
          <h3 className={styles.userSectionTitle}>Trading & activity</h3>
          <dl className={styles.userMeta}>
            <Detail label="Portfolio cash" value={fmtMoney(user.portfolioCash)} />
            <Detail label="Open positions" value={String(user.positionCount)} />
            <Detail label="Total orders" value={String(user.orderCount)} />
            <Detail label="Watchlist" value={String(user.watchlistCount)} />
            <Detail label="Messages" value={String(user.messageCount)} />
            <Detail label="Alerts" value={String(user.alertCount)} />
            <Detail label="Clients" value={String(user.clientCount)} />
          </dl>
        </section>

        <section className={styles.userSection}>
          <h3 className={styles.userSectionTitle}>Feature access</h3>
          <div className={styles.userFeatures}>
            {user.enabledFeatures.map((f) => (
              <span key={f} className={`${styles.userFeatureTag} ${styles.userFeatureOn}`}>
                {featureLabel(f)}
              </span>
            ))}
            {user.enabledFeatures.length === 0 && (
              <span className={styles.userEmptyNote}>Defaults</span>
            )}
          </div>
        </section>
      </article>

      <AdminUserEditModal
        user={user}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={onChanged}
      />
    </>
  );
}
