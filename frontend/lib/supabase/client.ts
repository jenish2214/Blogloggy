import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  if (typeof window !== "undefined" && !hasSupabaseEnv()) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (Settings → Environment Variables), then redeploy."
    );
  }
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
