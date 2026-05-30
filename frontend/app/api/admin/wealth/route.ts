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
  const [clients, brokers] = await Promise.all([
    admin.from("wealth_clients").select("*").order("display_name").limit(100),
    admin.from("broker_profiles").select("*").limit(100),
  ]);

  const rows = [
    ...(clients.data ?? []).map((c) => ({
      id: c.id,
      cells: ["Client", c.display_name, c.client_code, c.status, c.advisor_id],
    })),
    ...(brokers.data ?? []).map((b) => ({
      id: b.id,
      cells: ["Broker", b.firm_name, b.rep_name ?? "—", b.desk_code ?? "—", b.advisor_id],
    })),
  ];

  return NextResponse.json({
    title: "Wealth & Clients",
    description: "Wealth clients and broker profiles.",
    columns: ["Type", "Name", "Code / Rep", "Status / Desk", "Advisor ID"],
    rows,
    total: rows.length,
  });
}
