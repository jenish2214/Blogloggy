"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomePageShell } from "@/components/legal/WelcomePageShell";
import {
  FEATURE_OPTIONS,
  defaultFeatureAccess,
  type FeatureAccessMap,
  type FeatureKey,
} from "@/lib/user/featureAccess";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";
import styles from "@/components/legal/welcome.module.css";

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner — just starting" },
  { value: "intermediate", label: "Intermediate — 1–3 years" },
  { value: "advanced", label: "Advanced — 3–10 years" },
  { value: "professional", label: "Professional — 10+ years" },
] as const;

export default function WelcomeProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<string>("beginner");
  const [primaryInterest, setPrimaryInterest] = useState("stocks");
  const [features, setFeatures] = useState<FeatureAccessMap>(() => defaultFeatureAccess());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enabledCount = useMemo(
    () => FEATURE_OPTIONS.filter((o) => features[o.key]).length,
    [features]
  );

  const toggleFeature = (key: FeatureKey) => {
    if (key === "dashboard") return;
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          years_experience: yearsExperience ? Number(yearsExperience) : null,
          experience_level: experienceLevel,
          primary_interest: primaryInterest,
          feature_access: features,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not save profile.");
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
      stepLabel="Step 2 of 2"
      badge="Your workspace"
      title="Tell us about you"
      subtitle="We save this to your cloud profile. Choose which areas of QuantDesk you want in the sidebar — you can change them later under Profile."
      footer={
        <>
          {error && <div className={styles.err}>{error}</div>}
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px",
                opacity: loading ? 0.65 : 1,
              }}
              disabled={loading}
              onClick={() => void handleSubmit()}
            >
              {loading ? "Saving…" : "Save & go to dashboard →"}
            </button>
          </div>
          <p className={styles.note}>
            {enabledCount} of {FEATURE_OPTIONS.length} areas enabled · Dashboard is always on
          </p>
        </>
      }
    >
      <div className={styles.profileForm}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Full name</span>
          <input
            className="input"
            type="text"
            placeholder="e.g. Jenish Chovatiya"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Years of trading / investing experience</span>
          <input
            className="input"
            type="number"
            min={0}
            max={80}
            placeholder="e.g. 2"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Experience level</span>
          <select
            className="input"
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
          >
            {EXPERIENCE_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Primary interest</span>
          <select
            className="input"
            value={primaryInterest}
            onChange={(e) => setPrimaryInterest(e.target.value)}
          >
            <option value="stocks">Stocks & ETFs</option>
            <option value="crypto">Crypto</option>
            <option value="options">Options</option>
            <option value="forex">Forex</option>
            <option value="mixed">Mixed / learning all</option>
          </select>
        </label>

        <div className={styles.featureBlock}>
          <h2 className={styles.featureHead}>Pages you want access to</h2>
          <p className={styles.featureSub}>
            Unchecked pages are hidden from the sidebar. Visiting a disabled URL redirects to the
            dashboard.
          </p>
          <div className={styles.featureGrid}>
            {FEATURE_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className={`${styles.featureCard} ${features[opt.key] ? styles.featureOn : ""}`}
              >
                <input
                  type="checkbox"
                  checked={features[opt.key]}
                  disabled={opt.key === "dashboard"}
                  onChange={() => toggleFeature(opt.key)}
                />
                <div>
                  <strong>{opt.label}</strong>
                  <span>{opt.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </WelcomePageShell>
  );
}
