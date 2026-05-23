"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomePageShell } from "@/components/legal/WelcomePageShell";
import {
  EDUCATION_NOTICE,
  QUANTDESK_MOTTO,
  QUANTDESK_PURPOSE,
} from "@/lib/legal/brand";
import {
  LEGAL_WARNING,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} from "@/lib/legal/policyContent";
import { ONBOARDING_VERSION } from "@/lib/legal/onboarding";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import styles from "@/components/legal/welcome.module.css";

export default function WelcomeTermsPage() {
  const router = useRouter();
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canContinue = termsChecked && privacyChecked;

  const handleAccept = async () => {
    if (!canContinue) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/legal/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "accept" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not save. Try again.");
        setLoading(false);
        return;
      }
      await syncPortfolioFromCloud();
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <WelcomePageShell
      singleStep
      stepLabel="Before you continue"
      badge="Educational · Demo"
      title="Terms, Privacy & Welcome"
      subtitle="Read the warning, motto, Terms & Conditions, and Privacy Policy. Check both boxes to enter the dashboard."
      footer={
        <>
          <div className={styles.checkGroup}>
            <p className={styles.checkWarn}>
              You must check both items below to continue. If you do not agree, sign out and do not use the platform.
            </p>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
              />
              <span>
                I have read and agree to the <strong>Terms &amp; Conditions</strong> (paper trading, education only).
              </span>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={privacyChecked}
                onChange={(e) => setPrivacyChecked(e.target.checked)}
              />
              <span>
                I have read and agree to the <strong>Privacy Policy</strong> (how demo account data is handled).
              </span>
            </label>
          </div>
          {error && <div className={styles.err}>{error}</div>}
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px",
                opacity: !canContinue || loading ? 0.65 : 1,
              }}
              disabled={!canContinue || loading}
              onClick={() => void handleAccept()}
            >
              {loading ? "Applying…" : "Accept & go to dashboard →"}
            </button>
          </div>
          <p className={styles.note}>Version {ONBOARDING_VERSION}</p>
        </>
      }
    >
      <div className={styles.warnBanner} role="alert">
        {LEGAL_WARNING}
      </div>

      <span className={styles.eduTag}>{EDUCATION_NOTICE}</span>

      <div className={styles.mottoBlock}>
        <span className={styles.mottoLabel}>Our motto</span>
        <p className={styles.mottoText}>&ldquo;{QUANTDESK_MOTTO}&rdquo;</p>
      </div>

      <div className={styles.purposeBlock}>
        <span className={styles.purposeLabel}>Our purpose (education)</span>
        <p className={styles.purposeText}>{QUANTDESK_PURPOSE}</p>
      </div>

      <section className={styles.policySection}>
        <h2 className={styles.policyHead}>Terms &amp; Conditions</h2>
        {TERMS_SECTIONS.map((s) => (
          <div key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </div>
        ))}
      </section>

      <section className={styles.policySection}>
        <h2 className={styles.policyHead}>Privacy Policy</h2>
        {PRIVACY_SECTIONS.map((s) => (
          <div key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </div>
        ))}
      </section>
    </WelcomePageShell>
  );
}
