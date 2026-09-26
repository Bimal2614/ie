import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, auditLog } from "@/db/schema";
import { isGoogleConfigured } from "@/lib/env";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/lib/oauth/google";
import { referringPartner } from "@/lib/partners";
import { REFERRAL_COOKIE } from "@/lib/partner-referral";
import { createSession, getRequestContext } from "@/lib/session";
import { safeEqual } from "@/lib/security/tokens";
import { normalizePhone } from "@/lib/phone";
import { SIGNED_UP_COOKIE } from "@/lib/analytics";

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

  /*
   * The class whose invite link sent them here, parked by /api/auth/google.
   *
   * READ AND CLEARED BEFORE ANYTHING CAN FAIL, on every path through this
   * route. A referral that survived a failed sign-in would attach the next
   * person to use this browser — a shared computer in a cyber café is the
   * ordinary case, not the exotic one.
   */
  const referralId = jar.get(REFERRAL_COOKIE)?.value ?? null;
  jar.delete(REFERRAL_COOKIE);

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
    /*
     * Only a NEW account is attached to the class, and that is the whole rule.
     *
     * Branches 1 and 2 above found an account that already existed, and an
     * invite link is not a way to take one over: following one would hand a
     * class the practice history and results of anybody who happened to open
     * the link and sign in with an account they already had. A candidate the
     * class already teaches gets enrolled from the panel instead, which is a
     * deliberate act by someone with a login.
     *
     * The id is re-read against `partners` here — see `referringPartner`. Until
     * this line it is a string off a public URL that has been checked for
     * nothing but its shape.
     */
    const referrer = await referringPartner(referralId);
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
        partnerId: referrer?.id ?? null,
      })
      .returning({ id: users.id, deactivatedAt: users.deactivatedAt, phone: users.phone });
    user = created;
    // A new account, not a returning sign-in — see SignupBeacon.
    jar.set(SIGNED_UP_COOKIE, "google", {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    if (referrer) {
      // Same event the email signup writes, for the same reason: this account
      // was created by the candidate, not by the class. See src/app/actions/auth.ts.
      try {
        await db.insert(auditLog).values({
          userId: created.id,
          event: "partner.student.referred",
          metadata: { partnerId: referrer.id, via: "google" },
        });
      } catch {
        // The audit trail must never be what fails a sign-in.
      }
    }
  }

  if (user.deactivatedAt) return fail("deactivated");

  // Already-linked account that predates the phone column (or was created
  // before Google started returning one).
  if (phone && !user.phone) {
    await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  /*
   * Last seen, on the way through.
   *
   * This path never touched the column, so a Google account read as "never
   * signed in" for its whole life — harmless while nobody was looking, and
   * wrong the moment a partner's roster started counting it for students who
   * joined through an invite link. The password path has always done this in
   * its own success branch; see the `login` action.
   */
  const { ip } = await getRequestContext();
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), lastLoginIp: ip })
    .where(eq(users.id, user.id));

  await createSession(user.id);
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
