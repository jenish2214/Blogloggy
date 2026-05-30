"use client";

import { useEffect, useState } from "react";
import {
  FEATURE_OPTIONS,
  defaultFeatureAccess,
  type FeatureAccessMap,
  type FeatureKey,
} from "@/lib/user/featureAccess";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

interface ProfileRow {
  full_name?: string;
  years_experience?: number | null;
  experience_level?: string | null;
  primary_interest?: string | null;
  profile_completed_at?: string | null;
}

export function ProfilePreferencesSection() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [features, setFeatures] = useState<FeatureAccessMap>(defaultFeatureAccess());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setLoading(false);
      return;
    }
    void fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (j.profile) setProfile(j.profile);
        if (j.feature_access) setFeatures(j.feature_access);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: FeatureKey) => {
    if (key === "dashboard") return;
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_access: features }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMessage(j.error ?? "Could not save.");
        return;
      }
      const supabase = createClient();
      if (supabase) await supabase.auth.refreshSession();
      setMessage("Saved. Sidebar updates on refresh.");
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading preferences…</p>;
  }

  if (!profile?.profile_completed_at) {
    return (
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        Complete{" "}
        <a href="/welcome/profile" style={{ color: "var(--accent)" }}>
          profile setup
        </a>{" "}
        to manage page access.
      </p>
    );
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Your details</h3>
      <dl style={{ margin: "0 0 16px", fontSize: "0.82rem", display: "grid", gap: 6 }}>
        <div>
          <dt style={{ color: "var(--text-muted)" }}>Name</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{profile.full_name}</dd>
        </div>
        {profile.years_experience != null && (
          <div>
            <dt style={{ color: "var(--text-muted)" }}>Experience</dt>
            <dd style={{ margin: 0 }}>
              {profile.years_experience} years · {profile.experience_level}
            </dd>
          </div>
        )}
        {profile.primary_interest && (
          <div>
            <dt style={{ color: "var(--text-muted)" }}>Primary interest</dt>
            <dd style={{ margin: 0 }}>{profile.primary_interest}</dd>
          </div>
        )}
      </dl>

      <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Enabled pages</h3>
      <p style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
        Unchecked areas are hidden from the sidebar. Dashboard is always available.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
        {FEATURE_OPTIONS.map((opt) => (
          <label
            key={opt.key}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: "0.8rem",
              cursor: opt.key === "dashboard" ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={features[opt.key]}
              disabled={opt.key === "dashboard"}
              onChange={() => toggle(opt.key)}
            />
            <span>
              <strong>{opt.label}</strong>
              <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                {opt.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save page access"}
        </button>
        {message && <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{message}</span>}
      </div>
    </div>
  );
}
