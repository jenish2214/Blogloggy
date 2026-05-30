"use client";

import { useEffect, useState } from "react";
import type { AdminUserRow } from "@/lib/admin/users";
import { FEATURE_OPTIONS } from "@/lib/user/featureAccess";
import styles from "./admin.module.css";

type Props = {
  user: AdminUserRow;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminUserEditModal({ user, open, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(user.fullName);
  const [experienceLevel, setExperienceLevel] = useState(user.experienceLevel ?? "");
  const [yearsExperience, setYearsExperience] = useState(
    user.yearsExperience != null ? String(user.yearsExperience) : ""
  );
  const [primaryInterest, setPrimaryInterest] = useState(user.primaryInterest ?? "");
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(user.fullName);
    setExperienceLevel(user.experienceLevel ?? "");
    setYearsExperience(user.yearsExperience != null ? String(user.yearsExperience) : "");
    setPrimaryInterest(user.primaryInterest ?? "");
    setIsAdmin(user.isAdmin);
    const map: Record<string, boolean> = {};
    for (const f of FEATURE_OPTIONS) {
      map[f.key] = user.enabledFeatures.includes(f.key);
    }
    setFeatures(map);
    setError(null);
  }, [open, user]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          experience_level: experienceLevel || null,
          years_experience: yearsExperience ? Number(yearsExperience) : null,
          primary_interest: primaryInterest || null,
          is_admin: isAdmin,
          feature_access: features,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <header className={styles.modalHead}>
          <h2 className={styles.modalTitle}>Update user</h2>
          <p className={styles.modalSub}>{user.email}</p>
        </header>

        <div className={styles.modalBody}>
          <label className={styles.modalLabel}>
            Full name
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>

          <label className={styles.modalLabel}>
            Experience level
            <select
              className="input"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            >
              <option value="">—</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="professional">Professional</option>
            </select>
          </label>

          <label className={styles.modalLabel}>
            Years experience
            <input
              className="input"
              type="number"
              min={0}
              max={80}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
          </label>

          <label className={styles.modalLabel}>
            Primary interest
            <input
              className="input"
              value={primaryInterest}
              onChange={(e) => setPrimaryInterest(e.target.value)}
            />
          </label>

          <label className={styles.modalCheck}>
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            Admin role (app_metadata.role = admin)
          </label>

          <p className={styles.modalSectionLabel}>Feature access</p>
          <div className={styles.modalFeatureGrid}>
            {FEATURE_OPTIONS.map((f) => (
              <label key={f.key} className={styles.modalCheck}>
                <input
                  type="checkbox"
                  checked={features[f.key] ?? false}
                  onChange={(e) => setFeatures((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                />
                {f.label}
              </label>
            ))}
          </div>

          {error && <p className={styles.modalError}>{error}</p>}
        </div>

        <footer className={styles.modalFoot}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}
