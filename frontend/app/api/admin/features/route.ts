import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/adminServer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { FEATURE_OPTIONS } from "@/lib/user/featureAccess";

export async function GET() {
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

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("user_profiles")
    .select("id, full_name, feature_access")
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (profiles ?? []).map((p) => {
    const access = (p.feature_access ?? {}) as Record<string, boolean>;
    const enabled = FEATURE_OPTIONS.filter((f) => access[f.key]).map((f) => f.label);
    return {
      id: p.id,
      cells: [p.full_name, enabled.length ? enabled.join(", ") : "Defaults", p.id],
    };
  });

  return NextResponse.json({
    title: "Feature Access",
    description: "Per-user enabled desk modules from user_profiles.",
    columns: ["User", "Enabled modules", "User ID"],
    rows,
    total: rows.length,
  });
}
