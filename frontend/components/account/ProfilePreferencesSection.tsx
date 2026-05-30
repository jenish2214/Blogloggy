"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/supabase/client";
import styles from "@/app/(platform)/profile/profile.module.css";

interface ProfileRow {
  full_name?: string;
  years_experience?: number | null;
  experience_level?: string | null;
  primary_interest?: string | null;
  profile_completed_at?: string | null;
}

export function ProfilePreferencesSection() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setLoading(false);
      return;
    }
    void fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (j.profile) setProfile(j.profile);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className={styles.sectionSub}>Loading account details…</p>;
  }

  if (!profile?.full_name) {
    return (
      <div className={styles.panel} style={{ padding: 16 }}>
        <p className={styles.sectionSub} style={{ margin: 0 }}>
          Add your name and preferences during{" "}
          <Link href="/welcome/profile" style={{ color: "var(--accent)" }}>
            onboarding
          </Link>
          , or they will appear here once saved.
        </p>
      </div>
    );
  }

  return (
    <section className={styles.section} aria-label="Account details">
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Account details</h2>
          <p className={styles.sectionSub}>From your onboarding profile</p>
        </div>
        <Link href="/welcome/profile" className="btn btn-ghost btn-sm">
          Edit
        </Link>
      </div>
      <dl className={styles.panel} style={{ margin: 0, padding: "4px 0" }}>
        <table className={styles.summaryTable}>
          <tbody>
            <tr>
              <td className={styles.summaryLabel}>Name</td>
              <td className={styles.summaryValue}>{profile.full_name}</td>
            </tr>
            {profile.years_experience != null && (
              <tr>
                <td className={styles.summaryLabel}>Experience</td>
                <td className={styles.summaryValue}>
                  {profile.years_experience} years · {profile.experience_level ?? "—"}
                </td>
              </tr>
            )}
            {profile.primary_interest && (
              <tr>
                <td className={styles.summaryLabel}>Primary interest</td>
                <td className={styles.summaryValue}>{profile.primary_interest}</td>
              </tr>
            )}
          </tbody>
        </table>
      </dl>
    </section>
  );
}
