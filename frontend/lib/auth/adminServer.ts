import type { User } from "@supabase/supabase-js";
import { AdminAuthError, isAdminUser } from "@/lib/auth/admin";
import { getStaticAdminSessionEmail } from "@/lib/auth/adminSession";
import { createClient } from "@/lib/supabase/server";

/** Server-side guard for admin API routes. */
export async function requireAdmin(): Promise<{ user: User | null; staticEmail?: string }> {
  const staticEmail = await getStaticAdminSessionEmail();
  if (staticEmail) {
    return { user: null, staticEmail };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AdminAuthError("Unauthorized", 401);
  }

  if (!isAdminUser(user)) {
    throw new AdminAuthError("Forbidden", 403);
  }

  return { user };
}
