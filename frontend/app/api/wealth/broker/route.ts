import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("broker_profiles")
    .select("*")
    .eq("advisor_id", user.id)
    .maybeSingle();

  return NextResponse.json({ broker: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("broker_profiles")
    .upsert(
      {
        advisor_id: user.id,
        firm_name: body.firmName ?? "QuantDesk Securities",
        rep_name: body.repName ?? null,
        license_id: body.licenseId ?? null,
        desk_code: body.deskCode ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        updated_at: now,
      },
      { onConflict: "advisor_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ broker: data });
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
