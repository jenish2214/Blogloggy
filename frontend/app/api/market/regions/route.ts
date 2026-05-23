import { NextResponse } from "next/server";
import { WORLD_MARKETS } from "@/lib/markets/world-markets";

export async function GET() {
  const regions = Object.values(WORLD_MARKETS).map((r) => ({
    id: r.id,
    label: r.label,
    flag: r.flag,
    currency: r.currency,
    exchange: r.exchange,
    count: r.symbols.length,
  }));
  return NextResponse.json({ regions });
}
