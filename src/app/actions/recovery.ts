"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { forgotPasswordSchema, resetPasswordSchema, type AuthFormState } from "@/lib/validation";
import { createAuthToken, consumeAuthToken } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/session";
import { sendEmail } from "@/lib/email/mailer";
import { resetPasswordTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";

const APP_URL = env.APP_URL ?? "https://ieltsvega.com";

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

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Revoke all existing sessions — a reset should log out everywhere.
  await db.delete(sessions).where(eq(sessions.userId, userId));

  return { ok: true };
}
