"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { authenticatedUserById, type AuthenticatedUser } from "@/lib/session";
import {
  profileSchema,
  passwordChangeSchema,
  phoneSchema,
  type AuthFormState,
  type ProfileInput,
} from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { sendEmail } from "@/lib/email/mailer";
import { passwordChangedTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";

const emptyToNull = (v: string | undefined) => (v && v.length ? v : null);

export type ProfileUpdateResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; message: string; fields?: Record<string, string[]> };

/**
 * Write a profile update and hand back the account as it now stands.
 *
 * Takes ALREADY-VALIDATED input and a user id, so the website's form action and
 * the JSON API share the write without sharing a transport. The refreshed user
 * is re-read rather than assembled from the values just written: `plan` and
 * `planExpiresAt` are not editable here, and a response that rebuilt them from
 * a stale in-memory copy would quietly undo a subscription a webhook had
 * applied a second earlier.
 */
export async function updateProfileFor(
  userId: string,
  input: ProfileInput,
): Promise<ProfileUpdateResult> {
  const { name, phone, country, targetModule, targetBand, examDate } = input;

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
    .where(eq(users.id, userId));

  const user = await authenticatedUserById(userId);
  if (!user) return { ok: false, message: "That account is no longer available." };
  return { ok: true, user };
}

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

  const result = await updateProfileFor(user.id, parsed.data);
  if (!result.ok) return { error: result.message };

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

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; message: string; fields?: Record<string, string[]> };

/**
 * Change a password, having verified the current one.
 *
 * Shared by the settings form and the API. The three refusals below are
 * separate on purpose — "you have no password", "that is not your password" and
 * "that is the password you already have" need three different things from the
 * user, and collapsing them into one message makes the third look like a bug.
 */
export async function changePasswordFor(
  userId: string,
  email: string,
  input: { currentPassword: string; newPassword: string },
): Promise<PasswordChangeResult> {
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // OAuth-only accounts (Google) have no password to change.
  if (!row?.passwordHash) {
    return { ok: false, message: "Your account uses Google sign-in, so there's no password to change." };
  }
  if (!(await verifyPassword(input.currentPassword, row.passwordHash))) {
    return {
      ok: false,
      message: "That password is incorrect",
      fields: { currentPassword: ["That password is incorrect"] },
    };
  }
  if (await verifyPassword(input.newPassword, row.passwordHash)) {
    return {
      ok: false,
      message: "Choose a password different from your current one",
      fields: { newPassword: ["Choose a password different from your current one"] },
    };
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(input.newPassword),
      passwordChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Security notice, same as the reset flow. Best-effort: the password has
  // already changed and a mail outage must not report that as a failure.
  try {
    const t = passwordChangedTemplate(`${env.APP_URL ?? "https://ieltsvega.com"}/forgot-password`);
    await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
  } catch {
    // Nothing to do; the password is already changed.
  }

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

  const result = await changePasswordFor(user.id, user.email, parsed.data);
  if (!result.ok) {
    return result.fields ? { fieldErrors: result.fields } : { error: result.message };
  }
  return { ok: true };
}

