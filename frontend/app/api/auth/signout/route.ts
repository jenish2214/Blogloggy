import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Clears Supabase auth cookies on the server (pairs with client signOut). */
export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
