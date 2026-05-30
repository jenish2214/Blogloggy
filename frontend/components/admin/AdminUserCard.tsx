import type { AdminUserRow } from "@/lib/admin/users";
import styles from "./admin.module.css";

function fmtDate(iso: string | null): string {
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

type Props = {
  user: AdminUserRow;
  index: number;
};

export function AdminUserCard({ user, index }: Props) {
  return (
    <article className={styles.userCard}>
      <header className={styles.userCardHead}>
        <div className={styles.userCardRank}>#{index + 1}</div>
        <div className={styles.userCardTitleBlock}>
          <h2 className={styles.userCardName}>{user.fullName}</h2>
          <p className={styles.userCardEmail}>{user.email}</p>
        </div>
        {user.isAdmin && <span className={styles.userBadgeAdmin}>Admin</span>}
      </header>

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
          <span className={styles.userStatValue}>{user.enabledFeatures.length}</span>
          <span className={styles.userStatLabel}>Features</span>
        </div>
      </div>

      <dl className={styles.userMeta}>
        <div>
          <dt>Registered</dt>
          <dd>{fmtDate(user.createdAt)}</dd>
        </div>
        <div>
          <dt>Last sign-in</dt>
          <dd>{fmtDate(user.lastSignInAt)}</dd>
        </div>
        <div>
          <dt>Last login event</dt>
          <dd>{fmtDate(user.lastLoginAt)}</dd>
        </div>
        <div>
          <dt>Last logout event</dt>
          <dd>{fmtDate(user.lastLogoutAt)}</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>
            {user.experienceLevel ?? "—"}
            {user.yearsExperience != null ? ` · ${user.yearsExperience}y` : ""}
          </dd>
        </div>
        <div>
          <dt>Onboarding</dt>
          <dd>{user.profileCompletedAt ? "Complete" : "Pending"}</dd>
        </div>
        <div>
          <dt>Terms</dt>
          <dd>{user.termsAcceptedAt ? fmtDate(user.termsAcceptedAt) : "Not accepted"}</dd>
        </div>
        <div>
          <dt>Email verified</dt>
          <dd>{user.emailConfirmed ? "Yes" : "No"}</dd>
        </div>
      </dl>

      {user.primaryInterest && (
        <p className={styles.userInterest}>
          Interest: <strong>{user.primaryInterest}</strong>
        </p>
      )}

      {user.enabledFeatures.length > 0 && (
        <div className={styles.userFeatures}>
          {user.enabledFeatures.map((f) => (
            <span key={f} className={styles.userFeatureTag}>
              {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      <footer className={styles.userCardFoot}>
        <code className={styles.userId}>{user.id}</code>
      </footer>
    </article>
  );
}
