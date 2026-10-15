import "server-only";

import { cookies } from "next/headers";
import { and, count, eq, gt, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiCreditSpends, signupDevices, users } from "@/db/schema";
import { env } from "@/lib/env";
import { DEVICE_COOKIE, DEVICE_SEPARATOR, DEVICE_SIGNAL_PATTERN } from "@/lib/device-cookie";

/**
 * Free AI credits: a taste of Writing/Speaking band scoring before the paywall.
 *
 * THE UNIT IS ONE SUBMITTED ATTEMPT, not one answer. A Task 2 essay is one
 * credit, and so is a seven-question Speaking Part 1 — charging per question
 * would spend a whole grant on a single sitting of Part 1.
 *
 * WHO GETS THEM. Every account created after this shipped is granted
 * `FREE_AI_CREDITS` (env, default 5) at insert — unless the browser it was
 * created from already claimed a grant (see `signup_devices`), in which case the
 * account is created normally with 0. Accounts from before the release keep 0.
 * Paid plans never read the balance.
 *
 * WHERE IT IS SPENT. At submit, in the same transaction that writes the answers
 * (`spendAiCredit`), so a candidate can never have answers recorded for scoring
 * without paying for them, or pay for answers that were not recorded. The
 * scorers run later, in `after()` and the sweeper, when the balance may already
 * read 0; they ask `attemptIsCreditFunded` instead.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DeviceSignals = { deviceId: string | null; localId: string | null };

/** The device cookie written by the auth pages; anything malformed is dropped. */
export async function readDeviceSignals(): Promise<DeviceSignals> {
  const raw = (await cookies()).get(DEVICE_COOKIE)?.value ?? "";
  const [d = "", l = ""] = raw.split(DEVICE_SEPARATOR);
  return {
    deviceId: DEVICE_SIGNAL_PATTERN.test(d) ? d : null,
    localId: DEVICE_SIGNAL_PATTERN.test(l) ? l : null,
  };
}

/**
 * How many credits a brand-new self-service account gets.
 *
 * 0 when this device has already been granted credits. A device we cannot
 * recognise (no cookie: script blocked, cookies off) gets the grant — signup is
 * never punished for a missing signal.
 */
export async function creditsForNewAccount(signals: DeviceSignals): Promise<number> {
  const grant = env.FREE_AI_CREDITS;
  if (grant === 0) return 0;

  const match = [
    signals.deviceId ? eq(signupDevices.deviceId, signals.deviceId) : null,
    signals.localId ? eq(signupDevices.localId, signals.localId) : null,
  ].filter((c) => c !== null);
  if (match.length === 0) return grant;

  const [row] = await db
    .select({ n: count() })
    .from(signupDevices)
    .where(and(or(...match), gt(signupDevices.creditsGranted, 0)));
  return Number(row?.n ?? 0) > 0 ? 0 : grant;
}

/** Log the signup's device. Best-effort: a failure here must not undo an account. */
export async function recordSignupDevice(
  userId: string,
  signals: DeviceSignals,
  ip: string | null,
  creditsGranted: number,
): Promise<void> {
  try {
    await db.insert(signupDevices).values({
      userId,
      deviceId: signals.deviceId,
      localId: signals.localId,
      ipAddress: ip,
      creditsGranted,
    });
  } catch (e) {
    console.error("[ai-credits] failed to record signup device", e);
  }
}

/**
 * Spend one credit on `attemptId`, inside the caller's transaction.
 *
 * Returns the balance left, or null when there was nothing to spend (the
 * conditional UPDATE is what makes two simultaneous submits unable to share the
 * last credit). Spending twice on one attempt is refused by the unique index.
 */
export async function spendAiCredit(tx: Tx, userId: string, attemptId: string): Promise<number | null> {
  const [row] = await tx
    .update(users)
    .set({ aiCredits: sql`${users.aiCredits} - 1` })
    .where(and(eq(users.id, userId), gte(users.aiCredits, 1)))
    .returning({ aiCredits: users.aiCredits });
  if (!row) return null;
  await tx.insert(aiCreditSpends).values({ userId, attemptId });
  return row.aiCredits;
}

/** Was this practice attempt paid for with a free credit? */
export async function attemptIsCreditFunded(attemptId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: aiCreditSpends.id })
    .from(aiCreditSpends)
    .where(eq(aiCreditSpends.attemptId, attemptId))
    .limit(1);
  return Boolean(row);
}

/** Has this account ever spent a credit? Tells "used them all" from "never had any". */
export async function hasSpentAiCredits(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: aiCreditSpends.id })
    .from(aiCreditSpends)
    .where(eq(aiCreditSpends.userId, userId))
    .limit(1);
  return Boolean(row);
}
