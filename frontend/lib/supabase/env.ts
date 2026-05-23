/** Used when env vars are absent during `next build` / prerender (e.g. Vercel before vars are set). */
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1wbGFjZWhvbGRlciJ9.build";

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getSupabaseUrl(): string {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  return url || BUILD_PLACEHOLDER_URL;
}

export function getSupabaseAnonKey(): string {
  const key = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key || BUILD_PLACEHOLDER_KEY;
}

export function hasSupabaseEnv(): boolean {
  return Boolean(readEnv("NEXT_PUBLIC_SUPABASE_URL") && readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}
