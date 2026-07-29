import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";

/**
 * Lightweight auth probe for client components that can't read the httpOnly
 * session cookie (e.g. the marketing nav). Returns only a boolean — no PII —
 * so it's safe to call from any public page. Never cached.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { authenticated: !!user },
    { headers: { "Cache-Control": "no-store" } },
  );
}
