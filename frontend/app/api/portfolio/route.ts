import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [portfolioRes, positionsRes, ordersRes] = await Promise.all([
    supabase.from("portfolios").select("*").eq("user_id", user.id).single(),
    supabase.from("positions").select("*").eq("user_id", user.id),
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);

  return NextResponse.json({
    portfolio: portfolioRes.data,
    positions: positionsRes.data ?? [],
    orders: ordersRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, symbol, name, assetClass, side, qty, orderType, filledPrice, limitPrice } = body;

  if (action === "place_order") {
    const totalValue = qty * filledPrice;
    const { data: portfolio } = await supabase.from("portfolios").select("cash").eq("user_id", user.id).single();
    if (!portfolio) return NextResponse.json({ success: false, message: "Portfolio not found" }, { status: 404 });

    if (side === "buy") {
      if (totalValue > portfolio.cash) return NextResponse.json({ success: false, message: `Insufficient cash. Need $${totalValue.toFixed(2)}, have $${portfolio.cash.toFixed(2)}` });
      const { data: existing } = await supabase.from("positions").select("*").eq("user_id", user.id).eq("symbol", symbol).single();
      const newQty = (existing?.qty ?? 0) + qty;
      const newAvg = existing ? (existing.avg_price * existing.qty + filledPrice * qty) / newQty : filledPrice;
      await supabase.from("positions").upsert({ user_id: user.id, symbol, name, asset_class: assetClass, qty: newQty, avg_price: newAvg, current_price: filledPrice, updated_at: new Date().toISOString() }, { onConflict: "user_id,symbol" });
      await supabase.from("portfolios").update({ cash: portfolio.cash - totalValue, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    } else {
      const { data: pos } = await supabase.from("positions").select("*").eq("user_id", user.id).eq("symbol", symbol).single();
      if (!pos || pos.qty < qty) return NextResponse.json({ success: false, message: `Insufficient position: have ${pos?.qty ?? 0}` });
      const remaining = pos.qty - qty;
      if (remaining <= 0.000001) await supabase.from("positions").delete().eq("user_id", user.id).eq("symbol", symbol);
      else await supabase.from("positions").update({ qty: remaining, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("symbol", symbol);
      await supabase.from("portfolios").update({ cash: portfolio.cash + totalValue, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    }

    // Record order
    await supabase.from("orders").insert({ user_id: user.id, symbol, asset_class: assetClass, side, qty, order_type: orderType, limit_price: limitPrice, filled_price: filledPrice, total_value: totalValue, status: "filled" });

    // Send message notification
    await supabase.from("messages").insert({
      user_id: user.id,
      type: "trade",
      title: `${side === "buy" ? "▲ Bought" : "▼ Sold"} ${qty} ${symbol}`,
      body: `${orderType.toUpperCase()} order filled @ $${filledPrice.toFixed(2)} · Total: $${totalValue.toFixed(2)}`,
      metadata: { symbol, side, qty, filledPrice, totalValue, assetClass },
    });

    return NextResponse.json({ success: true, message: `${side === "buy" ? "Bought" : "Sold"} ${qty} ${symbol} @ $${filledPrice.toFixed(2)}` });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
