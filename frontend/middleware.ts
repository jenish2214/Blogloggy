import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/env";
import {
  getOnboardingRedirect,
  hasCompletedOnboarding,
  isWelcomePath,
} from "@/lib/legal/onboarding";

const PROTECTED = [
  "/markets",
  "/trade",
  "/portfolio",
  "/wallet",
  "/wealth",
  "/desk",
  "/options",
  "/research",
  "/quant-lab",
  "/orders",
  "/profile",
  "/algo",
  "/algo-trading",
  "/forex",
  "/forex-options",
  "/messages",
];

const AUTH_PATHS = ["/login", "/signup"];

function isAuthPath(path: string) {
  return AUTH_PATHS.includes(path) || path.startsWith("/auth/");
}

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;
    const onboardingDone = hasCompletedOnboarding(user);
    const isProtected = PROTECTED.some((p) => path.startsWith(p));

    if (!user && isWelcomePath(path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    if (user) {
      if (!onboardingDone) {
        const required = getOnboardingRedirect(user);
        if (!isAuthPath(path) && path !== required) {
          const url = request.nextUrl.clone();
          url.pathname = required;
          return NextResponse.redirect(url);
        }
      }

      if (onboardingDone && isWelcomePath(path)) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      if (isAuthPath(path)) {
        const url = request.nextUrl.clone();
        url.pathname = onboardingDone ? "/" : getOnboardingRedirect(user);
        return NextResponse.redirect(url);
      }
    }
  } catch {
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|brand|api).*)"],
};
