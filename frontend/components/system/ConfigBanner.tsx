"use client";

import { useEffect, useState } from "react";
import { hasSupabaseEnv } from "@/lib/supabase/client";

/** Shown when Supabase is not configured — client-only to avoid hydration mismatch. */
export function ConfigBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!hasSupabaseEnv());
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      suppressHydrationWarning
      style={{
        padding: "10px 16px",
        background: "var(--warn-soft, #fef3c7)",
        borderBottom: "1px solid var(--border)",
        fontSize: "0.8rem",
        color: "var(--text-primary)",
        lineHeight: 1.45,
      }}
    >
      <strong>Demo mode.</strong> Cloud sign-in and portfolio sync are disabled until Supabase env vars are set on the host and redeployed.
    </div>
  );
}
