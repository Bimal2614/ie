/**
 * Auth-routing constants shared by the proxy (edge runtime) and app code.
 *
 * Kept in its own module because `src/lib/session.ts` is `server-only` and so
 * cannot be imported from `src/proxy.ts` — and this value MUST NOT drift between
 * the two, since it is what stops the sign-out redirect loop.
 */

/**
 * Marker `/logout` puts on its redirect to `/login`.
 *
 * The proxy routes on cookie *presence* alone, so it normally bounces a
 * cookie-carrying visitor away from /login to /dashboard. If the browser ever
 * refuses the cookie-clearing Set-Cookie, that bounce turns into an endless
 * /dashboard → /logout → /login → /dashboard chain and the page renders blank.
 * When this param is present the proxy lets /login render regardless, so a
 * failed clear costs one extra hop instead of the whole session.
 */
export const SIGNED_OUT_PARAM = "signedout";

/**
 * Where to send someone after they sign in, from an untrusted `?next=`.
 *
 * AN UNVALIDATED `next` IS AN OPEN REDIRECT. `/login?next=https://evil.example`
 * would hand an attacker a link that carries our domain, our branding and our
 * login form, then drops the victim on their page — the classic phishing setup.
 * So only a same-site PATH is ever honoured, and anything else silently becomes
 * the default rather than erroring: a bad `next` is not worth a broken sign-in.
 *
 * Rejected, in order: anything not starting with `/` (absolute URLs, `javascript:`),
 * `//evil.example` (protocol-relative — a URL wearing a path's clothes), and the
 * auth routes themselves, which would bounce a freshly signed-in user straight
 * back to the form they just completed.
 */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters can smuggle a second header or line into a redirect.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  const path = value.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (["/login", "/signup", "/logout"].includes(path)) return fallback;
  return value;
}
