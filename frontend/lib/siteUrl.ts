/** Public site origin (injected in next.config from env or Vercel system vars). */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return url || "http://localhost:3000";
}

/** True when running on Vercel (build or runtime). @see https://vercel.com/docs/environment-variables/system-environment-variables */
export function isVercel(): boolean {
  return process.env.VERCEL === "1";
}

/** `production` | `preview` | `development` | empty locally */
export function getVercelEnv(): string {
  return process.env.VERCEL_ENV ?? "";
}

/** Deployment hostname without protocol (e.g. `my-app.vercel.app`). Server/runtime only. */
export function getVercelUrl(): string | undefined {
  return process.env.VERCEL_URL;
}
