import { NextResponse } from "next/server";

/** Legacy endpoint — use POST /api/legal/onboarding with step "about" after both pages. */
export async function POST() {
  return NextResponse.json(
    { error: "Use /welcome/about after reading Terms & About Us." },
    { status: 410 }
  );
}
