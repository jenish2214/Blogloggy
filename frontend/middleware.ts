import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/auth/admin";
import { hasStaticAdminSession } from "@/lib/auth/staticAdmin";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/env";
import {
  getOnboardingRedirect,
  hasCompletedOnboarding,
  isWelcomePath,
} from "@/lib/legal/onboarding";
import {
  featureKeyForPath,
  getFeatureAccessFromUser,
} from "@/lib/user/featureAccess";

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
  "/risk",
  "/screener",
];

const AUTH_PATHS = ["/login", "/signup"];

function isAuthPath(path: string) {
  return AUTH_PATHS.includes(path) || path.startsWith("/auth/");
}

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

function isAdminLoginPath(path: string) {
  return path === "/admin/login";
}

function handleAdminRoute(request: NextRequest, supabaseAdmin: boolean) {
  const path = request.nextUrl.pathname;
  const admin = hasStaticAdminSession(request) || supabaseAdmin;

  if (isAdminLoginPath(path)) {
    if (admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return null;
  }

  if (!admin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    if (path !== "/admin") {
      url.searchParams.set("redirect", path);
    }
    return NextResponse.redirect(url);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isAdminPath(path) && !hasSupabaseEnv()) {
    const adminRedirect = handleAdminRoute(request, false);
    return adminRedirect ?? NextResponse.next({ request });
  }

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
    const isApiRoute = path.startsWith("/api/");

    if (isApiRoute) {
      return supabaseResponse;
    }

    if (isAdminPath(path)) {
      const adminRedirect = handleAdminRoute(request, isAdminUser(user));
      return adminRedirect ?? supabaseResponse;
    }

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

      if (onboardingDone) {
        const access = getFeatureAccessFromUser(user);
        const featureKey = featureKeyForPath(path);
        if (featureKey && !access[featureKey]) {
          const url = request.nextUrl.clone();
          url.pathname = "/";
          url.searchParams.set("feature", featureKey);
          return NextResponse.redirect(url);
        }
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

const AUTH_API_PREFIXES = [
  "/api/wealth",
  "/api/portfolio",
  "/api/wallet",
  "/api/orders",
  "/api/watchlist",
  "/api/messages",
  "/api/user",
];

export const config = {
  matcher: [
    ...AUTH_API_PREFIXES.flatMap((p) => [p, `${p}/:path*`]),
    "/((?!_next/static|_next/image|favicon.ico|icons|brand|api).*)",
  ],
};
