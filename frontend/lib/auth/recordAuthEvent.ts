import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthEventType = "login" | "logout";
export type AuthEventSource = "platform" | "admin" | "oauth";

export async function recordAuthEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: AuthEventType,
  source: AuthEventSource = "platform"
): Promise<void> {
  const { error } = await supabase.from("user_auth_events").insert({
    user_id: userId,
    event_type: eventType,
    source,
  });

  if (error && !isMissingTable(error)) {
    console.warn("[recordAuthEvent]", error.message);
  }
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("user_auth_events"))
  );
}
