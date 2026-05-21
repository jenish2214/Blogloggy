import { NextResponse } from "next/server";
import { fromCache, toCache, fmt } from "@/lib/market-fetch";

export async function GET() {
  const key = "crypto:top20";
  const cached = fromCache<unknown[]>(key);
  if (cached) return NextResponse.json({ coins: cached, cached: true });

  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h,24h,7d",
    { headers: { "User-Agent": "QuantDesk/1.0" } }
  );
  const data = await res.json();
  const coins = data.map((c: Record<string, unknown>) => ({
    symbol: String(c.symbol ?? "").toUpperCase(),
    name: c.name,
    coingeckoId: c.id,
    price: fmt(c.current_price as number),
    change1h: fmt(c.price_change_percentage_1h_in_currency as number),
    change24h: fmt(c.price_change_percentage_24h as number),
    change7d: fmt(c.price_change_percentage_7d_in_currency as number),
    marketCap: c.market_cap,
    volume24h: c.total_volume,
    image: c.image,
    updatedAt: new Date().toISOString(),
  }));
  toCache(key, coins, 60_000);
  return NextResponse.json({ coins, cached: false });
}
