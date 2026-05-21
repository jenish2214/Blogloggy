import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const results = (data?.quotes ?? [])
      .filter((r: Record<string,unknown>) => r.quoteType === "EQUITY" || r.quoteType === "CRYPTOCURRENCY")
      .slice(0, 8)
      .map((r: Record<string,unknown>) => ({ symbol: r.symbol, name: r.longname ?? r.shortname, exchange: r.exchange, type: r.quoteType === "CRYPTOCURRENCY" ? "crypto" : "stock" }));
    return NextResponse.json({ results });
  } catch { return NextResponse.json({ results: [] }); }
}
