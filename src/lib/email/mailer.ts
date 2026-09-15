import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isEmailConfigured, isProd } from "@/lib/env";

/**
 * SMTP mailer (provider-agnostic — SES, Mailgun, Postmark, Gmail, Resend-SMTP…).
 * Cached transport. If SMTP isn't configured, sends are skipped (and the link
 * is logged in dev) so verification/reset flows still work end-to-end locally.
 */
let cached: Transporter | null = null;

function transport(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // implicit TLS on 465; STARTTLS otherwise
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  });
  return cached;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Who a reply should go to, when that is not us.
   *
   * Only one caller needs it so far: the partner lead sent to ADMIN_EMAILS,
   * where the useful reply is to the class that applied, not to the no-reply
   * From: address. Left unset everywhere else, which keeps the default.
   */
  replyTo?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn(`[email] SMTP not configured: skipped "${opts.subject}" to ${opts.to}`);
    // Outside production, print the plain-text body. It carries the reset link,
    // so password recovery is testable end to end with no SMTP account. Never in
    // production, where this would put single-use tokens into the server logs.
    if (!isProd) console.warn(`[email] would have sent:\n${opts.text}`);
    return { ok: true, skipped: true };
  }
  try {
    await transport().sendMail({
      from: env.EMAIL_FROM!,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
