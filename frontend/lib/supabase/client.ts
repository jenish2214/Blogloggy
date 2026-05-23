import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/env";

export { hasSupabaseEnv } from "@/lib/supabase/env";

export const SUPABASE_CONFIG_ERROR =
  "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (Settings → Environment Variables), then redeploy.";

/** Returns null when Supabase is not configured (guest / misconfigured deploy). */
export function createClient(): SupabaseClient | null {
  if (!hasSupabaseEnv()) return null;
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
