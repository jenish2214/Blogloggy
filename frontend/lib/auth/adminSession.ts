import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isValidStaticAdminSession,
} from "@/lib/auth/staticAdmin";

export async function getStaticAdminSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidStaticAdminSession(raw)) return null;
  return raw!.trim().toLowerCase();
}
