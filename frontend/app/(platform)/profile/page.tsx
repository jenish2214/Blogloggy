"use client";

import Link from "next/link";
import { AccountProfileSection } from "@/components/account/AccountProfileSection";
import styles from "./profile.module.css";

const SHORTCUTS = [
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/desk?section=wallet", label: "Wallet" },
  { href: "/desk?section=clients", label: "Clients" },
  { href: "/algo-trading", label: "Algo desk" },
  { href: "/wealth", label: "Wealth" },
] as const;

export default function ProfilePage() {
  return (
    <div className={`page ${styles.pageWrap}`}>
      <header className={`${styles.header} page-enter-child`}>
        <div>
          <p className={styles.eyebrow}>Account</p>
          <h1 className={styles.displayName}>Profile</h1>
          <p className={styles.sectionSub}>
            See how many client mandates and assets you manage, each client&apos;s track record, and your
            active book trading history.
          </p>
        </div>
        <nav className={`${styles.shortcuts} stagger-in`} aria-label="Quick links">
          {SHORTCUTS.map(({ href, label }) => (
            <Link key={href} href={href} className={`${styles.shortcut} press-scale`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <AccountProfileSection />
    </div>
  );
}
