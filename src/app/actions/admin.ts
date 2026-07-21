"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";

/**
 * Reactivate an account that was disabled (e.g. by automatic rate-limit
 * deactivation). Admin-only. Clears the deactivation flag; the user can sign in
 * again and old rate-limit violation counters expire on their own window.
 */
export async function reactivateAccount(userId: string): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();

  await db
    .update(users)
    .set({ deactivatedAt: null, deactivationReason: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.insert(auditLog).values({
    userId,
    event: "account.reactivated",
    metadata: { by: admin.id },
  });

  return { ok: true };
}
