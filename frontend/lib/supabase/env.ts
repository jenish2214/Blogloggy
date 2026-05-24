/** Used when env vars are absent during `next build` / prerender. */
export const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
export const BUILD_PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1wbGFjZWhvbGRlciJ9.build";

// Static references so Next.js inlines NEXT_PUBLIC_* into client bundles at build time.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/** True when real Supabase credentials are present (not build placeholders). */
export function hasSupabaseEnv(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (SUPABASE_URL === BUILD_PLACEHOLDER_URL || SUPABASE_ANON_KEY === BUILD_PLACEHOLDER_KEY) {
    return false;
  }
  return true;
}

export function getSupabaseUrl(): string {
  if (hasSupabaseEnv()) return SUPABASE_URL;
  return BUILD_PLACEHOLDER_URL;
}

export function getSupabaseAnonKey(): string {
  if (hasSupabaseEnv()) return SUPABASE_ANON_KEY;
  return BUILD_PLACEHOLDER_KEY;
}
