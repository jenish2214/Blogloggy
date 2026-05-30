"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/admin/modules";
import { AdminIcon } from "@/components/admin/AdminIcons";
import styles from "./admin.module.css";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AdminSidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarMark}>
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <polyline points="3,16 7,10 11,13 15,6 19,9" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div className={styles.sidebarTitle}>QuantDesk Admin</div>
          <div className={styles.sidebarSub}>Platform console</div>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Admin navigation">
        {ADMIN_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              onClick={onClose}
            >
              <AdminIcon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
