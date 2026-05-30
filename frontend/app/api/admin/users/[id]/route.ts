import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/adminServer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { FEATURE_KEYS, normalizeFeatureAccess } from "@/lib/user/featureAccess";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  let body: {
    full_name?: string;
    experience_level?: string | null;
    years_experience?: number | null;
    primary_interest?: string | null;
    feature_access?: Record<string, boolean>;
    is_admin?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authUser, error: getErr } = await admin.auth.admin.getUserById(id);
  if (getErr || !authUser.user) {
    return NextResponse.json({ error: getErr?.message ?? "User not found" }, { status: 404 });
  }

  const meta = (authUser.user.user_metadata ?? {}) as Record<string, unknown>;
  const full_name = body.full_name?.trim() ?? (meta.full_name as string) ?? "";
  const feature_access = body.feature_access
    ? normalizeFeatureAccess(body.feature_access)
    : undefined;

  const app_metadata = {
    ...(authUser.user.app_metadata ?? {}),
    ...(body.is_admin === true
      ? { role: "admin" }
      : body.is_admin === false
        ? { role: "user" }
        : {}),
  };

  const user_metadata = {
    ...meta,
    full_name,
    display_name: full_name,
    ...(body.experience_level !== undefined && { experience_level: body.experience_level }),
    ...(body.years_experience !== undefined && { years_experience: body.years_experience }),
    ...(body.primary_interest !== undefined && { primary_interest: body.primary_interest }),
    ...(feature_access && { feature_access }),
  };

  const { error: authErr } = await admin.auth.admin.updateUserById(id, {
    app_metadata,
    user_metadata,
  });

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const profilePatch: Record<string, unknown> = {
    id,
    updated_at: new Date().toISOString(),
  };
  if (full_name) profilePatch.full_name = full_name;
  if (body.experience_level !== undefined) profilePatch.experience_level = body.experience_level;
  if (body.years_experience !== undefined) profilePatch.years_experience = body.years_experience;
  if (body.primary_interest !== undefined) profilePatch.primary_interest = body.primary_interest;
  if (feature_access) profilePatch.feature_access = feature_access;

  if (Object.keys(profilePatch).length > 2) {
    await admin.from("user_profiles").upsert(profilePatch);
  }

  return NextResponse.json({ success: true, id });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
