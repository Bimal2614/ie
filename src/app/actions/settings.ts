"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { profileSchema, passwordChangeSchema, phoneSchema, type AuthFormState } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { sendEmail } from "@/lib/email/mailer";
import { passwordChangedTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";

const emptyToNull = (v: string | undefined) => (v && v.length ? v : null);

/** Update the signed-in user's profile + IELTS goals. */
export async function updateProfile(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    country: formData.get("country") ?? undefined,
    targetModule: formData.get("targetModule"),
    targetBand: formData.get("targetBand") ?? undefined,
    examDate: formData.get("examDate") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { name, phone, country, targetModule, targetBand, examDate } = parsed.data;
  await db
    .update(users)
    .set({
      name,
      phone,
      country: emptyToNull(country),
      targetModule,
      targetBand: emptyToNull(targetBand),
      examDate: examDate && examDate.length ? new Date(examDate) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Save a phone number for an account that has none.
 *
 * Backs the app-shell prompt shown to Google sign-ins, which land without a
 * number (Google's phone scope is sensitive and not requested). Deliberately
 * fill-only: it will not overwrite an existing number, so the prompt can never
 * be used — by a stale tab or a crafted POST — to clobber one the user set in
 * Settings. Changing an existing number goes through `updateProfile`.
 */
export async function savePhone(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();

  const parsed = phoneSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await db
    .update(users)
    .set({ phone: parsed.data.phone, updatedAt: new Date() })
    .where(and(eq(users.id, user.id), isNull(users.phone)));

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Change the signed-in user's password (verifies the current one first). */
export async function changePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  // OAuth-only accounts (Google) have no password to change.
  if (!row?.passwordHash) {
    return { error: "Your account uses Google sign-in, so there's no password to change." };
  }
  if (!(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return { fieldErrors: { currentPassword: ["That password is incorrect"] } };
  }
  if (await verifyPassword(parsed.data.newPassword, row.passwordHash)) {
    return { fieldErrors: { newPassword: ["Choose a password different from your current one"] } };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Security notice, same as the reset flow. Best-effort: the password has
  // already changed and a mail outage must not report that as a failure.
  try {
    const t = passwordChangedTemplate(`${env.APP_URL ?? "https://ieltsvega.com"}/forgot-password`);
    await sendEmail({ to: user.email, subject: t.subject, html: t.html, text: t.text });
  } catch {
    // Nothing to do; the password is already changed.
  }

  return { ok: true };
}

