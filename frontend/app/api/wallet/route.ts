import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePortfolio } from "@/lib/wealth/booksServer";
import {
  getWalletSummary,
  processWalletDeposit,
  processWalletWithdrawal,
} from "@/lib/wealth/walletServer";

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
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const summary = await getWalletSummary(supabase, user.id, bookQueryFromUrl(req));
  if (!summary) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const amount = Number(body.amount);
  const note = typeof body.note === "string" ? body.note : undefined;
  const bookOpts = {
    portfolioId: body.portfolioId as string | undefined,
    clientId: body.clientId as string | null | undefined,
  };

  const book = await resolvePortfolio(supabase, user.id, bookOpts);
  if (!book) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  if (action === "deposit") {
    const result = await processWalletDeposit(supabase, user, book, amount, note);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      message: `Deposit of $${amount.toLocaleString()} received. Wallet balance updated.`,
      transaction: result.transaction,
      cash: result.cash,
    });
  }

  if (action === "withdraw") {
    const result = await processWalletWithdrawal(supabase, user, book, amount, note);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      message: `Withdrawal of $${amount.toLocaleString()} processed.`,
      transaction: result.transaction,
      cash: result.cash,
    });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
