"use client";

import Link from "next/link";
import { AccountProfileSection } from "@/components/account/AccountProfileSection";

export default function ProfilePage() {
  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: 6 }}>Account profile</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
          Your details, enabled pages, P&amp;L, and trade history.{" "}
          <Link href="/desk?section=broker" style={{ color: "var(--accent)" }}>
            Broker desk →
          </Link>
        </p>
      </div>
      <AccountProfileSection />
    </div>
  );
}
