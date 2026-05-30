import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensurePersonalPortfolio,
  resolvePortfolio,
} from "@/lib/wealth/booksServer";
import { placeOrderWithBookResolution } from "@/lib/wealth/placeOrderServer";
import { consolidateRawPositions } from "@/lib/trading/consolidatePositions";

const DEFAULT_WATCHLIST = [
  { symbol: "AAPL", name: "Apple Inc.", asset_class: "stock" },
  { symbol: "TSLA", name: "Tesla Inc.", asset_class: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corp.", asset_class: "stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", asset_class: "stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", asset_class: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", asset_class: "stock" },
  { symbol: "META", name: "Meta Platforms", asset_class: "stock" },
  { symbol: "AMD", name: "Advanced Micro Devices", asset_class: "stock" },
  { symbol: "BTC-USD", name: "Bitcoin", asset_class: "crypto" },
  { symbol: "ETH-USD", name: "Ethereum", asset_class: "crypto" },
  { symbol: "SOL-USD", name: "Solana", asset_class: "crypto" },
  { symbol: "BNB-USD", name: "BNB", asset_class: "crypto" },
];

async function seedDefaultWatchlist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { count } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return;

  await supabase.from("watchlist").insert(
    DEFAULT_WATCHLIST.map((row) => ({
      user_id: userId,
      symbol: row.symbol,
      name: row.name,
      asset_class: row.asset_class,
    }))
  );
}

function bookQueryFromUrl(req: NextRequest) {
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") ?? undefined;
  const clientId = req.nextUrl.searchParams.get("clientId") ?? undefined;
  return { portfolioId, clientId: clientId ?? undefined };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({
      portfolio: null,
      positions: [],
      orders: [],
      guest: true,
    });
  }

  await ensurePersonalPortfolio(supabase, user.id);
  await seedDefaultWatchlist(supabase, user.id);

  const bookOpts = bookQueryFromUrl(req);
  const book = await resolvePortfolio(supabase, user.id, bookOpts);
  if (!book) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  const [positionsRes, ordersRes] = await Promise.all([
    supabase.from("positions").select("*").eq("portfolio_id", book.id),
    supabase
      .from("orders")
      .select("*")
      .eq("portfolio_id", book.id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  let positions = positionsRes.data ?? [];
  let orders = ordersRes.data ?? [];

  if (!book.client_id) {
    const [legacyPos, legacyOrd] = await Promise.all([
      supabase
        .from("positions")
        .select("*")
        .eq("user_id", user.id)
        .is("portfolio_id", null),
      supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .is("portfolio_id", null)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    positions = [...positions, ...(legacyPos.data ?? [])];
    orders = [...orders, ...(legacyOrd.data ?? [])];
  }

  const consolidated = consolidateRawPositions(positions as Record<string, unknown>[]);

  return NextResponse.json({
    portfolio: book,
    positions: consolidated.filter((p) => Number(p.qty) > 0.000001),
    orders,
    activeBook: {
      portfolioId: book.id,
      clientId: book.client_id,
      accountType: book.account_type,
      label: book.account_label,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "place_order") {
    return placeOrderWithBookResolution(supabase, user, {
      portfolioId: body.portfolioId,
      clientId: body.clientId,
      symbol: body.symbol,
      name: body.name,
      assetClass: body.assetClass,
      side: body.side,
      qty: body.qty,
      orderType: body.orderType,
      filledPrice: body.filledPrice,
      limitPrice: body.limitPrice,
    }).then((res) => NextResponse.json(res));
  }

  if (action === "sync_prices") {
    const prices = body.prices as Record<string, number> | undefined;
    if (!prices || typeof prices !== "object") {
      return NextResponse.json({ error: "invalid_prices" }, { status: 400 });
    }

    const book = await resolvePortfolio(supabase, user.id, {
      portfolioId: body.portfolioId,
      clientId: body.clientId,
    });
    if (!book) return NextResponse.json({ error: "no book" }, { status: 404 });

    let updated = 0;
    const now = new Date().toISOString();
    for (const [sym, price] of Object.entries(prices)) {
      if (typeof price !== "number" || price <= 0) continue;
      const { data } = await supabase
        .from("positions")
        .update({ current_price: price, updated_at: now })
        .eq("portfolio_id", book.id)
        .eq("symbol", sym)
        .select("symbol");
      if (data?.length) updated += 1;
    }

    return NextResponse.json({ success: true, updated });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
