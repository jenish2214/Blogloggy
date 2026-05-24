/**
 * Resolve public site URL for OAuth, SSR fetch, and metadata.
 * Uses explicit NEXT_PUBLIC_SITE_URL, then Vercel system variables.
 * @see https://vercel.com/docs/environment-variables/system-environment-variables
 */

function trimUrl(url) {
  return typeof url === "string" ? url.trim().replace(/\/$/, "") : "";
}

function fromHost(host) {
  if (!host) return "";
  return host.startsWith("http") ? trimUrl(host) : `https://${host}`;
}

/** @returns {string} */
function resolveSiteUrl() {
  const explicit = trimUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;

  // Production canonical domain (shortest custom domain or *.vercel.app)
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return fromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }

  // Preview / branch deployment URL
  if (process.env.VERCEL_URL) {
    return fromHost(process.env.VERCEL_URL);
  }

  return "http://localhost:3000";
}

module.exports = { resolveSiteUrl };
