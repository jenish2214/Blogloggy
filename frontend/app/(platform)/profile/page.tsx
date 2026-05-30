"use client";

import Link from "next/link";
import { AccountProfileSection } from "@/components/account/AccountProfileSection";
import styles from "./profile.module.css";

const SHORTCUTS = [
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/desk?section=wallet", label: "Client wallet" },
  { href: "/algo-trading", label: "Algo desk" },
  { href: "/desk?section=clients", label: "Clients" },
  { href: "/wealth", label: "Wealth" },
] as const;

export default function ProfilePage() {
  return (
    <div className="page">
      <header className={styles.header}>
        <div>
          <h1 className={styles.displayName} style={{ fontSize: "var(--text-2xl)", marginBottom: 6 }}>
            Profile
          </h1>
          <p className={styles.sectionSub}>
            Portfolio summary, trade history, and account details.
          </p>
        </div>
        <nav className={styles.metaRow} aria-label="Quick links">
          {SHORTCUTS.map(({ href, label }) => (
            <Link key={href} href={href} className="btn btn-ghost btn-sm">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <AccountProfileSection />
    </div>
  );
}
