export type AuthEventSource = "platform" | "admin" | "oauth";

/** Fire-and-forget login/logout tracking (call before signOut on logout). */
export async function logAuthEvent(
  event: "login" | "logout",
  source: AuthEventSource = "platform"
): Promise<void> {
  try {
    await fetch("/api/auth/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, source }),
    });
  } catch {
    /* non-blocking */
  }
}
