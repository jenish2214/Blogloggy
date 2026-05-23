import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolvePortfolio, type PortfolioRow } from "@/lib/wealth/booksServer";

export async function placeOrderForBook(
  supabase: SupabaseClient,
  user: User,
  book: PortfolioRow,
  params: {
    symbol: string;
    name: string;
    assetClass: string;
    side: string;
    qty: number;
    orderType: string;
    filledPrice: number;
    limitPrice?: number;
  }
) {
  const { symbol, name, assetClass, side, qty, orderType, filledPrice, limitPrice } = params;
  const portfolioId = book.id;
  let cash = Number(book.cash);
  let filledQty = qty;

  if (side === "buy") {
    const totalValue = qty * filledPrice;
    if (totalValue > cash) {
      return {
        success: false as const,
        message: `Insufficient cash. Need $${totalValue.toFixed(2)}, have $${cash.toFixed(2)}`,
      };
    }

    const { data: existing } = await supabase
      .from("positions")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("symbol", symbol)
      .maybeSingle();

    const newQty = (existing?.qty ?? 0) + qty;
    const newAvg = existing
      ? (Number(existing.avg_price) * Number(existing.qty) + filledPrice * qty) / newQty
      : filledPrice;

    await supabase.from("positions").upsert(
      {
        user_id: user.id,
        portfolio_id: portfolioId,
        symbol,
        name,
        asset_class: assetClass,
        qty: newQty,
        avg_price: newAvg,
        current_price: filledPrice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "portfolio_id,symbol" }
    );

    cash -= totalValue;
  } else {
    const { data: pos } = await supabase
      .from("positions")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("symbol", symbol)
      .maybeSingle();

    if (!pos || Number(pos.qty) <= 0.000001) {
      return { success: false as const, message: `No position in ${symbol}` };
    }

    filledQty = Math.min(qty, Number(pos.qty));
    const remaining = Number(pos.qty) - filledQty;

    if (remaining <= 0.000001) {
      await supabase.from("positions").delete().eq("portfolio_id", portfolioId).eq("symbol", symbol);
    } else {
      await supabase
        .from("positions")
        .update({ qty: remaining, updated_at: new Date().toISOString() })
        .eq("portfolio_id", portfolioId)
        .eq("symbol", symbol);
    }

    cash += filledQty * filledPrice;
  }

  await supabase
    .from("portfolios")
    .update({ cash, updated_at: new Date().toISOString() })
    .eq("id", portfolioId);

  const totalValue = filledQty * filledPrice;
  const now = new Date().toISOString();
  const accountTag = book.account_type === "client" ? book.account_label : "Personal";

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      portfolio_id: portfolioId,
      client_id: book.client_id,
      symbol,
      asset_class: assetClass,
      side,
      qty: filledQty,
      order_type: orderType,
      limit_price: limitPrice ?? null,
      filled_price: filledPrice,
      total_value: totalValue,
      status: "filled",
      created_at: now,
    })
    .select("*")
    .single();

  if (orderError || !orderRow) {
    return { success: false as const, message: "Order saved failed — try again" };
  }

  await supabase.from("messages").insert({
    user_id: user.id,
    type: "trade",
    title: `[${accountTag}] ${side === "buy" ? "Bought" : "Sold"} ${filledQty} ${symbol}`,
    body: `Filled @ $${filledPrice.toFixed(2)} · $${totalValue.toFixed(2)}`,
    metadata: {
      symbol,
      side,
      qty: filledQty,
      price: filledPrice,
      order_id: orderRow.id,
      portfolio_id: portfolioId,
      client_id: book.client_id,
    },
  });

  return {
    success: true as const,
    message: `${side === "buy" ? "Bought" : "Sold"} ${filledQty} ${symbol} @ $${filledPrice.toFixed(2)} (${accountTag})`,
    order: orderRow,
  };
}

export async function placeOrderWithBookResolution(
  supabase: SupabaseClient,
  user: User,
  opts: {
    portfolioId?: string;
    clientId?: string | null;
    symbol: string;
    name: string;
    assetClass: string;
    side: string;
    qty: number;
    orderType: string;
    filledPrice: number;
    limitPrice?: number;
  }
) {
  const book = await resolvePortfolio(supabase, user.id, {
    portfolioId: opts.portfolioId,
    clientId: opts.clientId ?? undefined,
  });

  if (!book) {
    return { success: false, message: "Could not resolve account book" };
  }

  return placeOrderForBook(supabase, user, book, opts);
}
