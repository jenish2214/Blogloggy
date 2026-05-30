import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  STATIC_ADMIN_EMAIL,
  STATIC_ADMIN_PASSWORD,
} from "@/lib/auth/staticAdmin";

const ADMIN_NAME = "QuantDesk Admin";

/** Creates or updates admin@quantdesk.com in Supabase Auth (requires service role key). */
export async function POST() {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured",
        hint: "Add it to frontend/.env.local from Supabase → Settings → API → service_role",
      },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  let userId: string | null = null;

  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const match = (data.users ?? []).find(
      (u) => u.email?.toLowerCase() === STATIC_ADMIN_EMAIL
    );
    if (match) {
      userId = match.id;
      break;
    }
    if ((data.users?.length ?? 0) < 200) break;
    page += 1;
  }

  if (userId) {
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password: STATIC_ADMIN_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: ADMIN_NAME, display_name: ADMIN_NAME },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: STATIC_ADMIN_EMAIL,
      password: STATIC_ADMIN_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: ADMIN_NAME, display_name: ADMIN_NAME },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    userId = data.user.id;
  }

  await admin.from("user_profiles").upsert({
    id: userId,
    full_name: ADMIN_NAME,
    profile_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    email: STATIC_ADMIN_EMAIL,
    userId,
    message: "Admin user created in Supabase Auth. Sign in with admin@quantdesk.com / Admin@12345",
  });
}
