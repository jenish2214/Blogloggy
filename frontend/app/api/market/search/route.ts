import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`, { headers: { "User-Agent": "QuantDesk/1.0" } });
    const data = await res.json();
    const results = (data?.quotes ?? [])
      .filter((r: Record<string, unknown>) => {
        const qt = r.quoteType as string;
        return (
          qt === "EQUITY" ||
          qt === "CRYPTOCURRENCY" ||
          qt === "FUTURE" ||
          qt === "ETF" ||
          qt === "INDEX"
        );
      })
      .slice(0, 10)
      .map((r: Record<string, unknown>) => {
        const qt = r.quoteType as string;
        let type = "stock";
        if (qt === "CRYPTOCURRENCY") type = "crypto";
        else if (qt === "FUTURE") type = (r.symbol as string)?.includes("GC") ? "gold" : "commodity";
        return {
          symbol: r.symbol as string,
          name: (r.longname ?? r.shortname ?? r.symbol) as string,
          exchange: r.exchange as string,
          type,
        };
      });

    const qLower = q.toLowerCase();
    const extras: Array<{ symbol: string; name: string; exchange: string; type: string }> = [];
    if (qLower.includes("gold") || qLower === "gc") {
      extras.push({ symbol: "GC=F", name: "Gold Futures", exchange: "COMEX", type: "gold" });
    }
    if (qLower.includes("google") || qLower.includes("alphabet")) {
      extras.unshift({ symbol: "GOOGL", name: "Alphabet Inc. (Google)", exchange: "NASDAQ", type: "stock" });
    }

    const merged = [...extras, ...results].filter(
      (item, idx, arr) => arr.findIndex((x) => x.symbol === item.symbol) === idx
    );

    return NextResponse.json({ results: merged.slice(0, 10) });
  } catch { return NextResponse.json({ results: [] }); }
}
