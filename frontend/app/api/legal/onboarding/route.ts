import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_VERSION } from "@/lib/legal/onboarding";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { step?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.step !== "accept") {
    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.auth.updateUser({
    data: {
      onboarding_version: ONBOARDING_VERSION,
      motto_purpose_accepted_at: now,
      terms_read_at: now,
      terms_accepted_at: now,
      privacy_policy_accepted_at: now,
      terms_version: ONBOARDING_VERSION,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: profileErr } = await supabase.from("user_profiles").upsert({
    id: user.id,
    full_name:
      (user.user_metadata?.display_name as string) ||
      user.email?.split("@")[0] ||
      "Trader",
    terms_accepted_at: now,
    feature_access: {},
  });

  if (profileErr && !profileErr.message.includes("user_profiles")) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, next: "/" });
}
