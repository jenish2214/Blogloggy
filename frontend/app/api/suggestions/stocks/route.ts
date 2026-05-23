import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/fetchMarketQuotes";
import { createClient } from "@/lib/supabase/server";
import { ensurePersonalPortfolio, resolvePortfolio } from "@/lib/wealth/booksServer";
import {
  STARTER_PICKS,
  buildMoneyWiseSuggestions,
  isNewTrader,
} from "@/lib/trading/stockSuggestions";

export const runtime = "nodejs";

function bookQueryFromUrl(req: NextRequest) {
  const portfolioId = req.nextUrl.searchParams.get("portfolioId") ?? undefined;
  const clientId = req.nextUrl.searchParams.get("clientId") ?? undefined;
  return { portfolioId, clientId: clientId ?? undefined };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      cash: 0,
      bookLabel: "Guest",
      isNewUser: false,
      suggestions: [],
      guest: true,
      disclaimer: "Sign in to see personalized paper-wallet suggestions.",
    });
  }

  await ensurePersonalPortfolio(supabase, user.id);
  const book = await resolvePortfolio(supabase, user.id, bookQueryFromUrl(req));
  if (!book) {
    return NextResponse.json({ error: "no portfolio" }, { status: 404 });
  }

  const [posRes, ordRes] = await Promise.all([
    supabase.from("positions").select("qty").eq("portfolio_id", book.id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("portfolio_id", book.id),
  ]);

  const positionsCount = (posRes.data ?? []).filter((p) => Number(p.qty) > 0.000001).length;
  const ordersCount = ordRes.count ?? 0;
  const cash = Number(book.cash);
  const newUser = isNewTrader(positionsCount, ordersCount);

  const symbols = STARTER_PICKS.map((p) => p.symbol);
  let prices: Record<string, { price: number; name?: string; changePct?: number }> = {};

  try {
    const { quotes } = await fetchMarketQuotes(symbols);
    for (const q of quotes) {
      const sym = q.symbol.toUpperCase();
      prices[sym] = {
        price: q.price,
        name: q.name,
        changePct: q.changePct,
      };
    }
  } catch {
    return NextResponse.json({
      cash,
      bookLabel: book.account_label,
      isNewUser: newUser,
      suggestions: [],
      reservePct: 12,
      error: "Could not load live prices. Try again from Markets.",
    });
  }

  const suggestions = newUser ? buildMoneyWiseSuggestions(cash, prices) : [];

  const totalSuggested = suggestions.reduce((s, x) => s + x.estimatedCost, 0);

  return NextResponse.json({
    cash,
    bookLabel: book.account_label,
    accountType: book.account_type,
    isNewUser: newUser,
    positionsCount,
    ordersCount,
    suggestions,
    reservePct: 12,
    totalSuggested,
    cashAfterSuggestions: Math.max(0, cash - totalSuggested),
    disclaimer:
      "Demo suggestions only — sized from your paper cash wallet. Not financial advice.",
  });
}
