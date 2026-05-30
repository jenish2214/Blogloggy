import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/adminServer";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
  let health: Record<string, unknown> = { status: "unknown" };
  let ok = false;

  try {
    const res = await fetch(`${apiBase}/api/health`, { cache: "no-store" });
    ok = res.ok;
    health = await res.json();
  } catch (e) {
    health = { status: "offline", error: String(e) };
  }

  return NextResponse.json({
    title: "System Health",
    description: "Express API health and Supabase connectivity.",
    columns: ["Service", "Status", "Detail"],
    rows: [
      {
        id: "express",
        cells: ["Express API (:4000)", ok ? "Online" : "Offline", JSON.stringify(health).slice(0, 120)],
      },
      {
        id: "supabase",
        cells: [
          "Supabase Auth",
          process.env.SUPABASE_SERVICE_ROLE_KEY ? "Connected" : "Missing service role key",
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "—",
        ],
      },
      {
        id: "frontend",
        cells: ["Next.js Admin", "Online", process.env.NEXT_PUBLIC_SITE_URL ?? "localhost:3000"],
      },
    ],
    total: 3,
  });
}
