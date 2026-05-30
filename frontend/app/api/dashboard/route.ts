import { NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/fetchMarketQuotes";
import type { DashboardSummaryPayload } from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import {
  computeBookMetrics,
  ensurePersonalPortfolio,
  filterPositionsForBook,
  INITIAL_PERSONAL_CASH,
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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(guestPayload());
  }

  await ensurePersonalPortfolio(supabase, user.id);

  const [profileRes, portfoliosRes, clientsRes, positionsRes, ordersRes, watchlistRes] =
    await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("portfolios").select("*").eq("user_id", user.id),
      supabase
        .from("wealth_clients")
        .select("id")
        .eq("advisor_id", user.id)
        .eq("status", "active"),
      supabase.from("positions").select("*").eq("user_id", user.id),
      supabase.from("orders").select("id, portfolio_id").eq("user_id", user.id),
      supabase.from("watchlist").select("symbol").eq("user_id", user.id),
    ]);

  const portfolios = portfoliosRes.data ?? [];
  const personal =
    portfolios.find((p) => p.account_type === "personal" && !p.client_id) ??
    portfolios[0];
  if (!personal) {
    return NextResponse.json(guestPayload());
  }

  const allPositions = positionsRes.data ?? [];
  const personalPositions = filterPositionsForBook(personal, allPositions);
  const prices = await fetchLivePrices(allPositions);
  const metrics = computeBookMetrics(personal, personalPositions, prices);
  const personalOrders = (ordersRes.data ?? []).filter(
    (o) => o.portfolio_id === personal.id || !o.portfolio_id
  );

  const clientBooks = (clientsRes.data ?? []).length;
  let walletTxCount = 0;
  try {
    const txs = await listWalletTransactions(supabase, personal.id, 50);
    walletTxCount = txs.length;
  } catch {
    walletTxCount = 0;
  }

  let firmAum = 0;
  let firmOpen = 0;
  let totalStarting = 0;
  let totalCash = 0;
  let totalInvested = 0;
  let totalUnrealized = 0;
  const books: DashboardSummaryPayload["books"] = [];

  for (const pf of portfolios) {
    const pos = filterPositionsForBook(pf, allPositions);
    const m = computeBookMetrics(pf, pos, prices);
    firmAum += m.totalValue;
    firmOpen += m.openPositions;
    totalStarting += m.startingCapital;
    totalCash += m.cash;
    totalInvested += m.invested;
    totalUnrealized += m.unrealizedPnl;
    books.push({
      portfolioId: pf.id,
      accountLabel: pf.account_label ?? "Account",
      accountType: pf.account_type as "personal" | "client",
      totalValue: m.totalValue,
      startingCapital: m.startingCapital,
      totalPnl: m.totalPnl,
      totalPnlPct: m.totalPnlPct,
      cash: m.cash,
      invested: m.invested,
      openPositions: m.openPositions,
    });
  }

  books.sort((a, b) => b.totalValue - a.totalValue);

  const totalPnl = firmAum - totalStarting;
  const totalPnlPct = totalStarting > 0 ? (totalPnl / totalStarting) * 100 : 0;
  const benchmark = await fetchBenchmark();

  const meta = user.user_metadata ?? {};
  const profileRow = profileRes.data;
  const displayName =
    (profileRow?.full_name as string) ||
    (meta.full_name as string) ||
    (meta.display_name as string) ||
    user.email?.split("@")[0] ||
    "";

  const payload: DashboardSummaryPayload = {
    guest: false,
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
      accountLabel: personal.account_label ?? "Personal Account",
      cash: metrics.cash,
      totalValue: metrics.totalValue,
      startingCapital: metrics.startingCapital,
      totalPnl: metrics.totalPnl,
      totalPnlPct: metrics.totalPnlPct,
      openPositions: metrics.openPositions,
      orderCount: personalOrders.length,
      invested: metrics.invested,
    },
    firm: {
      aum: firmAum,
      clientBooks,
      openPositions: firmOpen,
    },
    totals: {
      totalPortfolioValue: firmAum,
      totalStartingCapital: totalStarting,
      totalPnl,
      totalPnlPct,
      totalCash,
      totalInvested,
      unrealizedPnl: totalUnrealized,
      bookCount: portfolios.length,
      openPositions: firmOpen,
      lastUpdated: new Date().toISOString(),
    },
    books,
    benchmark,
    activity: {
      watchlistSymbols: (watchlistRes.data ?? []).length,
      walletTransactions: walletTxCount,
      clientBooks,
    },
  };

  return NextResponse.json(payload);
}
