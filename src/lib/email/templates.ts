/**
 * Transactional email templates. Inline styles only (email clients strip
 * <style>/classes). Brand green CTA on a light card. Each returns subject +
 * html + a plain-text fallback.
 */

import { SITE_URL } from "@/lib/site";

const BRAND = "#104094"; // = the app's --brand token, hsl(218 81% 32%)
const GREEN = "#16a34a";
/**
 * Absolute URL — email clients have no origin to resolve a relative path
 * against. The 128px asset, not the 512px one: it renders at 32px here and most
 * clients download the full file regardless of the width attribute.
 */
const LOGO = `${SITE_URL}/brand/logo-128.png`;

/**
 * These templates interpolate user-controlled text — the display name, which
 * accepts any 80 characters — straight into markup. Without escaping, a name
 * containing `&`, a quote or a tag breaks the email's HTML or smuggles markup
 * into it. Every dynamic value below goes through here.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The same thing under the short name every template below already uses. */
const esc = escapeHtml;

/** A label/value line in the detail table some templates render. */
type Row = { label: string; value: string };

/**
 * Rows as a two-column table, or nothing at all when there are none.
 *
 * `white-space:pre-wrap` on the value is what lets a multi-line note (the one
 * free-text field an applicant gets) arrive as they typed it: HTML would
 * otherwise collapse their paragraph breaks into one run-on line, and the
 * message is the part of a lead a human actually reads.
 */
function rowsTable(rows: Row[]): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      (r) => `<tr>
          <td style="padding:7px 12px 7px 0;font-size:13px;color:#718096;vertical-align:top;white-space:nowrap">${esc(r.label)}</td>
          <td style="padding:7px 0;font-size:13px;color:#1a202c;font-weight:600;vertical-align:top;white-space:pre-wrap">${esc(r.value)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4;margin:0 0 20px">${body}</table>`;
}

/**
 * The shared card. Heading, body, an optional detail table, an optional CTA.
 *
 * BOTH TAILS ARE OPTIONAL BECAUSE NOT EVERY MESSAGE IS AN ACTION. A partner
 * lead landing in an operator's inbox is a record to read, not a button to
 * press, and rendering an empty green button under it — or worse, the "if the
 * button doesn't work, paste this link" paragraph with nothing to paste — is
 * how a transactional template starts looking like spam.
 */
