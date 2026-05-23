import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureClientPortfolio } from "@/lib/wealth/booksServer";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("wealth_clients")
    .select("*")
    .eq("advisor_id", user.id)
    .order("display_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    displayName,
    clientCode,
    email,
    tier = "private",
    riskProfile = "moderate",
    status = "active",
    initialCapital = 500_000,
    notes,
  } = body;

  if (!displayName || !clientCode) {
    return NextResponse.json({ error: "displayName and clientCode required" }, { status: 400 });
  }

  const code = String(clientCode).toUpperCase().replace(/\s+/g, "-").slice(0, 24);
  const now = new Date().toISOString();

  const { data: client, error } = await supabase
    .from("wealth_clients")
    .insert({
      advisor_id: user.id,
      client_code: code,
      display_name: String(displayName).trim(),
      email: email ?? null,
      tier,
      risk_profile: riskProfile,
      status,
      initial_capital: Number(initialCapital) || 500_000,
      notes: notes ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const portfolio = await ensureClientPortfolio(supabase, user.id, client.id);

  return NextResponse.json({ client, portfolio });
}
