import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { normalizePhone } from "@/lib/phone";

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
 * planted-password case below — and a second copy would be the one that forgets.
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

export type GoogleLinkResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "deactivated" };

export async function linkOrCreateGoogleAccount(
  identity: VerifiedGoogleIdentity,
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

  // 3) Else create a fresh OAuth account (no password).
  if (!user) {
    const [created] = await db
      .insert(users)
      .values({
        email: identity.email,
        emailNormalized: emailNorm,
        emailVerified: identity.emailVerified,
        googleId: identity.sub,
        name: identity.name,
        phone,
        avatarUrl: identity.picture ?? null,
      })
      .returning({ id: users.id, deactivatedAt: users.deactivatedAt, phone: users.phone });
    user = created;
  }

  if (user.deactivatedAt) return { ok: false, reason: "deactivated" };

  // Already-linked account that predates the phone column (or was created
  // before Google started returning one).
  if (phone && !user.phone) {
    await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  return { ok: true, userId: user.id };
}
