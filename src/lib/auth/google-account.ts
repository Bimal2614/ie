import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, auditLog } from "@/db/schema";
import { normalizePhone } from "@/lib/phone";
import { referringPartner } from "@/lib/partners";

/**
 * Find-or-create the account behind a verified Google identity.
 *
 * Shared by the two ways a Google sign-in reaches us, which differ ONLY in how
 * the identity was proven:
 *
 *  - the website redirects to Google, gets a `code`, and swaps it for a profile
 *    (`/api/auth/google/callback`);
 *  - the app uses the native Google SDK and sends us the `id_token` it was
 *    handed (`/api/v1/auth/google`).
 *
 * Both arrive here with the same proven facts, and from this point on there is
 * one set of linking rules. That matters because the rules are subtle — see the
 * planted-password case and the referral rule below — and a second copy would be
 * the one that forgets.
 *
 * The CALLER must have verified the identity. This function trusts its input.
 */

export type VerifiedGoogleIdentity = {
  /** Google's stable user id (`sub`). The real join key. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string | null;
  /** Almost always null: the phone scope is sensitive and normally unrequested. */
  phone?: string | null;
};

export type GoogleLinkOptions = {
  /**
   * The `ref` off a partner invite link, UNVALIDATED — re-read below before it
   * is allowed to mean anything. The website parks it in a cookie; the app would
   * carry it on a deep link.
   */
  referral?: unknown;
  /** Client IP, for `last_login_ip`. */
  ip?: string | null;
};

export type GoogleLinkResult =
  | {
      ok: true;
      userId: string;
      /**
       * Whether this call CREATED the account rather than finding one.
       *
       * The caller needs it because a signup and a returning sign-in are
       * different events to everything outside this function — the website fires
       * a conversion pixel on one and not the other.
       */
      created: boolean;
      /** The class it was attached to, when it was created through an invite. */
      partnerId: string | null;
    }
  | { ok: false; reason: "deactivated" };

export async function linkOrCreateGoogleAccount(
  identity: VerifiedGoogleIdentity,
  options: GoogleLinkOptions = {},
): Promise<GoogleLinkResult> {
  const phone = normalizePhone(identity.phone ?? null);
  const emailNorm = identity.email.trim().toLowerCase();

  // 1) Already linked by googleId?
  let user:
    | { id: string; deactivatedAt: Date | null; phone: string | null }
    | undefined;

  [user] = await db
    .select({ id: users.id, deactivatedAt: users.deactivatedAt, phone: users.phone })
    .from(users)
    .where(eq(users.googleId, identity.sub))
    .limit(1);

  // 2) Else an existing account with the same email → link it.
  if (!user) {
    const [byEmail] = await db
      .select({
        id: users.id,
        deactivatedAt: users.deactivatedAt,
        emailVerified: users.emailVerified,
        passwordHash: users.passwordHash,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.emailNormalized, emailNorm))
      .limit(1);

    if (byEmail) {
      // Signup takes the address at face value, so an unverified row with a
      // password may have been planted by someone who does not own the mailbox,
      // waiting for the real owner to arrive through Google. Google has now
      // proved ownership, so the account is rightly this user's — but the
      // planted password must not survive the link, and neither may any session
      // opened with it. The owner sets a fresh one via the reset flow.
      const dropPassword = !byEmail.emailVerified && byEmail.passwordHash !== null;
      await db
        .update(users)
        .set({
          googleId: identity.sub,
          emailVerified: true,
          updatedAt: new Date(),
          // Never overwrite a number the user gave us themselves.
          ...(phone && !byEmail.phone ? { phone } : {}),
          ...(dropPassword ? { passwordHash: null, passwordChangedAt: new Date() } : {}),
        })
        .where(eq(users.id, byEmail.id));

      if (dropPassword) {
        await db.delete(sessions).where(eq(sessions.userId, byEmail.id));
      }
      user = byEmail;
    }
  }

  let created = false;
  let partnerId: string | null = null;

  // 3) Else create a fresh OAuth account (no password).
  if (!user) {
    /*
     * Only a NEW account is attached to the class, and that is the whole rule.
     *
     * Branches 1 and 2 above found an account that already existed, and an
     * invite link is not a way to take one over: following one would hand a
     * class the practice history and results of anybody who happened to open
     * the link and sign in with an account they already had. A candidate the
     * class already teaches gets enrolled from the panel instead, which is a
     * deliberate act by someone with a login.
     *
     * The id is re-read against `partners` here — see `referringPartner`. Until
     * this line it is a string off a public URL that has been checked for
     * nothing but its shape.
     */
    const referrer = await referringPartner(options.referral);
    partnerId = referrer?.id ?? null;

    const [createdRow] = await db
      .insert(users)
      .values({
        email: identity.email,
        emailNormalized: emailNorm,
        emailVerified: identity.emailVerified,
        googleId: identity.sub,
        name: identity.name,
        phone,
        avatarUrl: identity.picture ?? null,
        partnerId,
      })
      .returning({ id: users.id, deactivatedAt: users.deactivatedAt, phone: users.phone });
    user = createdRow;
    created = true;

    if (referrer) {
      // Same event the email signup writes, for the same reason: this account
      // was created by the candidate, not by the class. See src/lib/auth/core.ts.
      try {
        await db.insert(auditLog).values({
          userId: createdRow.id,
          event: "partner.student.referred",
          metadata: { partnerId: referrer.id, via: "google" },
        });
      } catch {
        // The audit trail must never be what fails a sign-in.
      }
    }
  }

  if (user.deactivatedAt) return { ok: false, reason: "deactivated" };

  // Already-linked account that predates the phone column (or was created
  // before Google started returning one).
  if (phone && !user.phone) {
    await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  /*
   * Last seen, on the way through.
   *
   * This path never touched the column, so a Google account read as "never
   * signed in" for its whole life — harmless while nobody was looking, and
   * wrong the moment a partner's roster started counting it for students who
   * joined through an invite link. The password path has always done this in
   * its own success branch; see `authenticate` in src/lib/auth/core.ts.
   */
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), lastLoginIp: options.ip ?? null })
    .where(eq(users.id, user.id));

  return { ok: true, userId: user.id, created, partnerId };
}
