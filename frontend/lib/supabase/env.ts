/** Used when env vars are absent during `next build` / prerender. */
export const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
export const BUILD_PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1wbGFjZWhvbGRlciJ9.build";

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

/** True when real Supabase credentials are present (not build placeholders). */
export function hasSupabaseEnv(): boolean {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return false;
  if (url === BUILD_PLACEHOLDER_URL || key === BUILD_PLACEHOLDER_KEY) return false;
  return true;
}

export function getSupabaseUrl(): string {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (hasSupabaseEnv()) return url;
  return BUILD_PLACEHOLDER_URL;
}

export function getSupabaseAnonKey(): string {
  const key = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (hasSupabaseEnv()) return key;
  return BUILD_PLACEHOLDER_KEY;
}
