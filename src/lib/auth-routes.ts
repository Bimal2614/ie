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
