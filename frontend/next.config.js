const { resolveSiteUrl } = require("./lib/siteUrl.js");
const { resolveSupabasePublicEnv } = require("./lib/supabaseEnv.js");

const siteUrl = resolveSiteUrl();
const supabase = resolveSupabasePublicEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["finnhub"],
  },
  env: {
    NEXT_PUBLIC_SITE_URL: siteUrl,
    // NEXT_PUBLIC_* or Vercel Supabase integration (SUPABASE_URL / SUPABASE_ANON_KEY)
    NEXT_PUBLIC_SUPABASE_URL: supabase.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/((?!_next|favicon.ico|icons|brand).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
