import "server-only";

import type { AuthenticatedUser, IssuedSession } from "@/lib/session";
import { PLANS, type PlanKey } from "@/lib/plans";

/**
 * The wire shapes.
 *
 * Everything the API returns is built by a function in here rather than by
 * spreading a database row into a response. Two reasons, both learned the
 * expensive way by every project that skips this step:
 *
 *  1. A spread row leaks whatever column is added next. `users` carries
 *     `passwordHash`, `failedLoginAttempts`, `lastLoginIp` and
 *     `razorpayCustomerId`; none of those should ever reach a phone.
 *  2. `Date` serialises to ISO-8601 through `JSON.stringify` but the TYPE says
 *     `Date`, so nothing warns you when a field changes shape. Converting here,
 *     explicitly, is what lets the Dart side declare `DateTime` and be right.
 */

/** ISO-8601, or null. The only date format that crosses this boundary. */
function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/* ------------------------------------------------------------------ *
 * The signed-in account
 * ------------------------------------------------------------------ */

export type UserDto = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "partner";
  partnerId: string | null;
  emailVerified: boolean;
  phone: string | null;
  targetModule: "academic" | "general";
  targetBand: string | null;
  /** ISO date. Drives the exam countdown on the home screen. */
  examDate: string | null;
  /** Entitlement RIGHT NOW, already resolved against expiry. Gate on this. */
  plan: PlanKey;
  planExpiresAt: string | null;
  /** What the row says before expiry is applied — for support screens only. */
  storedPlan: PlanKey;
};

export function toUserDto(user: AuthenticatedUser): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    partnerId: user.partnerId,
    emailVerified: user.emailVerified,
    phone: user.phone,
    targetModule: user.targetModule,
    targetBand: user.targetBand,
    examDate: iso(user.examDate),
    plan: user.plan,
    planExpiresAt: iso(user.planExpiresAt),
    storedPlan: user.storedPlan,
  };
}

/* ------------------------------------------------------------------ *
 * What the plan actually allows
 * ------------------------------------------------------------------ */

export type EntitlementsDto = {
  plan: PlanKey;
  /** Display name, exactly as the pricing page says it. */
  label: string;
  /** Which skills may be practised at all on this tier. */
  practiceSections: string[];
  /** Practice answers per calendar month. `null` means unlimited. */
  monthlyPracticeAnswers: number | null;
  /** Full mock sittings that may be STARTED per calendar month. `null` = unlimited. */
  monthlyMockSittings: number | null;
  /** AI band scoring for Writing and Speaking — the expensive part. */
  aiScoring: boolean;
  /** Jumps the scoring queue. */
  priorityScoring: boolean;
  /** Band-prediction reports and the personalised weekly study plan. */
  advancedReports: boolean;
};

/**
 * The tier's rules, sent alongside the user so the app can lock a tab WITHOUT
 * hard-coding the plan matrix in Dart.
 *
 * This matters more on mobile than on web: a web build ships the moment the
 * entitlements change, but an app build sits in review for days and on old
 * phones for months. Anything the client hard-codes about what a plan allows is
 * wrong the first time it changes — so the server says what is allowed and the
 * app draws what it is told.
 */
export function toEntitlementsDto(plan: PlanKey): EntitlementsDto {
  const e = PLANS[plan];
  return {
    plan,
    label: e.label,
    practiceSections: [...e.practiceSections],
    monthlyPracticeAnswers: e.monthlyPracticeAnswers,
    monthlyMockSittings: e.monthlyMockSittings,
    aiScoring: e.aiScoring,
    priorityScoring: e.priorityScoring,
    advancedReports: e.advancedReports,
  };
}

/* ------------------------------------------------------------------ *
 * A session handed to the app
 * ------------------------------------------------------------------ */

export type SessionDto = {
  /**
   * The bearer token. Sent ONCE, in this response, and never readable again —
   * only its hash is stored. The app puts it in the platform keychain
   * (`flutter_secure_storage`), not in shared preferences.
   */
  token: string;
  /** Idle expiry. Sliding: any authenticated call pushes it forward. */
  expiresAt: string;
  /** Hard cap. The app must sign in again past this, however active it has been. */
  absoluteExpiresAt: string;
};

export type AuthResponseDto = {
  session: SessionDto;
  user: UserDto;
  entitlements: EntitlementsDto;
};

/**
 * The one response every sign-in path returns — password, Google, sign-up.
 *
 * Bundling the profile and the entitlements with the token means the app draws
 * its first screen from the login response instead of firing two more requests
 * at it while showing a spinner.
 */
export function toAuthResponse(issued: IssuedSession, user: AuthenticatedUser): AuthResponseDto {
  return {
    session: {
      token: issued.token,
      expiresAt: issued.expiresAt.toISOString(),
      absoluteExpiresAt: issued.absoluteExpiresAt.toISOString(),
    },
    user: toUserDto(user),
    entitlements: toEntitlementsDto(user.plan),
  };
}
