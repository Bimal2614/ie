"use server";

import { randomBytes } from "node:crypto";

import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { SUPPORT_EMAIL } from "@/lib/brand-links";
import { sendEmail } from "@/lib/email/mailer";
import {
  partnerApplicationReceivedTemplate,
  partnerLeadTemplate,
  type PartnerLead,
} from "@/lib/email/templates";
import { adminEmails } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/session";
import { partnerApplicationSchema } from "@/lib/validation";

/**
 * A class asking to become a partner.
 *
 * WHAT THIS DOES NOT DO IS THE WHOLE DESIGN: it creates no partner, no login and
 * no user. Onboarding stays a deliberate act an admin performs in
 * /admin/partners, because a partner row carries a wholesale rate and the
 * ability to buy plans for other people — that is a commercial relationship,
 * not a form submission. What this does instead is turn the submission into two
 * emails: a receipt for the applicant and the lead for us.
 *
 * WHICH MAKES THE AUDIT ROW LOAD-BEARING, not decorative. With nothing stored
 * as a partner, a lead exists only in whatever mail did get out — and mail is
 * the part of this that can fail. So the row is written FIRST, before either
 * send, and the action only reports failure if the row itself could not be
 * written. A lead that reached the database and no inbox is recoverable; one
 * that reached neither is gone.
 *
 * The applicant is never told which of those happened. From /partners this
 * looks like an application that went through, because it did.
 */

export type PartnerApplyResult =
  | { ok: true; reference: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/** Applications accepted from one network per hour, before we start refusing. */
const PER_IP_PER_HOUR = 5;
/** And from one address per day, so a retry loop cannot mail us fifty times. */
const PER_EMAIL_PER_DAY = 5;

const TOO_MANY =
  "We've already received an application from you. Give us a day to reply before sending another.";

/**
 * A reference both emails carry, e.g. `PV-7K4Q2M`.
 *
 * Crockford's alphabet minus the letters that read as digits, so it survives
 * being spelled down a phone — which is the only thing it is for. It identifies
 * nothing on its own: there is no lookup, because there is no application table.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function reference(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `PV-${out}`;
}

export async function submitPartnerApplication(input: unknown): Promise<PartnerApplyResult> {
  const parsed = partnerApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const ref = reference();

  /**
   * The honeypot, answered with a success the bot cannot distinguish from a
   * real one. Telling a script it was caught only teaches whoever wrote it
   * which field to leave alone next time, and a person can never reach this
   * branch — the input is hidden and `autocomplete` is off.
   */
  if (data.company && data.company.trim() !== "") {
    return { ok: true, reference: ref };
  }

  const { ip, userAgent } = await getRequestContext();

  const [byIp, byEmail] = await Promise.all([
    rateLimit(`partner-apply:ip:${ip ?? "unknown"}`, PER_IP_PER_HOUR, 60 * 60),
    rateLimit(`partner-apply:email:${data.email}`, PER_EMAIL_PER_DAY, 24 * 60 * 60),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return { ok: false, error: TOO_MANY };

  const lead: PartnerLead = {
    reference: ref,
    name: data.name,
    location: data.location,
    website: data.website,
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    students: data.students,
    message: data.message,
  };

  // The record. Written before anything is sent — see the header. `userId` is
  // null because an applicant has no account; `signup` logs the same way.
  try {
    await db.insert(auditLog).values({
      userId: null,
      event: "partner.application_received",
      ipAddress: ip,
      userAgent,
      metadata: lead,
    });
  } catch (err) {
    console.error("[partner-apply] could not record the lead", err);
    return { ok: false, error: "We couldn't submit that just now. Please try again in a moment." };
  }

  /**
   * Who gets the lead. ADMIN_EMAILS is the operational list, and support is the
   * fallback rather than a hard failure: an unconfigured environment must not
   * be the reason an enquiry goes unanswered, and `hello@` is a real inbox.
   */
  const recipients = adminEmails();
  const to = recipients.length > 0 ? recipients.join(", ") : SUPPORT_EMAIL;

  // Neither send may fail the submission — the lead is already recorded, and a
  // mail outage is ours to notice, not theirs. Sent in parallel; both settle.
  const notice = partnerLeadTemplate(lead);
  const receipt = partnerApplicationReceivedTemplate(lead);
  const [leadSent, receiptSent] = await Promise.allSettled([
    sendEmail({ to, replyTo: data.email, ...notice }),
    sendEmail({ to: data.email, ...receipt }),
  ]);

  if (leadSent.status === "rejected" || (leadSent.value && !leadSent.value.ok)) {
    console.error(`[partner-apply] lead email failed for ${ref} — it is in audit_log`);
  }
  if (receiptSent.status === "rejected" || (receiptSent.value && !receiptSent.value.ok)) {
    console.error(`[partner-apply] receipt to ${data.email} failed for ${ref}`);
  }

  return { ok: true, reference: ref };
}
