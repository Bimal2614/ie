"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { partners, users, sessions } from "@/db/schema";
import { forgotPasswordSchema, resetPasswordSchema, type AuthFormState } from "@/lib/validation";
import { createAuthToken, consumeAuthToken } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/session";
import { sendEmail } from "@/lib/email/mailer";
import { resetPasswordTemplate, passwordChangedTemplate } from "@/lib/email/templates";
import { partnerOrigin } from "@/lib/partner-tenant";

/**
 * Start a password reset. Always returns ok (never reveals whether an account
 * exists — no enumeration). Rate-limited per IP.
 */
export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { email } = parsed.data;
  const { ip } = await getRequestContext();
  const limit = await rateLimit(`pwreset:ip:${ip ?? "unknown"}`, 5, 60 * 60);
  if (!limit.allowed) return { error: "Too many reset requests. Please try again later." };

  // The class's subdomain, when the account belongs to a white-labelled class:
  // the reset lands where the student signs in, under the class's name.
  const [user] = await db
    .select({ id: users.id, name: users.name, subdomain: partners.subdomain })
    .from(users)
    .leftJoin(partners, eq(partners.id, users.partnerId))
    .where(eq(users.emailNormalized, email))
    .limit(1);

  if (user) {
    const raw = await createAuthToken(user.id, "password_reset");
    const link = `${partnerOrigin(user.subdomain)}/reset-password?token=${raw}`;
    const t = resetPasswordTemplate(link);
    await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
  }

  // Uniform response regardless of whether the account exists.
  return { ok: true };
}

/** Complete a password reset with a valid token. */
export async function resetPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    if (fe.token) return { error: "This reset link is invalid. Please request a new one." };
    return { fieldErrors: { newPassword: fe.newPassword ?? [] } };
  }

  const userId = await consumeAuthToken(parsed.data.token, "password_reset");
  if (!userId) return { error: "This reset link is invalid or has expired. Please request a new one." };

  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ email: users.email, partnerId: users.partnerId });

  // Revoke all existing sessions — a reset should log out everywhere.
  await db.delete(sessions).where(eq(sessions.userId, userId));

  // Tell the account holder their password moved. If the reset was not theirs,
  // this is the only warning they get. Best-effort: the reset itself succeeded
  // and a mail outage must not report it as failed.
  if (updated?.email) {
    try {
      const [home] = updated.partnerId
        ? await db.select({ subdomain: partners.subdomain }).from(partners).where(eq(partners.id, updated.partnerId)).limit(1)
        : [];
      const t = passwordChangedTemplate(`${partnerOrigin(home?.subdomain)}/forgot-password`, { signedOutEverywhere: true });
      await sendEmail({ to: updated.email, subject: t.subject, html: t.html, text: t.text });
    } catch {
      // Nothing to do; the password is already changed.
    }
  }

  return { ok: true };
}
