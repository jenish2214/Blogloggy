import { NextRequest, NextResponse } from "next/server";
import { getFinnhubApiKey } from "@/lib/market/finnhubClient";
import { fromCache, toCache } from "@/lib/market-fetch";

export interface EarningsEvent {
  symbol: string;
  date: string;
  hour?: string;
  epsEstimate?: number;
  revenueEstimate?: number;
}

export async function GET(req: NextRequest) {
  const key = getFinnhubApiKey();
  if (!key) {
    return NextResponse.json({ error: "finnhub_not_configured", events: [] }, { status: 503 });
  }

  const from =
    req.nextUrl.searchParams.get("from") ??
    new Date().toISOString().slice(0, 10);
  const toParam = req.nextUrl.searchParams.get("to");
  const to =
    toParam ??
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const cacheKey = `earnings:${from}:${to}`;
  const cached = fromCache<{ events: EarningsEvent[] }>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  try {
    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Finnhub ${res.status}`);
    const data = (await res.json()) as {
      earningsCalendar?: Array<{
        symbol?: string;
        date?: string;
        hour?: string;
        epsEstimate?: number;
        revenueEstimate?: number;
      }>;
    };

    const raw: EarningsEvent[] = (data.earningsCalendar ?? [])
      .filter((e) => e.symbol && e.date)
      .map((e) => ({
        symbol: e.symbol!.toUpperCase(),
        date: e.date!,
        hour: e.hour,
        epsEstimate: e.epsEstimate,
        revenueEstimate: e.revenueEstimate,
      }));

    const seen = new Map<string, EarningsEvent>();
    for (const ev of raw) {
      const dedupeKey = `${ev.symbol}|${ev.date}|${ev.hour ?? ""}`;
      if (!seen.has(dedupeKey)) seen.set(dedupeKey, ev);
    }
    const events = Array.from(seen.values()).sort(
      (a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol)
    );

    const payload = { events };
    toCache(cacheKey, payload, 3600_000);
    return NextResponse.json({ ...payload, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: "earnings_fetch_failed", detail: String(err), events: [] },
      { status: 502 }
    );
  }
}
