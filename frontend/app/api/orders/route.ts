import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensurePersonalPortfolio, resolvePortfolio } from "@/lib/wealth/booksServer";

const MAX_ORDERS = 1000;

function bookQueryFromUrl(req: NextRequest) {
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") ?? undefined;
  const clientId = req.nextUrl.searchParams.get("clientId") ?? undefined;
  return { portfolioId, clientId: clientId ?? undefined };
}

/** Order history scoped to active book (portfolio_id + client_id in Supabase). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await ensurePersonalPortfolio(supabase, user.id);
  const bookOpts = bookQueryFromUrl(req);
  const book = await resolvePortfolio(supabase, user.id, bookOpts);
  if (!book) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  const { data, count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("portfolio_id", book.id)
    .order("created_at", { ascending: false })
    .limit(MAX_ORDERS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let orders = data ?? [];
  if (!book.client_id) {
    const { data: legacy } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .is("portfolio_id", null)
      .order("created_at", { ascending: false })
      .limit(500);
    orders = [...orders, ...(legacy ?? [])];
  }

  let buyCount = 0;
  let sellCount = 0;
  let totalVolume = 0;
  for (const o of orders) {
    totalVolume += Number(o.total_value) || 0;
    if (o.side === "buy") buyCount += 1;
    else sellCount += 1;
  }

  return NextResponse.json({
    orders,
    activeBook: {
      portfolioId: book.id,
      clientId: book.client_id,
      accountType: book.account_type,
      label: book.account_label,
    },
    stats: {
      total: count ?? orders.length,
      returned: orders.length,
      buyCount,
      sellCount,
      totalVolume,
      truncated: (count ?? orders.length) > orders.length,
    },
  });
}
