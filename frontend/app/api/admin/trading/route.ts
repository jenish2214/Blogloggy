import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/adminServer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

async function guard() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured", rows: [], columns: [] },
      { status: 503 }
    );
  }
  return null;
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id, user_id, symbol, side, qty, order_type, filled_price, total_value, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    title: "Trading Monitor",
    description: "Latest paper orders across all users.",
    columns: ["Symbol", "Side", "Qty", "Type", "Filled", "Total", "Status", "Date", "User"],
    rows: (data ?? []).map((r) => ({
      id: r.id,
      cells: [
        r.symbol,
        r.side,
        String(r.qty),
        r.order_type,
        String(r.filled_price),
        String(r.total_value),
        r.status,
        r.created_at,
        r.user_id,
      ],
    })),
    total: data?.length ?? 0,
  });
}
