import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteCtx = { params: Promise<{ id: string }> };

async function getOwnedClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clientId: string
) {
  const { data, error } = await supabase
    .from("wealth_clients")
    .select("*")
    .eq("id", clientId)
    .eq("advisor_id", userId)
    .maybeSingle();

  if (error) return { error: error.message, client: null };
  if (!data) return { error: "Client not found", client: null };
  return { error: null, client: data };
}

/** Read single client with linked portfolio summary. */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error, client } = await getOwnedClient(supabase, user.id, id);
  if (error || !client) {
    return NextResponse.json({ error: error ?? "not found" }, { status: 404 });
  }

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .eq("client_id", id)
    .maybeSingle();

  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id);

  return NextResponse.json({
    client,
    portfolio: portfolio ?? null,
    stats: { orderCount: orderCount ?? 0 },
  });
}

/** Update client details (partial). */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error: lookupErr, client: existing } = await getOwnedClient(supabase, user.id, id);
  if (lookupErr || !existing) {
    return NextResponse.json({ error: lookupErr ?? "not found" }, { status: 404 });
  }

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.displayName !== undefined) patch.display_name = String(body.displayName).trim();
  if (body.clientCode !== undefined) {
    patch.client_code = String(body.clientCode).toUpperCase().replace(/\s+/g, "-").slice(0, 24);
  }
  if (body.email !== undefined) patch.email = body.email ? String(body.email).trim() : null;
  if (body.tier !== undefined) patch.tier = body.tier;
  if (body.riskProfile !== undefined) patch.risk_profile = body.riskProfile;
  if (body.status !== undefined) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes) : null;
  if (body.initialCapital !== undefined) {
    patch.initial_capital = Number(body.initialCapital) || existing.initial_capital;
  }

  const { data: client, error } = await supabase
    .from("wealth_clients")
    .update(patch)
    .eq("id", id)
    .eq("advisor_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const displayName = String(client.display_name);
  await supabase
    .from("portfolios")
    .update({
      account_label: `${displayName} — Managed`,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("client_id", id);

  return NextResponse.json({ client });
}

/** Delete client and cascade portfolio book. */
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error: lookupErr, client } = await getOwnedClient(supabase, user.id, id);
  if (lookupErr || !client) {
    return NextResponse.json({ error: lookupErr ?? "not found" }, { status: 404 });
  }

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id")
    .eq("client_id", id)
    .maybeSingle();

  if (portfolio?.id) {
    await supabase.from("orders").delete().eq("portfolio_id", portfolio.id);
    await supabase.from("positions").delete().eq("portfolio_id", portfolio.id);
    await supabase.from("portfolios").delete().eq("id", portfolio.id);
  }

  const { error } = await supabase
    .from("wealth_clients")
    .delete()
    .eq("id", id)
    .eq("advisor_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deletedId: id });
}
