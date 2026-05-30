import Link from "next/link";
import type { AdminModuleDef } from "@/lib/admin/modules";
import { AdminIcon } from "@/components/admin/AdminIcons";
import styles from "./admin.module.css";

type Props = {
  module: AdminModuleDef;
};

export function AdminModuleCard({ module }: Props) {
  return (
    <Link href={module.href} className={styles.moduleCard}>
      <div className={styles.moduleCardHead}>
        <div className={styles.moduleIcon}>
          <AdminIcon name={module.icon} />
        </div>
        <span
          className={`${styles.badge} ${
            module.status === "ready" ? styles.badgeReady : styles.badgeSoon
          }`}
        >
          {module.status === "ready" ? "Ready" : "Coming soon"}
        </span>
      </div>
      <h3 className={styles.moduleTitle}>{module.title}</h3>
      <p className={styles.moduleDesc}>{module.description}</p>
    </Link>
  );
}
