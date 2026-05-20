const API_HEALTH_URL =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/api\/?$/, "") ??
  "http://localhost:4000";

export const API_HEALTH_LINK = `${API_HEALTH_URL}/api/health`;

export function formatApiError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  const lower = raw.toLowerCase();

  if (
    !raw ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed")
  ) {
    return "Can't reach the API server. Start it with npm run dev from the project root.";
  }

  if (lower.includes("cors")) {
    return "Browser blocked the request (CORS). Restart the backend and use http://localhost:3000.";
  }

  if (lower.startsWith("api error 5") || lower.includes("internal server")) {
    return "The API returned a server error. Check the backend terminal for details.";
  }

  if (lower.startsWith("api error 4")) {
    return raw.replace(/^api error /i, "API returned ");
  }

  return raw || "The API request failed.";
}

export function isLikelyApiUnavailable(error: string | null | undefined): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return (
    lower.includes("can't reach") ||
    lower.includes("failed to fetch") ||
    lower.includes("cors") ||
    lower.includes("api server") ||
    lower.includes("api returned")
  );
}
