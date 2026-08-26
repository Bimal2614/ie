import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { isGoogleConfigured } from "@/lib/env";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/lib/oauth/google";
import { createSession } from "@/lib/session";
import { safeEqual } from "@/lib/security/tokens";
import { normalizePhone } from "@/lib/phone";

/**
 * Google OAuth callback → find-or-create the user, then create an app session.
 * Verifies the CSRF `state` cookie, links by googleId → email, and blocks
 * deactivated accounts.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?oauth=${reason}`, req.url));

  if (!isGoogleConfigured()) return fail("unavailable");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const stored = jar.get("g_oauth_state")?.value;
  jar.delete("g_oauth_state");

  if (url.searchParams.get("error") || !code || !state || !stored || !safeEqual(state, stored)) {
    return fail("failed");
  }

  const token = await exchangeGoogleCode(code);
  if (!token) return fail("failed");
  const profile = await fetchGoogleProfile(token);
  if (!profile) return fail("failed");

  // Google almost never returns a number (the scope is sensitive and not
  // requested), so `profile.phone` is normally null and the account is created
  // without one. AppShell then prompts for it on the first authed page.
  const phone = normalizePhone(profile.phone);

  const emailNorm = profile.email.trim().toLowerCase();

  // 1) already linked by googleId?
  let [user] = await db
    .select({ id: users.id, deactivatedAt: users.deactivatedAt, phone: users.phone })
    .from(users)
    .where(eq(users.googleId, profile.sub))
    .limit(1);

  // 2) else an existing account with the same email → link it.
  if (!user) {
    const [byEmail] = await db
      .select({
        id: users.id,
        deactivatedAt: users.deactivatedAt,
        emailVerified: users.emailVerified,
        passwordHash: users.passwordHash,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.emailNormalized, emailNorm))
      .limit(1);
    if (byEmail) {
      // Signup takes the address at face value, so an unverified row with a
      // password may have been planted by someone who does not own the mailbox,
      // waiting for the real owner to arrive through Google. Google has now
      // proved ownership, so the account is rightly this user's — but the
      // planted password must not survive the link, and neither may any session
      // opened with it. The owner sets a fresh one via the reset flow.
      const dropPassword = !byEmail.emailVerified && byEmail.passwordHash !== null;
      await db
        .update(users)
        .set({
          googleId: profile.sub,
          emailVerified: true,
          updatedAt: new Date(),
          // Never overwrite a number the user gave us themselves.
          ...(phone && !byEmail.phone ? { phone } : {}),
          ...(dropPassword ? { passwordHash: null, passwordChangedAt: new Date() } : {}),
        })
        .where(eq(users.id, byEmail.id));
      if (dropPassword) {
        await db.delete(sessions).where(eq(sessions.userId, byEmail.id));
      }
      user = byEmail;
    }
  }

  // 3) else create a fresh OAuth account (no password).
  if (!user) {
    const [created] = await db
      .insert(users)
      .values({
        email: profile.email,
        emailNormalized: emailNorm,
        emailVerified: profile.emailVerified,
        googleId: profile.sub,
        name: profile.name,
        phone,
        avatarUrl: profile.picture ?? null,
      })
      .returning({ id: users.id, deactivatedAt: users.deactivatedAt, phone: users.phone });
    user = created;
  }

  if (user.deactivatedAt) return fail("deactivated");

  // Already-linked account that predates the phone column (or was created
  // before Google started returning one).
  if (phone && !user.phone) {
    await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  await createSession(user.id);
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
