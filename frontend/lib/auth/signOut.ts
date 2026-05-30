"use client";

import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { logAuthEvent, type AuthEventSource } from "@/lib/auth/logAuthEvent";
import { redirectAfterAuth } from "@/lib/auth/redirectAfterAuth";
import { handleAuthSessionChange } from "@/lib/auth/tradingSession";

export type SignOutOptions = {
  /** Where to send the user after tokens are cleared. */
  redirectTo?: string;
  /** Used for auth event logging. */
  source?: AuthEventSource;
  /** Also clear the static admin session cookie. */
  clearAdminCookie?: boolean;
};

/**
 * End the session: log logout, clear local trading cache, revoke Supabase tokens,
 * clear server auth cookies, then hard-redirect so middleware sees a signed-out user.
 */
export async function signOutUser(options: SignOutOptions = {}): Promise<void> {
  const {
    redirectTo = "/login",
    source = "platform",
    clearAdminCookie = false,
  } = options;

  const supabase = hasSupabaseEnv() ? createClient() : null;

  if (supabase) {
    try {
      await logAuthEvent("logout", source);
    } catch {
      /* session may already be invalid */
    }
  }

  handleAuthSessionChange(null);

  if (clearAdminCookie) {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      /* non-blocking */
    }
  }

  if (supabase) {
    await supabase.auth.signOut({ scope: "global" });
  }

  try {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    /* still redirect — client cookies may already be cleared */
  }

  redirectAfterAuth(redirectTo);
}

/** Platform user sign-out → login page. */
export function signOutPlatform() {
  return signOutUser({ redirectTo: "/login", source: "platform" });
}

/** Admin console sign-out → admin login, clears admin + Supabase sessions. */
export function signOutAdmin() {
  return signOutUser({
    redirectTo: "/admin/login",
    source: "admin",
    clearAdminCookie: true,
  });
}
