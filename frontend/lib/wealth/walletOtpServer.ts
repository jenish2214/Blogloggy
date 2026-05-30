import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolvePortfolio, type PortfolioRow } from "@/lib/wealth/booksServer";
import {
  generateOtpCode,
  hashOtp,
  otpTtlMs,
  shouldExposeDemoOtp,
  verifyOtpHash,
} from "@/lib/wealth/walletOtp";
import { processWalletWithdrawal, validateWithdrawalAmount } from "@/lib/wealth/walletServer";

export async function createWithdrawalOtpChallenge(
  supabase: SupabaseClient,
  user: User,
  book: PortfolioRow,
  amount: number
): Promise<
  | {
      success: true;
      challengeId: string;
      expiresAt: string;
      email: string;
      demoCode?: string;
    }
  | { success: false; message: string }
> {
  const err = await validateWithdrawalAmount(supabase, book, amount);
  if (err) return { success: false, message: err };

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + otpTtlMs()).toISOString();

  const { data: row, error } = await supabase
    .from("wallet_otp_challenges")
    .insert({
      user_id: user.id,
      portfolio_id: book.id,
      amount,
      otp_hash: hashOtp(code, "pending"),
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !row) {
    const msg = error?.message ?? "Could not create verification";
    if (msg.includes("wallet_otp_challenges")) {
      return {
        success: false,
        message:
          "Withdrawal verification is not set up on the database yet. Apply migration wallet_otp_challenges (see supabase/migrations).",
      };
    }
    return { success: false, message: msg };
  }

  const challengeId = row.id as string;
  const otpHash = hashOtp(code, challengeId);

  await supabase
    .from("wallet_otp_challenges")
    .update({ otp_hash: otpHash })
    .eq("id", challengeId);

  return {
    success: true,
    challengeId,
    expiresAt,
    email: user.email ?? "",
    demoCode: shouldExposeDemoOtp() ? code : undefined,
  };
}

export async function confirmWithdrawalWithOtp(
  supabase: SupabaseClient,
  user: User,
  bookOpts: { portfolioId?: string; clientId?: string | null },
  challengeId: string,
  otp: string,
  note?: string
) {
  const book = await resolvePortfolio(supabase, user.id, bookOpts);
  if (!book) return { success: false as const, message: "Book not found" };

  const { data: challenge, error } = await supabase
    .from("wallet_otp_challenges")
    .select("*")
    .eq("id", challengeId)
    .eq("user_id", user.id)
    .eq("portfolio_id", book.id)
    .maybeSingle();

  if (error || !challenge) {
    return { success: false as const, message: "Verification expired. Request a new code." };
  }

  if (challenge.used_at) {
    return { success: false as const, message: "This code was already used." };
  }

  if (new Date(challenge.expires_at as string).getTime() < Date.now()) {
    return { success: false as const, message: "Code expired. Request a new one." };
  }

  if (!verifyOtpHash(otp, challengeId, challenge.otp_hash as string)) {
    return { success: false as const, message: "Incorrect verification code." };
  }

  const amount = Number(challenge.amount);
  const validation = await validateWithdrawalAmount(supabase, book, amount);
  if (validation) return { success: false as const, message: validation };

  const result = await processWalletWithdrawal(supabase, user, book, amount, note);
  if (!result.success) return result;

  await supabase
    .from("wallet_otp_challenges")
    .update({ used_at: new Date().toISOString() })
    .eq("id", challengeId);

  return {
    success: true as const,
    message: `Withdrawal of $${amount.toLocaleString()} completed securely.`,
    transaction: result.transaction,
    cash: result.cash,
    amount,
  };
}
