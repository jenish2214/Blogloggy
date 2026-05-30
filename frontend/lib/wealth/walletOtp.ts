import { createHmac, randomInt } from "crypto";

const OTP_TTL_MS = 5 * 60 * 1000;

export function otpTtlMs() {
  return OTP_TTL_MS;
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function otpSecret(): string {
  return (
    process.env.WALLET_OTP_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "quantdesk-paper-otp"
  );
}

export function hashOtp(code: string, challengeId: string): string {
  return createHmac("sha256", otpSecret())
    .update(`${challengeId}:${code.trim()}`)
    .digest("hex");
}

export function verifyOtpHash(code: string, challengeId: string, expectedHash: string): boolean {
  const normalized = code.replace(/\D/g, "");
  if (normalized.length !== 6) return false;
  const actual = hashOtp(normalized, challengeId);
  return actual === expectedHash;
}

/** Paper trading: surface code in API for demo UX (disable in production via env). */
export function shouldExposeDemoOtp(): boolean {
  if (process.env.WALLET_OTP_DEMO === "false") return false;
  return process.env.NODE_ENV !== "production" || process.env.WALLET_OTP_DEMO === "true";
}