function layout(raw: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer: string;
  rows?: Row[];
}): string {
  const opts = {
    heading: esc(raw.heading),
    body: esc(raw.body),
    ctaLabel: esc(raw.ctaLabel ?? ""),
    ctaUrl: esc(raw.ctaUrl ?? ""),
    footer: esc(raw.footer),
  };
  const cta =
    raw.ctaUrl && raw.ctaLabel
      ? `<a href="${opts.ctaUrl}" style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">${opts.ctaLabel}</a>
        <p style="font-size:12px;line-height:1.6;color:#718096;margin:20px 0 0">If the button doesn't work, paste this link into your browser:<br><a href="${opts.ctaUrl}" style="color:${BRAND};word-break:break-all">${opts.ctaUrl}</a></p>`
      : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1a202c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 32px 8px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:10px"><img src="${LOGO}" width="32" height="32" alt="" style="display:block;border:0"></td>
          <td style="font-size:18px;font-weight:700;color:${BRAND}">IELTSVega</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:8px 32px 0">
        <h1 style="font-size:20px;margin:0 0 12px">${opts.heading}</h1>
        <p style="font-size:14px;line-height:1.6;color:#4a5568;margin:0 0 20px">${opts.body}</p>
        ${rowsTable(raw.rows ?? [])}${cta}
      </td></tr>
      <tr><td style="padding:24px 32px 28px">
        <hr style="border:none;border-top:1px solid #e7e5e4;margin:0 0 16px">
        <p style="font-size:12px;color:#a0aec0;margin:0">${opts.footer}</p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#a0aec0;margin:16px 0 0">© IELTSVega · Practise IELTS online</p>
  </td></tr></table>
</body></html>`;
}

/**
 * Sent on signup. We do not verify email addresses at the moment, so this is
 * the only thing a new account receives: no "confirm your address" step, no
 * dead link to click.
 */
export function welcomeTemplate(name: string, link: string) {
  return {
    subject: "Welcome to IELTSVega",
    html: layout({
      heading: `Welcome, ${name} 👋`,
      body: "Your account is ready. Start with a full mock test to get a baseline band, or practise a single section if you already know what you want to work on. Writing and Speaking answers come back with examiner-style feedback and a band for each criterion.",
      ctaLabel: "Go to my dashboard",
      ctaUrl: link,
      footer: "You received this because an account was created with this email address.",
    }),
    text: `Welcome to IELTSVega, ${name}!\n\nYour account is ready. Start with a full mock test to get a baseline band, or practise a single section.\n\n${link}\n\nYou received this because an account was created with this email address.`,
  };
}

/**
 * Security notice after a password changes, by reset or from settings. The CTA
 * points at recovery so someone who did NOT make the change can take the
 * account back straight away.
 */
export function passwordChangedTemplate(link: string, opts?: { signedOutEverywhere?: boolean }) {
  // Only the reset flow revokes every session, so only it may say so.
  const signedOut = opts?.signedOutEverywhere
    ? " You have also been signed out on every device."
    : "";
  return {
    subject: "Your IELTSVega password was changed",
    html: layout({
      heading: "Your password was changed",
      body: `The password on your IELTSVega account was just changed.${signedOut} If this was you, there is nothing to do. If it was not, reset your password immediately using the button below.`,
      ctaLabel: "This wasn't me, reset it",
      ctaUrl: link,
      footer: "This is an automatic security notice. We send it every time an account password changes.",
    }),
    text: `Your IELTSVega password was just changed.${signedOut}\n\nIf this was you, no action is needed.\n\nIf it was not you, reset your password immediately:\n${link}`,
  };
}

/**
 * Currently unused: signup sends `welcomeTemplate` instead, because addresses
 * are not verified yet. Kept, along with the `email_verify` token type and the
 * /verify-email route, so turning verification back on is a one-line change in
 * `signup`.
 */
export function verifyEmailTemplate(name: string, link: string) {
  return {
    subject: "Verify your IELTSVega email",
    html: layout({
      heading: `Welcome, ${name} 👋`,
      body: "Confirm your email address to secure your account and unlock everything on IELTSVega. This link expires in 24 hours.",
      ctaLabel: "Verify my email",
      ctaUrl: link,
      footer: "You received this because an account was created with this email. If it wasn't you, you can ignore this message.",
    }),
    text: `Welcome to IELTSVega, ${name}!\n\nVerify your email (link expires in 24 hours):\n${link}\n\nIf this wasn't you, ignore this email.`,
  };
}

export function resetPasswordTemplate(link: string) {
  return {
    subject: "Reset your IELTSVega password",
    html: layout({
      heading: "Reset your password",
      body: "We received a request to reset your password. Click below to choose a new one. This link expires in 1 hour. If you didn't request this, no action is needed.",
      ctaLabel: "Reset password",
      ctaUrl: link,
      footer: "For your security, this link can be used once and expires in 1 hour.",
    }),
    text: `Reset your IELTSVega password (link expires in 1 hour):\n${link}\n\nIf you didn't request this, ignore this email.`,
  };
}

/* ------------------------------------------------------------------ *
 * Partner applications
 *
 * Two messages from one submission on /partners, and they are written for two
 * different readers. The class gets a receipt with a reference and a promise
 * about when we will reply; we get the lead itself, in full, because these two
 * emails ARE the pipeline — nothing about an application is stored as a partner
 * until an admin actually onboards one.
 * ------------------------------------------------------------------ */

/** What both templates are handed. Already validated; `null` means not given. */
export type PartnerLead = {
  reference: string;
  name: string;
  location: string | null;
  website: string | null;
  contactName: string;
  email: string;
  phone: string;
  students: string | null;
  message: string | null;
};

