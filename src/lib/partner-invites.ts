import "server-only";

import { and, eq, exists, gt, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { auditLog, partnerInvites, partners, users } from "@/db/schema";
import { sendEmail } from "@/lib/email/mailer";
import { partnerInviteExistingTemplate, partnerInviteSignupTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { alert } from "@/lib/monitoring/alert";
import { rateLimit } from "@/lib/security/rate-limit";
import { generateToken, hashToken } from "@/lib/security/tokens";

/**
 * "Join my class" by email — the partner types an address, we do the rest.
 *
 * THE PARTNER LEARNS NOTHING. The panel says "Invitation sent" whatever the
 * address turns out to be: an existing account, a new one, someone already in
 * another class, or a typo. Everything that depends on who owns the address
 * happens here, after the response has gone (see `inviteStudentAction`), so
 * neither the answer nor its timing tells a class who has an account with us.
 *
 * NOBODY IS ADDED WITHOUT THEIR OWN CLICK. Sending an invite changes no
 * account. A student joins a class only when, holding the emailed link, they
 * are signed in as (or sign up as) the very address it was sent to — and an
 * existing account additionally has to press "Join" on a page that says what
 * the class will be able to see. That is what stops a partner pulling a
 * stranger's practice history into its roster by typing their email.
 *
 * ONE LINK FOR BOTH CASES: `/invite/<token>`. Whether it leads to "sign in and
 * confirm" or to "create your account" is decided when it is opened, so an
 * invitee who signed up on their own in between still ends up in the class.
 */

/** How long an emailed link works. Long enough to survive a weekend. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Per address, across all classes: an inbox must not become a target. */
const PER_RECIPIENT_PER_DAY = 3;

/** `generateToken()` output: 32 bytes as base64url. A shape check, not the gate. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/**
 * Where the token waits between the emailed link and the account it ends up on.
 *
 * THE TOKEN LEAVES THE URL AT ONCE. `/invite/<token>` only parks it here and
 * redirects to a bare `/invite`, before any page — and so any analytics or
 * session recorder — has loaded with it in the address bar. Signup, Google
 * sign-in and the Join button all read it from here.
 *
 * Harmless to leave behind on a shared computer: redeeming it still requires
 * the account to be on the address the invite was sent to.
 */
export const INVITE_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-ielts_invite" : "ielts_invite";

export const inviteCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // survives the round trip back from Google
  path: "/",
  maxAge: 24 * 60 * 60,
};

/**
 * For clearing it. NOT `cookies().delete()`, which drops `Secure` — and a
 * `__Host-` cookie cannot be overwritten without it (see src/lib/session.ts).
 */
export const clearedInviteCookie = { ...inviteCookieOptions, maxAge: 0 };

export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

export function inviteUrl(raw: string): string {
  return `${(env.APP_URL ?? "https://ieltsvega.com").replace(/\/+$/, "")}/invite/${raw}`;
}

async function audit(
  userId: string | null,
  event: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({ userId, event, metadata });
  } catch {
    // The audit trail must never be what fails an invite.
  }
}

/**
 * Mint and email an invite. Called from `after()`, so it never throws and
 * never reports back: every outcome looks the same to the partner.
 *
 * NO EMAIL GOES to an address whose account cannot join — a partner or admin
 * login, a deactivated account, or a student already in a class (this one or
 * another). Moving a student between classes would hand the second class the
 * first one's paid-for student; that stays a support conversation.
 */
export async function issuePartnerInvite(input: {
  partnerId: string;
  partnerName: string;
  invitedByUserId: string;
  email: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  try {
    const recipient = await rateLimit(`partner-invite:to:${email}`, PER_RECIPIENT_PER_DAY, 24 * 60 * 60);
    if (!recipient.allowed) return;

    const [account] = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        partnerId: users.partnerId,
        deactivatedAt: users.deactivatedAt,
      })
      .from(users)
      .where(eq(users.emailNormalized, email))
      .limit(1);

    if (account && (account.role !== "user" || account.deactivatedAt || account.partnerId)) {
      await audit(account.id, "partner.invite.skipped", {
        partnerId: input.partnerId,
        by: input.invitedByUserId,
        reason:
          account.role !== "user"
            ? "role"
            : account.deactivatedAt
              ? "deactivated"
              : account.partnerId === input.partnerId
                ? "already_member"
                : "other_partner",
      });
      return;
    }

    const raw = generateToken();
    await db.transaction(async (tx) => {
      // One live link per class and address: a re-send retires the last one.
      await tx
        .delete(partnerInvites)
        .where(
          and(
            eq(partnerInvites.partnerId, input.partnerId),
            eq(partnerInvites.emailNormalized, email),
            isNull(partnerInvites.acceptedAt),
          ),
        );
      await tx.insert(partnerInvites).values({
        partnerId: input.partnerId,
        invitedByUserId: input.invitedByUserId,
        emailNormalized: email,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      });
    });

    const link = inviteUrl(raw);
    const t = account
      ? partnerInviteExistingTemplate(account.name, input.partnerName, link)
      : partnerInviteSignupTemplate(input.partnerName, link);
    await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });

    await audit(account?.id ?? null, "partner.invite.sent", {
      partnerId: input.partnerId,
      by: input.invitedByUserId,
      existingAccount: Boolean(account),
    });
  } catch (error) {
    await alert({
      source: "partner-invite",
      title: "Partner invite could not be issued",
      severity: "warning",
      error,
      context: { partnerId: input.partnerId },
    });
  }
}

