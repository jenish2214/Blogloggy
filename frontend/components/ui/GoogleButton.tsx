"use client";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 16px",
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        fontSize: "0.92rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "var(--t-fast)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface-2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; }}
    >
      {/* Google logo SVG */}
      <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M47.53 24.56c0-1.64-.14-3.22-.42-4.74H24v8.97h13.21c-.57 3.06-2.3 5.66-4.9 7.4v6.15h7.93c4.64-4.28 7.29-10.59 7.29-17.78z"/>
        <path fill="#34A853" d="M24 48c6.63 0 12.19-2.2 16.25-5.96l-7.93-6.15c-2.2 1.48-5.01 2.35-8.32 2.35-6.4 0-11.82-4.32-13.75-10.14H2.06v6.35C6.1 42.67 14.44 48 24 48z"/>
        <path fill="#FBBC05" d="M10.25 28.1A14.38 14.38 0 0 1 9.75 24c0-1.43.25-2.82.5-4.1V13.55H2.06A23.96 23.96 0 0 0 0 24c0 3.86.93 7.51 2.06 10.45l8.19-6.35z"/>
        <path fill="#EA4335" d="M24 9.75c3.6 0 6.84 1.24 9.39 3.67l7.04-7.04C36.17 2.42 30.62 0 24 0 14.44 0 6.1 5.33 2.06 13.55l8.19 6.35C12.18 14.07 17.6 9.75 24 9.75z"/>
      </svg>
      {label}
    </button>
  );
}
