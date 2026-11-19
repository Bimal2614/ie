import { SUPPORT_EMAIL } from "@/lib/brand-links";

/**
 * Prefix `registerViolation` (src/lib/security/rate-guard.ts) writes into
 * `users.deactivation_reason`. Kept here so the writer and the readers below
 * cannot drift apart.
 */
export const RATE_LIMIT_DEACTIVATION_PREFIX = "Automatic:";

/**
 * How long an automatic rate-limit pause lasts.
 *
 * ONLY THE AUTOMATIC PAUSE EXPIRES. It is the machine's guess that someone was
 * flooding us, and on 17 Nov 2026 it guessed wrong about a real candidate who
 * tapped fast on a phone — so it must not be a life sentence that needs a human
 * to notice. An admin's deactivation is a decision, and it stays until an admin
 * presses Enable.
 *
 * It is lifted lazily, at the next sign-in after this window (see
 * `liftExpiredPause` in rate-guard.ts): no cron, nothing to fail silently.
 */
export const PAUSE_HOURS = 48;

type Deactivation = { deactivatedAt: Date | null; deactivationReason: string | null };

export function isRateLimitPause(u: Deactivation): boolean {
  return Boolean(u.deactivatedAt && u.deactivationReason?.startsWith(RATE_LIMIT_DEACTIVATION_PREFIX));
}

/** When an automatic pause ends; null for anything else (an admin's, or none). */
export function pauseEndsAt(u: Deactivation): Date | null {
  if (!isRateLimitPause(u) || !u.deactivatedAt) return null;
  return new Date(u.deactivatedAt.getTime() + PAUSE_HOURS * 3_600_000);
}

/**
 * What a deactivated account is told when it tries to sign in.
 *
 * WHY THIS EXISTS. Before it, the password login never looked at
 * `deactivated_at`: it signed the user in, the DAL then rejected the session,
 * and /logout landed them on "Signing in on another device ends the session
 * here." A candidate auto-paused for tapping too fast was told someone else was
 * in their account.
 *
 * Hours rather than a clock time: candidates sign in from India, Australia, the
 * UK and Canada, and "in about 30 hours" is right in every one of them.
 */
export function pausedMessage(hoursLeft: number | null): string {
  const when =
    hoursLeft === null
      ? `${PAUSE_HOURS} hours after it was paused`
      : hoursLeft <= 1
        ? "in about an hour"
        : `in about ${hoursLeft} hours`;
  return `Your account is paused for ${PAUSE_HOURS} hours because it sent too many requests too quickly. You can sign in again ${when}, or email ${SUPPORT_EMAIL} and we'll restore it sooner.`;
}

export const DEACTIVATED_MESSAGE = `This account has been deactivated. Contact ${SUPPORT_EMAIL} if you think this is a mistake.`;

/** Whole hours left on a pause, rounded up so "0 hours" is never shown. */
export function hoursLeft(endsAt: Date, now = new Date()): number {
  return Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 3_600_000));
}

export function deactivatedMessage(u: Deactivation, now = new Date()): string {
  const ends = pauseEndsAt(u);
  return ends ? pausedMessage(hoursLeft(ends, now)) : DEACTIVATED_MESSAGE;
}
