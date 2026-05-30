import type { SupabaseClient } from "@supabase/supabase-js";

export const INITIAL_PERSONAL_CASH = 100_000;

export interface PortfolioRow {
  id: string;
  user_id: string;
  client_id: string | null;
  account_label: string;
  account_type: "personal" | "client";
  cash: number;
  starting_capital: number;
  created_at: string;
  updated_at: string;
}

export interface WealthClientRow {
  id: string;
  advisor_id: string;
  client_code: string;
  display_name: string;
  email: string | null;
  tier: string;
  risk_profile: string;
  status: string;
  initial_capital: number;
  notes: string | null;
  created_at: string;
}

/** Resolve which portfolio book to use (personal default). */
export async function resolvePortfolio(
  supabase: SupabaseClient,
  userId: string,
  opts?: { portfolioId?: string; clientId?: string | null }
): Promise<PortfolioRow | null> {
  if (opts?.portfolioId) {
    const { data } = await supabase
      .from("portfolios")
      .select("*")
      .eq("id", opts.portfolioId)
      .eq("user_id", userId)
      .maybeSingle();
    return data as PortfolioRow | null;
  }

  if (opts?.clientId) {
    const { data } = await supabase
      .from("portfolios")
      .select("*")
      .eq("user_id", userId)
      .eq("client_id", opts.clientId)
      .maybeSingle();
    if (data) return data as PortfolioRow;
    return ensureClientPortfolio(supabase, userId, opts.clientId);
  }

  return ensurePersonalPortfolio(supabase, userId);
}

export async function ensurePersonalPortfolio(
  supabase: SupabaseClient,
  userId: string
): Promise<PortfolioRow | null> {
  const { data: existing } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .is("client_id", null)
    .maybeSingle();

  if (existing) return existing as PortfolioRow;

  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: userId,
      client_id: null,
      account_label: "Personal Account",
      account_type: "personal",
      cash: INITIAL_PERSONAL_CASH,
      starting_capital: INITIAL_PERSONAL_CASH,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !created) return null;
  return created as PortfolioRow;
}

export async function ensureClientPortfolio(
  supabase: SupabaseClient,
  userId: string,
  clientId: string
): Promise<PortfolioRow | null> {
  const { data: client } = await supabase
    .from("wealth_clients")
    .select("*")
    .eq("id", clientId)
    .eq("advisor_id", userId)
    .maybeSingle();

  if (!client) return null;

  const { data: existing } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) return existing as PortfolioRow;

  const cap = Number(client.initial_capital) || 500_000;
  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: userId,
      client_id: clientId,
      account_label: `${client.display_name} — Managed`,
      account_type: "client",
      cash: cap,
      starting_capital: cap,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !created) return null;
  return created as PortfolioRow;
}

export function computeBookMetrics(
  portfolio: PortfolioRow,
  positions: Array<Record<string, unknown>>,
  prices: Record<string, number>
) {
  let marketValue = 0;
  let costBasis = 0;
  let unrealized = 0;
  const openCount = positions.filter((p) => Number(p.qty) > 0.000001).length;

  for (const p of positions) {
    const qty = Number(p.qty);
    if (qty <= 0.000001) continue;
    const sym = String(p.symbol);
    const avg = Number(p.avg_price);
    const cur = prices[sym] ?? Number(p.current_price) ?? avg;
    const basis = avg * qty;
    costBasis += basis;
    marketValue += cur * qty;
    unrealized += (cur - avg) * qty;
  }

  const cash = Number(portfolio.cash);
  const totalValue = cash + marketValue;
  const starting = Number(portfolio.starting_capital) || INITIAL_PERSONAL_CASH;
  const totalPnl = totalValue - starting;
  const totalPnlPct = starting > 0 ? (totalPnl / starting) * 100 : 0;

  return {
    cash,
    invested: marketValue,
    costBasis,
    totalValue,
    startingCapital: starting,
    totalPnl,
    totalPnlPct,
    unrealizedPnl: unrealized,
    openPositions: openCount,
    orderCount: 0,
  };
}

/** Positions belonging to one portfolio book only — never mix client books. */
export function filterPositionsForBook(
  portfolio: PortfolioRow,
  allPositions: Array<Record<string, unknown>>
) {
  return allPositions.filter((p) => {
    const pid = p.portfolio_id as string | null | undefined;
    if (portfolio.client_id) {
      return pid === portfolio.id;
    }
    if (pid === portfolio.id) return true;
    // Legacy rows without portfolio_id belong to personal book only
    if (pid == null) return true;
    return false;
  });
}
