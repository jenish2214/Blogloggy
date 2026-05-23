import { NextRequest, NextResponse } from "next/server";
import { blackScholes } from "@/lib/market-fetch";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { S, K, T, r = 0.05, sigma, type = "call" } = body;
  if (!S || !K || !sigma) return NextResponse.json({ error: "S, K, sigma required" }, { status: 400 });
  const result = blackScholes(Number(S), Number(K), Number(T), Number(r), Number(sigma), type);
  return NextResponse.json({ result, inputs: { S, K, T, r, sigma, type } });
}