export type OpenInvite = {
  partnerId: string;
  partnerName: string;
  email: string;
};

/**
 * The invite behind a link, if it can still be used. Read-only — opening the
 * link (or a mail scanner prefetching it) must never redeem it.
 */
export async function openInvite(raw: unknown): Promise<OpenInvite | null> {
  if (!isInviteToken(raw)) return null;
  const [row] = await db
    .select({
      partnerId: partnerInvites.partnerId,
      partnerName: partners.name,
      email: partnerInvites.emailNormalized,
    })
    .from(partnerInvites)
    .innerJoin(partners, eq(partners.id, partnerInvites.partnerId))
    .where(
      and(
        eq(partnerInvites.tokenHash, hashToken(raw)),
        isNull(partnerInvites.acceptedAt),
        gt(partnerInvites.expiresAt, new Date()),
        eq(partners.status, "active"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Thrown inside the transaction to roll the claim back. */
class NotJoinable extends Error {}

/**
 * Redeem an invite for an account: claim the token and set `partner_id`, both
 * or neither.
 *
 * EVERY CONDITION IS IN THE WHERE CLAUSE, so two tabs or a double-click cannot
 * both win: the token must be unused, unexpired, issued to THIS account's
 * address, from a class that is still active — and the account must be a
 * candidate, active, and in no class yet.
 *
 * Marks the address verified: whoever redeems it holds a link that was only
 * ever sent to that inbox, and is signed in as the account on that address.
 */
export async function redeemInvite(
  raw: unknown,
  account: { id: string; email: string },
): Promise<{ ok: true; partnerId: string } | { ok: false }> {
  if (!isInviteToken(raw)) return { ok: false };
  const email = account.email.trim().toLowerCase();
  try {
    const partnerId = await db.transaction(async (tx) => {
      const now = new Date();
      const [claimed] = await tx
        .update(partnerInvites)
        .set({ acceptedAt: now, acceptedByUserId: account.id })
        .where(
          and(
            eq(partnerInvites.tokenHash, hashToken(raw)),
            isNull(partnerInvites.acceptedAt),
            gt(partnerInvites.expiresAt, now),
            eq(partnerInvites.emailNormalized, email),
            exists(
              tx
                .select({ one: sql`1` })
                .from(partners)
                .where(and(eq(partners.id, partnerInvites.partnerId), eq(partners.status, "active"))),
            ),
          ),
        )
        .returning({ partnerId: partnerInvites.partnerId });
      if (!claimed) throw new NotJoinable();

      const [joined] = await tx
        .update(users)
        .set({ partnerId: claimed.partnerId, emailVerified: true, updatedAt: now })
        .where(
          and(
            eq(users.id, account.id),
            eq(users.emailNormalized, email),
            eq(users.role, "user"),
            isNull(users.partnerId),
            isNull(users.deactivatedAt),
          ),
        )
        .returning({ id: users.id });
      if (!joined) throw new NotJoinable();

      return claimed.partnerId;
    });

    await audit(account.id, "partner.student.invited", { partnerId });
    return { ok: true, partnerId };
  } catch (error) {
    if (error instanceof NotJoinable) return { ok: false };
    throw error;
  }
}

/**
 * Whether the invited address has an account, for the page that decides
 * between "sign in and confirm" and "create your account". Only ever called
 * for someone holding the emailed link, i.e. that inbox.
 */
export async function inviteeHasAccount(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, email))
    .limit(1);
  return Boolean(row);
}
