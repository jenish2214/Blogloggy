import { NextRequest, NextResponse } from "next/server";
import type { FinnhubProxyEndpoint } from "@/types/finnhub";
import {
  finnhubProxyCall,
  getFinnhubApiKey,
} from "@/lib/market/finnhubClient";

const CACHE_TTL_MS = 30_000;
const VALID: FinnhubProxyEndpoint[] = [
  "quote",
  "profile",
  "metric",
  "news-sentiment",
  "earnings",
  "candle",
];

const cache = new Map<string, { body: string; status: number; expiresAt: number }>();

function cacheKey(endpoint: string, qs: string): string {
  return `${endpoint}?${qs}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  const endpoint = params.endpoint as FinnhubProxyEndpoint;

  if (!VALID.includes(endpoint)) {
    return NextResponse.json({ error: "unknown_endpoint" }, { status: 400 });
  }

  if (!getFinnhubApiKey()) {
    return NextResponse.json(
      {
        error: "finnhub_not_configured",
        hint: "Set FINNHUB_API_KEY (server-only)",
      },
      { status: 503 }
    );
  }

  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol?.trim()) {
    return NextResponse.json({ error: "symbol_required" }, { status: 400 });
  }

  const proxyParams = {
    symbol: symbol.trim(),
    metric: req.nextUrl.searchParams.get("metric") ?? undefined,
    from: req.nextUrl.searchParams.get("from") ?? undefined,
    to: req.nextUrl.searchParams.get("to") ?? undefined,
    resolution: req.nextUrl.searchParams.get("resolution") ?? undefined,
  };

  const key = cacheKey(endpoint, req.nextUrl.searchParams.toString());
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return new NextResponse(hit.body, {
      status: hit.status,
      headers: { "content-type": "application/json", "x-cache": "HIT" },
    });
  }

  try {
    const data = await finnhubProxyCall(endpoint, proxyParams);
    const body = JSON.stringify(data);
    cache.set(key, { body, status: 200, expiresAt: Date.now() + CACHE_TTL_MS });
    return new NextResponse(body, {
      status: 200,
      headers: { "content-type": "application/json", "x-cache": "MISS" },
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "from_and_to_required") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const stale = cache.get(key);
    if (stale) {
      return new NextResponse(stale.body, {
        status: stale.status,
        headers: { "content-type": "application/json", "x-cache": "STALE" },
      });
    }

    return NextResponse.json(
      { error: "finnhub_fetch_failed", detail: message },
      { status: message.includes("429") ? 429 : 502 }
    );
  }
}
