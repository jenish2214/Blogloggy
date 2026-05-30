import { NextRequest, NextResponse } from "next/server";
import { recordAuthEvent, type AuthEventSource, type AuthEventType } from "@/lib/auth/recordAuthEvent";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: AuthEventType; source?: AuthEventSource };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const event = body.event;
  if (event !== "login" && event !== "logout") {
    return NextResponse.json({ error: "event must be login or logout" }, { status: 400 });
  }

  const source: AuthEventSource =
    body.source === "admin" || body.source === "oauth" ? body.source : "platform";

  await recordAuthEvent(supabase, user.id, event, source);
  return NextResponse.json({ success: true });
}
