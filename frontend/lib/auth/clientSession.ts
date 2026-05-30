import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

/** Returns the signed-in user id in the browser, or null for guests / before hydration. */
export async function getClientUserId(): Promise<string | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
