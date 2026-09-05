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

function layout(raw: { heading: string; body: string; ctaLabel: string; ctaUrl: string; footer: string }): string {
  const opts = {
    heading: esc(raw.heading),
    body: esc(raw.body),
    ctaLabel: esc(raw.ctaLabel),
    ctaUrl: esc(raw.ctaUrl),
    footer: esc(raw.footer),
  };
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
        <a href="${opts.ctaUrl}" style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">${opts.ctaLabel}</a>
        <p style="font-size:12px;line-height:1.6;color:#718096;margin:20px 0 0">If the button doesn't work, paste this link into your browser:<br><a href="${opts.ctaUrl}" style="color:${BRAND};word-break:break-all">${opts.ctaUrl}</a></p>
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
