import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { createAuthToken, consumeAuthToken } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email/mailer";
import { resetPasswordTemplate, passwordChangedTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";

/**
 * Password recovery, shared by the website's form actions and the app's JSON
 * routes.
 *
 * `server-only` rather than `"use server"`, for the reason set out in
 * src/lib/section-grading.ts. Here it matters less — neither function takes a
 * user id — but keeping the policy in one place is the point: the throttle, the
 * anti-enumeration answer and the session revocation must be identical on both
 * doors, and two copies is how one of them ends up telling an attacker which
 * email addresses exist.
 */

const APP_URL = env.APP_URL ?? "https://ieltsvega.com";

export type ResetRequestOutcome = { ok: true } | { ok: false; reason: "rate_limited" };

/**
 * Start a password reset.
 *
 * ALWAYS REPORTS SUCCESS when it was allowed to run, whether or not the address
 * belongs to an account. That uniform answer is the whole anti-enumeration
 * property — a "no such account" here is a free membership oracle over every
 * email address anyone cares to try — so it must not be "improved" into a more
 * helpful error on either door.
 *
 * The one thing it does report is the throttle, because a caller that is being
 * rate limited needs to be told to wait rather than to try again immediately.
 */
export async function startPasswordReset(
  email: string,
  ip: string | null,
): Promise<ResetRequestOutcome> {
  const limit = await rateLimit(`pwreset:ip:${ip ?? "unknown"}`, 5, 60 * 60);
  if (!limit.allowed) return { ok: false, reason: "rate_limited" };

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.emailNormalized, email))
    .limit(1);

  if (user) {
    const raw = await createAuthToken(user.id, "password_reset");
    const link = `${APP_URL}/reset-password?token=${raw}`;
    const t = resetPasswordTemplate(link);
    await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
  }

  return { ok: true };
}

export type ResetOutcome = { ok: true } | { ok: false; reason: "invalid_token" };

/**
 * Complete a password reset with a valid token.
 *
 * REVOKES EVERY SESSION, on every device — unlike a password *change*, which
 * keeps them. The distinction is deliberate and worth keeping straight: a reset
 * proves control of the mailbox and is the path an attacker would use, so it
 * clears everything; a change is already authenticated by a live session plus
 * the old password, and revoking there would mostly punish the owner.
 *
 * A client that has just completed one therefore holds a dead token and must
 * discard it.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<ResetOutcome> {
  const userId = await consumeAuthToken(token, "password_reset");
  if (!userId) return { ok: false, reason: "invalid_token" };

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      passwordChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ email: users.email });

  await db.delete(sessions).where(eq(sessions.userId, userId));

  // Tell the account holder their password moved. If the reset was not theirs,
  // this is the only warning they get. Best-effort: the reset itself succeeded
  // and a mail outage must not report it as failed.
  if (updated?.email) {
    try {
      const t = passwordChangedTemplate(`${APP_URL}/forgot-password`, {
        signedOutEverywhere: true,
      });
      await sendEmail({ to: updated.email, subject: t.subject, html: t.html, text: t.text });
    } catch {
      // Nothing to do; the password is already changed.
    }
  }

  return { ok: true };
}
