import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/auth/admin";
import { hasStaticAdminSession } from "@/lib/auth/staticAdmin";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/env";
import { isWelcomePath } from "@/lib/legal/onboarding";
/** App sections that require a signed-in user (guests may browse home, login, signup, etc.). */
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

const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

function isProtectedPath(path: string) {
  return PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
}

function isAuthPath(path: string) {
  return AUTH_PATHS.includes(path) || path.startsWith("/auth/");
}

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

function isAdminLoginPath(path: string) {
  return path === "/admin/login";
}

function loginRedirect(request: NextRequest, returnPath?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (returnPath && returnPath !== "/login" && returnPath !== "/signup") {
    url.searchParams.set("redirect", returnPath);
  }
  return NextResponse.redirect(url);
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

    if (!user) {
      if (isWelcomePath(path)) {
        return loginRedirect(request);
      }
      if (isProtectedPath(path)) {
        return loginRedirect(request, path);
      }
      return supabaseResponse;
    }

    if (isWelcomePath(path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Always allow login / signup pages to render (sign-out, switch account, new signup).
    if (isAuthPath(path)) {
      return supabaseResponse;
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
