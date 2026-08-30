import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";

/**
 * Lightweight auth probe for client components that can't read the httpOnly
 * session cookie (e.g. the marketing nav, the pricing cards).
 *
 * Returns whether there is a session and which tier it is on — nothing else.
 * No name, no email, no id: this is called from public pages and the answer is
 * cached in localStorage, so it carries only what the UI needs to pick a
 * button. `plan` is already resolved against expiry by the DAL, so a lapsed
 * subscription reads as `free` here exactly as it does at every gate.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { authenticated: !!user, plan: user?.plan ?? "free" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
