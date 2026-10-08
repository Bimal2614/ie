"use server";

import { cookies } from "next/headers";
import { after } from "next/server";

import { requireUser } from "@/lib/dal";
import {
  clearedInviteCookie,
  INVITE_COOKIE,
  issuePartnerInvite,
  redeemInvite,
} from "@/lib/partner-invites";
import { assertActive, partnerContext, PartnerSuspendedError } from "@/lib/partners";
import { rateLimit } from "@/lib/security/rate-limit";
import { inviteStudentSchema } from "@/lib/validation";

/**
 * Invite by email, and accepting one. See src/lib/partner-invites.ts for the
 * rules; this file is the public edge of them.
 */

export type InviteResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/**
 * Send a "join my class" email.
 *
 * THE ANSWER IS THE SAME FOR EVERY ADDRESS. Only things the partner already
 * knows about itself — suspended, sending too fast, a malformed address — are
 * ever reported. Whether the address has an account, and what it gets sent, is
 * worked out in `after()`, once the response is on its way, so the reply
 * cannot be timed either.
 */
export async function inviteStudentAction(input: unknown): Promise<InviteResult> {
  const { user, partner } = await partnerContext();
  try {
    assertActive(partner);
  } catch (error) {
    if (error instanceof PartnerSuspendedError) {
      return { ok: false, error: "This account is suspended. Please get in touch and we'll sort it out." };
    }
    throw error;
  }

  const parsed = inviteStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // A class inviting its intake is dozens an hour; hundreds is a mailing list.
  const hourly = await rateLimit(`partner:invite:${partner.id}`, 50, 60 * 60);
  const daily = await rateLimit(`partner:invite:day:${partner.id}`, 300, 24 * 60 * 60);
  if (!hourly.allowed || !daily.allowed) {
    return { ok: false, error: "That's a lot of invitations at once. Please try again later." };
  }

  const job = {
    partnerId: partner.id,
    partnerName: partner.name,
    invitedByUserId: user.id,
    email: parsed.data.email,
  };
  after(() => issuePartnerInvite(job));

  return { ok: true };
}

export type AcceptResult = { ok: true } | { ok: false; error: string };

/**
 * Join the class behind an invite, as the signed-in account.
 *
 * Takes no arguments: the token comes from the httpOnly cookie the emailed link
 * set, so page script never holds it. The session decides WHO; the token
 * decides WHICH class and must have been sent to this account's address. `redeemInvite` re-checks all of it in one
 * conditional write — what the invite page showed is UX, not the gate.
 */
export async function acceptPartnerInviteAction(): Promise<AcceptResult> {
  const user = await requireUser();
  const jar = await cookies();
  const token = jar.get(INVITE_COOKIE)?.value;

  const limit = await rateLimit(`partner-invite:accept:${user.id}`, 10, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const result = await redeemInvite(token, { id: user.id, email: user.email });
  if (!result.ok) {
    return {
      ok: false,
      error: "This invitation can't be used any more. Ask your institute to send a new one.",
    };
  }
  jar.set(INVITE_COOKIE, "", clearedInviteCookie);
  return { ok: true };
}
