/** Try providers in order; return first successful result. */
export async function fetchWithFallback<T>(
  providers: { name: string; fetch: () => Promise<T | null> }[]
): Promise<{ data: T; source: string } | null> {
  for (const p of providers) {
    try {
      const data = await p.fetch();
      if (data != null && (Array.isArray(data) ? data.length > 0 : true)) {
        return { data, source: p.name };
      }
    } catch (err) {
      console.warn(`[Fallback] ${p.name} failed:`, (err as Error).message);
    }
  }
  return null;
}
