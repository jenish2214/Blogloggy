import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolvePortfolio, type PortfolioRow } from "@/lib/wealth/booksServer";
import { MAX_DEPOSIT_PER_TX, MAX_WITHDRAWAL_24H } from "@/lib/wealth/walletLimits";

export interface WalletTransactionRow {
  id: string;
  user_id: string;
  portfolio_id: string;
  client_id: string | null;
  tx_type: "deposit" | "withdrawal";
  amount: number;
  status: string;
  note: string | null;
  balance_after: number | null;
  created_at: string;
}

export async function withdrawalSumLast24h(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("wallet_transactions")
    .select("amount")
    .eq("portfolio_id", portfolioId)
    .eq("tx_type", "withdrawal")
    .eq("status", "completed")
    .gte("created_at", since);

  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}

export function validateDepositAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount greater than zero.";
  if (amount > MAX_DEPOSIT_PER_TX) {
    return `Maximum deposit per transaction is ${MAX_DEPOSIT_PER_TX.toLocaleString()} (100 million).`;
  }
  return null;
}

export async function validateWithdrawalAmount(
  supabase: SupabaseClient,
  book: PortfolioRow,
  amount: number
): Promise<string | null> {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount greater than zero.";
  const cash = Number(book.cash);
  if (amount > cash) {
    return `Insufficient wallet balance. Available: $${cash.toLocaleString()}.`;
  }
  const used = await withdrawalSumLast24h(supabase, book.id);
  if (used + amount > MAX_WITHDRAWAL_24H) {
    const remaining = Math.max(0, MAX_WITHDRAWAL_24H - used);
    return `24-hour withdrawal limit is $${MAX_WITHDRAWAL_24H.toLocaleString()}. You can withdraw up to $${remaining.toLocaleString()} more today.`;
  }
  return null;
}

export async function listWalletTransactions(
  supabase: SupabaseClient,
  portfolioId: string,
  limit = 100
): Promise<WalletTransactionRow[]> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as WalletTransactionRow[];
}

export async function processWalletDeposit(
  supabase: SupabaseClient,
  user: User,
  book: PortfolioRow,
  amount: number,
  note?: string
): Promise<{ success: true; transaction: WalletTransactionRow; cash: number } | { success: false; message: string }> {
  const err = validateDepositAmount(amount);
  if (err) return { success: false, message: err };

  const cash = Number(book.cash) + amount;
  const { data: tx, error: txErr } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      portfolio_id: book.id,
      client_id: book.client_id,
      tx_type: "deposit",
      amount,
      status: "completed",
      note: note?.trim() || "Client deposit · received by advisor",
      balance_after: cash,
    })
    .select()
    .single();

  if (txErr) return { success: false, message: txErr.message };

  const { error: updErr } = await supabase
    .from("portfolios")
    .update({ cash, updated_at: new Date().toISOString() })
    .eq("id", book.id);

  if (updErr) return { success: false, message: updErr.message };

  return {
    success: true,
    transaction: tx as WalletTransactionRow,
    cash,
  };
}

export async function processWalletWithdrawal(
  supabase: SupabaseClient,
  user: User,
  book: PortfolioRow,
  amount: number,
  note?: string
): Promise<{ success: true; transaction: WalletTransactionRow; cash: number } | { success: false; message: string }> {
  const err = await validateWithdrawalAmount(supabase, book, amount);
  if (err) return { success: false, message: err };

  const cash = Number(book.cash) - amount;
  const { data: tx, error: txErr } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      portfolio_id: book.id,
      client_id: book.client_id,
      tx_type: "withdrawal",
      amount,
      status: "completed",
      note: note?.trim() || "Withdrawal request · processed by advisor",
      balance_after: cash,
    })
    .select()
    .single();

  if (txErr) return { success: false, message: txErr.message };

  const { error: updErr } = await supabase
    .from("portfolios")
    .update({ cash, updated_at: new Date().toISOString() })
    .eq("id", book.id);

  if (updErr) return { success: false, message: updErr.message };

  return {
    success: true,
    transaction: tx as WalletTransactionRow,
    cash,
  };
}

export async function getWalletSummary(
  supabase: SupabaseClient,
  userId: string,
  bookOpts?: { portfolioId?: string; clientId?: string | null }
) {
  const book = await resolvePortfolio(supabase, userId, bookOpts);
  if (!book) return null;

  const [transactions, withdrawn24h] = await Promise.all([
    listWalletTransactions(supabase, book.id, 200),
    withdrawalSumLast24h(supabase, book.id),
  ]);

  const deposits = transactions.filter((t) => t.tx_type === "deposit");
  const withdrawals = transactions.filter((t) => t.tx_type === "withdrawal");

  return {
    book: {
      portfolioId: book.id,
      clientId: book.client_id,
      accountType: book.account_type,
      label: book.account_label,
      cash: Number(book.cash),
    },
    limits: {
      maxDepositPerTx: MAX_DEPOSIT_PER_TX,
      maxWithdrawal24h: MAX_WITHDRAWAL_24H,
      withdrawn24h,
      withdrawalRemaining24h: Math.max(0, MAX_WITHDRAWAL_24H - withdrawn24h),
    },
    stats: {
      totalDeposits: deposits.reduce((s, t) => s + Number(t.amount), 0),
      totalWithdrawals: withdrawals.reduce((s, t) => s + Number(t.amount), 0),
      depositCount: deposits.length,
      withdrawalCount: withdrawals.length,
    },
    transactions,
  };
}
