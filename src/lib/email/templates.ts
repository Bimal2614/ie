/**
 * Transactional email templates. Inline styles only (email clients strip
 * <style>/classes). Brand green CTA on a light card. Each returns subject +
 * html + a plain-text fallback.
 */

const BRAND = "#0e7490"; // kept simple/self-contained; not tied to the app theme tokens
const GREEN = "#16a34a";

function layout(opts: { heading: string; body: string; ctaLabel: string; ctaUrl: string; footer: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1a202c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
      <tr><td style="padding:28px 32px 8px">
        <div style="font-size:18px;font-weight:700;color:${BRAND}">IELTSVega</div>
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
