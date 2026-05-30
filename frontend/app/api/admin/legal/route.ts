import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/adminServer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

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
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, full_name, terms_accepted_at, profile_completed_at")
    .order("terms_accepted_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    title: "Legal & Compliance",
    description: "Terms acceptance and onboarding completion audit.",
    columns: ["User", "Terms accepted", "Profile complete", "User ID"],
    rows: (data ?? []).map((r) => ({
      id: r.id,
      cells: [
        r.full_name,
        r.terms_accepted_at ?? "Not accepted",
        r.profile_completed_at ?? "Pending",
        r.id,
      ],
    })),
    total: data?.length ?? 0,
  });
}
