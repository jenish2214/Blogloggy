import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureClientPortfolio } from "@/lib/wealth/booksServer";

const DEMO_CLIENTS = [
  { code: "JP-8842", name: "Whitfield Family Office", tier: "uhnw", risk: "moderate", cap: 2_400_000, email: "c.whitfield@demo.io" },
  { code: "JP-9101", name: "Meridian Capital LLC", tier: "institutional", risk: "growth", cap: 8_500_000, email: "desk@meridian.demo" },
  { code: "JP-7720", name: "Sarah Chen Trust", tier: "private", risk: "conservative", cap: 1_200_000, email: "s.chen@demo.io" },
  { code: "JP-6655", name: "Atlas Endowment", tier: "institutional", risk: "moderate", cap: 12_000_000, email: "treasury@atlas.demo" },
  { code: "JP-4412", name: "Riverstone Holdings", tier: "uhnw", risk: "aggressive", cap: 3_800_000, email: "pm@riverstone.demo" },
  { code: "JP-3301", name: "Nguyen Private Wealth", tier: "private", risk: "growth", cap: 750_000, email: "nguyen@demo.io" },
  { code: "JP-2290", name: "Belford Pension Sleeve", tier: "institutional", risk: "conservative", cap: 5_600_000, email: "ops@belford.demo" },
  { code: "JP-1188", name: "Kessler IRA Rollover", tier: "retail", risk: "moderate", cap: 420_000, email: "kessler@demo.io" },
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { count } = await supabase
    .from("wealth_clients")
    .select("*", { count: "exact", head: true })
    .eq("advisor_id", user.id);

  if (count && count >= 3) {
    return NextResponse.json({
      success: true,
      message: "Demo clients already seeded",
      seeded: 0,
    });
  }

  let seeded = 0;
  const now = new Date().toISOString();

  for (const d of DEMO_CLIENTS) {
    const { data: existing } = await supabase
      .from("wealth_clients")
      .select("id")
      .eq("advisor_id", user.id)
      .eq("client_code", d.code)
      .maybeSingle();

    if (existing) continue;

    const { data: client, error } = await supabase
      .from("wealth_clients")
      .insert({
        advisor_id: user.id,
        client_code: d.code,
        display_name: d.name,
        email: d.email,
        tier: d.tier,
        risk_profile: d.risk,
        initial_capital: d.cap,
        notes: "Demo client book — paper capital",
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (!error && client) {
      await ensureClientPortfolio(supabase, user.id, client.id);
      seeded += 1;
    }
  }

  return NextResponse.json({ success: true, seeded, total: DEMO_CLIENTS.length });
}
