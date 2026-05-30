import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/fetchMarketQuotes";
import type { DashboardBookSummary, DashboardSummaryPayload } from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import {
  computeBookMetrics,
  ensurePersonalPortfolio,
  filterPositionsForBook,
  INITIAL_PERSONAL_CASH,
  resolvePortfolio,
  type PortfolioRow,
} from "@/lib/wealth/booksServer";
import { listWalletTransactions } from "@/lib/wealth/walletServer";

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

function emptyTotals(): DashboardSummaryPayload["totals"] {
  const cap = INITIAL_PERSONAL_CASH;
  return {
    totalPortfolioValue: cap,
    totalStartingCapital: cap,
    totalPnl: 0,
    totalPnlPct: 0,
    totalCash: cap,
    totalInvested: 0,
    unrealizedPnl: 0,
    bookCount: 0,
    openPositions: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function guestPayload(): DashboardSummaryPayload {
  return {
    guest: true,
    scope: "all",
    portfolio: {
      accountLabel: "Guest",
      cash: INITIAL_PERSONAL_CASH,
      totalValue: INITIAL_PERSONAL_CASH,
      startingCapital: INITIAL_PERSONAL_CASH,
      totalPnl: 0,
      totalPnlPct: 0,
      openPositions: 0,
      orderCount: 0,
      invested: 0,
    },
    firm: { aum: 0, clientBooks: 0, openPositions: 0 },
    totals: emptyTotals(),
    books: [],
    benchmark: null,
    personalAum: 0,
    clientAum: 0,
    activity: { watchlistSymbols: 0, walletTransactions: 0, clientBooks: 0 },
  };
}

async function fetchBenchmark(): Promise<DashboardSummaryPayload["benchmark"]> {
  try {
    const { quotes } = await fetchMarketQuotes(["SPY"]);
    const spy = quotes.find((q) => q.symbol === "SPY" || q.symbol.includes("SPY"));
    if (!spy || spy.price <= 0) return null;
    return {
      symbol: "SPY",
      name: "S&P 500",
      price: spy.price,
      changePct: spy.changePct ?? 0,
    };
  } catch {
    return null;
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

function buildBookSummaries(
  portfolios: PortfolioRow[],
  clients: Array<{ id: string; display_name: string }>,
  allPositions: Array<Record<string, unknown>>,
  prices: Record<string, number>,
  orderCounts: Record<string, number>
): DashboardBookSummary[] {
  return portfolios.map((pf) => {
    const pos = filterPositionsForBook(pf, allPositions);
    const m = computeBookMetrics(pf, pos, prices);
    const client = pf.client_id ? clients.find((c) => c.id === pf.client_id) : null;
    return {
      portfolioId: pf.id,
      clientId: pf.client_id,
      accountLabel: pf.account_label ?? "Account",
      accountType: pf.account_type as "personal" | "client",
      clientName: client?.display_name ?? null,
      totalValue: m.totalValue,
      startingCapital: m.startingCapital,
      totalPnl: m.totalPnl,
      totalPnlPct: m.totalPnlPct,
      cash: m.cash,
      invested: m.invested,
      openPositions: m.openPositions,
      orderCount: orderCounts[pf.id] ?? 0,
    };
  });
}

function computeTotalsForPortfolios(
  portfolioList: PortfolioRow[],
  allPositions: Array<Record<string, unknown>>,
  prices: Record<string, number>
): DashboardSummaryPayload["totals"] {
  let totalPortfolioValue = 0;
  let totalStarting = 0;
  let totalCash = 0;
  let totalInvested = 0;
  let totalUnrealized = 0;
  let openPositions = 0;

  for (const pf of portfolioList) {
    const pos = filterPositionsForBook(pf, allPositions);
    const m = computeBookMetrics(pf, pos, prices);
    totalPortfolioValue += m.totalValue;
    totalStarting += m.startingCapital;
    totalCash += m.cash;
    totalInvested += m.invested;
    totalUnrealized += m.unrealizedPnl;
    openPositions += m.openPositions;
  }

  const totalPnl = totalPortfolioValue - totalStarting;
  const totalPnlPct = totalStarting > 0 ? (totalPnl / totalStarting) * 100 : 0;

  return {
    totalPortfolioValue,
    totalStartingCapital: totalStarting,
    totalPnl,
    totalPnlPct,
    totalCash,
    totalInvested,
    unrealizedPnl: totalUnrealized,
    bookCount: portfolioList.length,
    openPositions,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(guestPayload());
  }

  const portfolioIdParam = req.nextUrl.searchParams.get("portfolioId") ?? undefined;
  const clientIdParam = req.nextUrl.searchParams.get("clientId") ?? undefined;

  await ensurePersonalPortfolio(supabase, user.id);

  const [profileRes, portfoliosRes, clientsRes, positionsRes, ordersRes, watchlistRes] =
    await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("portfolios").select("*").eq("user_id", user.id),
      supabase
        .from("wealth_clients")
        .select("id, display_name")
        .eq("advisor_id", user.id)
        .eq("status", "active"),
      supabase.from("positions").select("*").eq("user_id", user.id),
      supabase.from("orders").select("id, portfolio_id").eq("user_id", user.id),
      supabase.from("watchlist").select("symbol").eq("user_id", user.id),
    ]);

  const clients = clientsRes.data ?? [];
  const clientIds = new Set(clients.map((c) => c.id));

  const portfolios = (portfoliosRes.data ?? []).filter(
    (p) => !p.client_id || clientIds.has(p.client_id)
  ) as PortfolioRow[];

  if (portfolios.length === 0) {
    return NextResponse.json(guestPayload());
  }

  const allPositions = positionsRes.data ?? [];
  const prices = await fetchLivePrices(allPositions);
  const orderCounts = countOrdersByPortfolio(ordersRes.data ?? []);

  const books = buildBookSummaries(portfolios, clients, allPositions, prices, orderCounts);
  books.sort((a, b) => b.totalValue - a.totalValue);

  const personalBooks = books.filter((b) => b.accountType === "personal");
  const clientBooks = books.filter((b) => b.accountType === "client");
  const personalAum = personalBooks.reduce((s, b) => s + b.totalValue, 0);
  const clientAum = clientBooks.reduce((s, b) => s + b.totalValue, 0);

  const activeBook = await resolvePortfolio(supabase, user.id, {
    portfolioId: portfolioIdParam,
    clientId: clientIdParam,
  });

  const scopeBook =
    activeBook &&
    portfolios.some((p) => p.id === activeBook.id) &&
    (portfolioIdParam || clientIdParam)
      ? activeBook
      : null;

  const scope: DashboardSummaryPayload["scope"] = scopeBook ? "book" : "all";

  const totalsPortfolios = scopeBook ? [scopeBook] : portfolios;
  const totals = computeTotalsForPortfolios(totalsPortfolios, allPositions, prices);

  const personal =
    portfolios.find((p) => p.account_type === "personal" && !p.client_id) ?? portfolios[0]!;

  const focusPortfolio = scopeBook ?? personal;
  const focusPositions = filterPositionsForBook(focusPortfolio, allPositions);
  const focusMetrics = computeBookMetrics(focusPortfolio, focusPositions, prices);
  focusMetrics.orderCount = scopeBook
    ? orderCounts[scopeBook.id] ?? 0
    : (ordersRes.data ?? []).filter(
        (o) => o.portfolio_id === personal.id || (!o.portfolio_id && !personal.client_id)
      ).length;

  let walletTxCount = 0;
  try {
    const txs = await listWalletTransactions(supabase, focusPortfolio.id, 50);
    walletTxCount = txs.length;
  } catch {
    walletTxCount = 0;
  }

  const benchmark = await fetchBenchmark();

  const meta = user.user_metadata ?? {};
  const profileRow = profileRes.data;
  const displayName =
    (profileRow?.full_name as string) ||
    (meta.full_name as string) ||
    (meta.display_name as string) ||
    user.email?.split("@")[0] ||
    "";

  const focusLabel =
    scopeBook?.account_label ??
    (scopeBook?.client_id
      ? clients.find((c) => c.id === scopeBook.client_id)?.display_name
      : null) ??
    "Personal Account";

  const payload: DashboardSummaryPayload = {
    guest: false,
    scope,
    activePortfolioId: scopeBook?.id ?? null,
    activeAccountLabel: scopeBook ? focusLabel : null,
    user: {
      id: user.id,
      email: user.email ?? "",
      displayName,
    },
    profile: {
      fullName: (profileRow?.full_name as string) || (meta.full_name as string) || "",
      experienceLevel:
        (profileRow?.experience_level as string) ?? (meta.experience_level as string) ?? null,
      primaryInterest:
        (profileRow?.primary_interest as string) ?? (meta.primary_interest as string) ?? null,
      profileCompleted: Boolean(
        profileRow?.profile_completed_at ?? meta.profile_completed_at
      ),
    },
    portfolio: {
      accountLabel: focusLabel,
      cash: focusMetrics.cash,
      totalValue: focusMetrics.totalValue,
      startingCapital: focusMetrics.startingCapital,
      totalPnl: focusMetrics.totalPnl,
      totalPnlPct: focusMetrics.totalPnlPct,
      openPositions: focusMetrics.openPositions,
      orderCount: focusMetrics.orderCount,
      invested: focusMetrics.invested,
    },
    firm: {
      aum: scope === "book" ? focusMetrics.totalValue : personalAum + clientAum,
      clientBooks: clientBooks.length,
      openPositions: scope === "book" ? focusMetrics.openPositions : totals.openPositions,
    },
    totals,
    books,
    personalAum,
    clientAum,
    benchmark,
    activity: {
      watchlistSymbols: (watchlistRes.data ?? []).length,
      walletTransactions: walletTxCount,
      clientBooks: clientBooks.length,
    },
  };

  return NextResponse.json(payload);
}
