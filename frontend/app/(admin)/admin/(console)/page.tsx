import type { Metadata } from "next";
import Link from "next/link";
import { AdminModuleCard } from "@/components/admin/AdminModuleCard";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import {
  ADMIN_KPIS,
  ADMIN_MODULES,
  ADMIN_QUICK_ACTIONS,
} from "@/lib/admin/modules";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Platform overview</p>
        <h1 className={styles.pageTitle}>Admin dashboard</h1>
        <p className={styles.pageDesc}>
          Monitor platform health, manage users, and configure feature access across QuantDesk.
        </p>
      </header>

      <div className={styles.kpiGrid}>
        {ADMIN_KPIS.map((kpi) => (
          <AdminStatCard key={kpi.label} label={kpi.label} value={kpi.value} note={kpi.note} />
        ))}
      </div>

      <div className={styles.quickActions}>
        {ADMIN_QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} className={styles.quickAction}>
            {action.label} →
          </Link>
        ))}
      </div>

      <p className={styles.sectionTitle}>Management modules</p>
      <div className={styles.moduleGrid}>
        {ADMIN_MODULES.map((mod) => (
          <AdminModuleCard key={mod.href} module={mod} />
        ))}
      </div>

      <p className={styles.sectionTitle}>Recent activity</p>
      <div className={styles.activityPanel}>
        <p className={styles.activityEmpty}>
          Activity feed will appear here once user management is connected.
        </p>
      </div>
    </>
  );
}
