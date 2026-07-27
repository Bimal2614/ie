import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeAuthToken } from "@/lib/auth-tokens";

/**
 * Email verification link target. Consumes the single-use token, marks the
 * account verified, and redirects to login with a status flag.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = await consumeAuthToken(token, "email_verify");

  if (userId) {
    await db.update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, userId));
    return NextResponse.redirect(new URL("/login?verified=1", req.url));
  }
  return NextResponse.redirect(new URL("/login?verify=invalid", req.url));
}
