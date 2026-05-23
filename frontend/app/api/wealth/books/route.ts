import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/fetchMarketQuotes";
import { createClient } from "@/lib/supabase/server";
import {
  computeBookMetrics,
  ensurePersonalPortfolio,
  filterPositionsForBook,
  resolvePortfolio,
} from "@/lib/wealth/booksServer";

export const runtime = "nodejs";

async function fetchLivePrices(
  positions: Array<Record<string, unknown>>
): Promise<Record<string, number>> {
  const symSet = new Set<string>();
  for (const p of positions) {
    if (Number(p.qty) > 0.000001) symSet.add(String(p.symbol));
  }
  const syms = Array.from(symSet);
  if (syms.length === 0) return {};

  try {
    const { quotes } = await fetchMarketQuotes(syms);
    const prices: Record<string, number> = {};
    for (const q of quotes) {
      if (q.symbol && q.price > 0) prices[q.symbol] = q.price;
    }
    return prices;
  } catch {
    return {};
  }
}

function countOrdersByPortfolio(
  orders: Array<{ portfolio_id: string | null }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    if (!o.portfolio_id) continue;
    counts[o.portfolio_id] = (counts[o.portfolio_id] ?? 0) + 1;
  }
  return counts;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") ?? undefined;
  const clientId = req.nextUrl.searchParams.get("clientId") ?? undefined;

  await ensurePersonalPortfolio(supabase, user.id);

  if (portfolioId || clientId) {
    const book = await resolvePortfolio(supabase, user.id, { portfolioId, clientId });
    if (!book) return NextResponse.json({ error: "book not found" }, { status: 404 });

    const [posRes, ordRes, clientRes] = await Promise.all([
      supabase.from("positions").select("*").eq("portfolio_id", book.id),
      supabase
        .from("orders")
        .select("*")
        .eq("portfolio_id", book.id)
        .order("created_at", { ascending: false })
        .limit(500),
      book.client_id
        ? supabase.from("wealth_clients").select("*").eq("id", book.client_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const positions = posRes.data ?? [];
    const prices = await fetchLivePrices(positions);
    const metrics = computeBookMetrics(book, positions, prices);
    metrics.orderCount = (ordRes.data ?? []).length;

    return NextResponse.json({
      book: {
        ...book,
        client: clientRes.data,
        metrics,
        positions: positions.filter((p) => Number(p.qty) > 0.000001),
        orders: ordRes.data ?? [],
        lastUpdated: new Date().toISOString(),
      },
    });
  }

  const [portfoliosRes, clientsRes, allPositionsRes, ordersRes] = await Promise.all([
    supabase.from("portfolios").select("*").eq("user_id", user.id).order("account_type"),
    supabase
      .from("wealth_clients")
      .select("*")
      .eq("advisor_id", user.id)
      .eq("status", "active")
      .order("display_name"),
    supabase.from("positions").select("*").eq("user_id", user.id),
    supabase.from("orders").select("portfolio_id").eq("user_id", user.id),
  ]);

  const portfolios = portfoliosRes.data ?? [];
  const clients = clientsRes.data ?? [];
  const allPositions = allPositionsRes.data ?? [];
  const orderCounts = countOrdersByPortfolio(ordersRes.data ?? []);

  for (const c of clients) {
    const hasBook = portfolios.some((p) => p.client_id === c.id);
    if (!hasBook) {
      const { ensureClientPortfolio } = await import("@/lib/wealth/booksServer");
      const created = await ensureClientPortfolio(supabase, user.id, c.id);
      if (created) portfolios.push(created);
    }
  }

  const prices = await fetchLivePrices(allPositions);
  const now = new Date().toISOString();

  const books = portfolios.map((pf) => {
    const positions = filterPositionsForBook(pf, allPositions);
    const client = pf.client_id ? clients.find((c) => c.id === pf.client_id) : null;
    const metrics = computeBookMetrics(pf, positions, prices);
    metrics.orderCount = orderCounts[pf.id] ?? 0;

    return {
      portfolioId: pf.id,
      clientId: pf.client_id,
      accountType: pf.account_type,
      accountLabel: pf.account_label,
      clientCode: client?.client_code ?? null,
      clientName: client?.display_name ?? null,
      tier: client?.tier ?? null,
      riskProfile: client?.risk_profile ?? null,
      status: client?.status ?? "active",
      metrics,
      lastUpdated: now,
    };
  });

  const firmAum = books.reduce((s, b) => s + b.metrics.totalValue, 0);
  const clientBooks = books.filter((b) => b.accountType === "client");
  const personal = books.find((b) => b.accountType === "personal");
  const totalUnrealized = books.reduce((s, b) => s + b.metrics.unrealizedPnl, 0);
  const totalCash = books.reduce((s, b) => s + b.metrics.cash, 0);
  const openPositions = books.reduce((s, b) => s + b.metrics.openPositions, 0);

  return NextResponse.json({
    books,
    summary: {
      firmAum,
      clientCount: clientBooks.length,
      personalAum: personal?.metrics.totalValue ?? 0,
      clientAum: clientBooks.reduce((s, b) => s + b.metrics.totalValue, 0),
      totalCash,
      totalUnrealized,
      openPositions,
      lastUpdated: now,
    },
  });
}
