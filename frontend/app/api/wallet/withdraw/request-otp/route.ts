import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePortfolio } from "@/lib/wealth/booksServer";
import { createWithdrawalOtpChallenge } from "@/lib/wealth/walletOtpServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const bookOpts = {
    portfolioId: body.portfolioId as string | undefined,
    clientId: body.clientId as string | null | undefined,
  };

  const book = await resolvePortfolio(supabase, user.id, bookOpts);
  if (!book) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  const result = await createWithdrawalOtpChallenge(supabase, user, book, amount);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: 400 });
  }

  const maskedEmail = result.email
    ? result.email.replace(/(.{2})(.*)(@.*)/, "$1•••$3")
    : "your email";

  return NextResponse.json({
    success: true,
    challengeId: result.challengeId,
    expiresAt: result.expiresAt,
    maskedEmail,
    message: `Verification code sent to ${maskedEmail}`,
    demoCode: result.demoCode,
  });
}
