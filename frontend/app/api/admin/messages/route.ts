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
    .from("messages")
    .select("id, user_id, type, title, read, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    title: "Messages",
    description: "In-app notifications for all users.",
    columns: ["Type", "Title", "Read", "Created", "User ID"],
    rows: (data ?? []).map((r) => ({
      id: r.id,
      cells: [r.type, r.title, r.read ? "Yes" : "No", r.created_at, r.user_id],
    })),
    total: data?.length ?? 0,
  });
}