/** "—" for anything the applicant left out, so the table never has a hole. */
function orDash(v: string | null): string {
  return v && v.trim() ? v : "—";
}

/**
 * The receipt, to the class.
 *
 * NO LOGIN LINK AND NO PASSWORD, because neither exists yet: the account is
 * created by hand once we have spoken. Promising a dashboard here would send
 * someone to a login form that rejects them, which is a worse first impression
 * than the honest "we'll be in touch". The reference is the one thing they can
 * quote back at us, so it is in the subject as well as the body.
 */
export function partnerApplicationReceivedTemplate(lead: PartnerLead) {
  const rows: Row[] = [
    { label: "Reference", value: lead.reference },
    { label: "Institute", value: lead.name },
    { label: "Location", value: orDash(lead.location) },
    { label: "Contact", value: `${lead.contactName} · ${lead.email}` },
  ];
  return {
    subject: `We've received your partner application (${lead.reference})`,
    html: layout({
      heading: `Thanks, ${lead.contactName} — your application is in.`,
      body: `We've received the partner application for ${lead.name}. Our team reviews every application by hand and will get back to you within one business day with your partner rate and the next steps. Quote the reference below if you need to reach us before then.`,
      rows,
      ctaLabel: "See what partners get",
      ctaUrl: `${SITE_URL}/partners`,
      footer:
        "You received this because a partner application was submitted with this email address. If that wasn't you, you can ignore this message.",
    }),
    text: `Thanks, ${lead.contactName} — your application is in.

We've received the partner application for ${lead.name}. Our team reviews every application by hand and will get back to you within one business day with your partner rate and the next steps.

Reference: ${lead.reference}
Institute: ${lead.name}
Location: ${orDash(lead.location)}
Contact:   ${lead.contactName} · ${lead.email}

${SITE_URL}/partners

You received this because a partner application was submitted with this email address.`,
  };
}

/**
 * The lead itself, to ADMIN_EMAILS.
 *
 * EVERY FIELD IS HERE, including the ones the onboarding form calls optional,
 * because this email is what someone retypes into /admin/partners. A lead that
 * needs a reply just to learn the website is a lead that takes two days instead
 * of one. Reply-To is set to the applicant at the send site, so hitting reply
 * answers the class rather than the robot.
 */
export function partnerLeadTemplate(lead: PartnerLead) {
  const rows: Row[] = [
    { label: "Reference", value: lead.reference },
    { label: "Institute", value: lead.name },
    { label: "Location", value: orDash(lead.location) },
    { label: "Website", value: orDash(lead.website) },
    { label: "Contact", value: lead.contactName },
    { label: "Email", value: lead.email },
    { label: "Phone", value: lead.phone },
    { label: "Batch size", value: orDash(lead.students) },
    { label: "Message", value: orDash(lead.message) },
  ];
  return {
    // The institute's name in the subject, so a week of these is scannable.
    subject: `Partner lead: ${lead.name}${lead.location ? ` (${lead.location})` : ""}`,
    html: layout({
      heading: "New partner application",
      body: `${lead.contactName} has applied to partner with us on behalf of ${lead.name}. Nothing has been created — onboard them from the admin panel once you've spoken.`,
      rows,
      ctaLabel: "Open partners in admin",
      ctaUrl: `${SITE_URL}/admin/partners`,
      footer: "Sent to ADMIN_EMAILS because a partner application was submitted on /partners.",
    }),
    text: `New partner application — ${lead.reference}

${lead.contactName} has applied to partner with us on behalf of ${lead.name}.
Nothing has been created; onboard them from the admin panel once you've spoken.

Institute:  ${lead.name}
Location:   ${orDash(lead.location)}
Website:    ${orDash(lead.website)}
Contact:    ${lead.contactName}
Email:      ${lead.email}
Phone:      ${lead.phone}
Batch size: ${orDash(lead.students)}
Message:    ${orDash(lead.message)}

${SITE_URL}/admin/partners`,
  };
}
