import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePortfolio } from "@/lib/wealth/booksServer";
import { placeOrderForBook } from "@/lib/wealth/placeOrderServer";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const book = await resolvePortfolio(supabase, user.id, {
    portfolioId: body.portfolioId,
    clientId: body.clientId,
  });

  if (!book) {
    return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });
  }

  const { data: positions } = await supabase
    .from("positions")
    .select("*")
    .eq("portfolio_id", book.id);

  const open = (positions ?? []).filter((p) => Number(p.qty) > 0.000001);
  if (open.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No open positions to exit",
      closed: 0,
    });
  }

  let closed = 0;
  const errors: string[] = [];

  for (const pos of open) {
    const price = Number(pos.current_price) || Number(pos.avg_price);
    if (price <= 0) {
      errors.push(`${pos.symbol}: invalid price`);
      continue;
    }

    const res = await placeOrderForBook(supabase, user, book, {
      symbol: String(pos.symbol),
      name: String(pos.name ?? pos.symbol),
      assetClass: String(pos.asset_class ?? "stock"),
      side: "sell",
      qty: Number(pos.qty),
      orderType: "market",
      filledPrice: price,
    });

    if (res.success) closed += 1;
    else errors.push(`${pos.symbol}: ${res.message}`);
  }

  return NextResponse.json({
    success: closed > 0 || errors.length === 0,
    message:
      closed === open.length
        ? `Exited ${closed} position${closed !== 1 ? "s" : ""} — book cleared`
        : `Closed ${closed}/${open.length} positions`,
    closed,
    total: open.length,
    errors: errors.length ? errors : undefined,
    bookLabel: book.account_label,
  });
}
