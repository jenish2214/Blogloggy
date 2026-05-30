import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmWithdrawalWithOtp } from "@/lib/wealth/walletOtpServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const otp = String(body.otp ?? "").replace(/\D/g, "");
  const challengeId = String(body.challengeId ?? "");
  const note = typeof body.note === "string" ? body.note : undefined;

  if (!challengeId || otp.length !== 6) {
    return NextResponse.json(
      { success: false, message: "Enter the 6-digit verification code." },
      { status: 400 }
    );
  }

  const result = await confirmWithdrawalWithOtp(
    supabase,
    user,
    {
      portfolioId: body.portfolioId as string | undefined,
      clientId: body.clientId as string | null | undefined,
    },
    challengeId,
    otp,
    note
  );

  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    cash: result.cash,
    amount: result.amount,
    transaction: result.transaction,
  });
}
