import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 16 }}>Privacy</h1>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
        QuantDesk is a paper-trading platform. We do not offer brokerage services or hold real funds.
      </p>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>Data we store</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          When you sign in, account and portfolio data are stored in your Supabase project (configured by the operator).
          Market quotes may be fetched from third-party APIs. We do not sell personal data.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>Local data</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Guest and offline use may cache portfolio state in your browser (localStorage) until you sign in and sync.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>Security</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Row-level security in Postgres limits each user to their own rows. Use a strong password and keep API keys out of client code except the public anon key.
        </p>
      </section>

      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--accent)", fontWeight: 600 }}>
        ← Back to dashboard
      </Link>
    </div>
  );
}
