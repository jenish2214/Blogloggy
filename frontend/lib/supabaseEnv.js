/** Resolve Supabase public env for next.config (build-time injection). */

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1wbGFjZWhvbGRlciJ9.build";

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function resolveSupabasePublicEnv() {
  const url =
    firstEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL") || PLACEHOLDER_URL;
  const anonKey =
    firstEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY") ||
    PLACEHOLDER_KEY;
  return { url, anonKey };
}

module.exports = { resolveSupabasePublicEnv, PLACEHOLDER_URL, PLACEHOLDER_KEY };
