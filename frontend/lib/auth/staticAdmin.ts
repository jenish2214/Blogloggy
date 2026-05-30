import type { NextRequest } from "next/server";

/** Static admin credentials (override via env in production). */
export const STATIC_ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@quantdesk.com";

export const STATIC_ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD?.trim() || "Admin@12345";

export const ADMIN_SESSION_COOKIE = "qd_admin_session";

export function verifyStaticAdminCredentials(
  email: string,
  password: string
): boolean {
  return (
    email.trim().toLowerCase() === STATIC_ADMIN_EMAIL && password === STATIC_ADMIN_PASSWORD
  );
}

export function isValidStaticAdminSession(value: string | undefined | null): boolean {
  if (!value) return false;
  return value.trim().toLowerCase() === STATIC_ADMIN_EMAIL;
}

export function getStaticAdminSessionEmail(
  request: NextRequest
): string | null {
  const raw = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidStaticAdminSession(raw) ? raw!.trim().toLowerCase() : null;
}

export function hasStaticAdminSession(request: NextRequest): boolean {
  return getStaticAdminSessionEmail(request) !== null;
}
