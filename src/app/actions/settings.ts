"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { profileSchema, passwordChangeSchema, type AuthFormState } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { destroySession } from "@/lib/session";

const emptyToNull = (v: string | undefined) => (v && v.length ? v : null);

/** Update the signed-in user's profile + IELTS goals. */
export async function updateProfile(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    country: formData.get("country") ?? undefined,
    targetModule: formData.get("targetModule"),
    targetBand: formData.get("targetBand") ?? undefined,
    examDate: formData.get("examDate") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { name, country, targetModule, targetBand, examDate } = parsed.data;
  await db
    .update(users)
    .set({
      name,
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

  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return { fieldErrors: { currentPassword: ["That password is incorrect"] } };
  }
  if (await verifyPassword(parsed.data.newPassword, row.passwordHash)) {
    return { fieldErrors: { newPassword: ["Choose a password different from your current one"] } };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return { ok: true };
}

/** Permanently delete the account. Cascades remove all related rows. */
export async function deleteAccount(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser();

  if (String(formData.get("confirm") ?? "") !== "DELETE") {
    return { fieldErrors: { confirm: ['Type DELETE to confirm'] } };
  }

  await db.delete(users).where(eq(users.id, user.id));
  await destroySession();
  redirect("/");
}
