import { NextResponse, type NextRequest } from "next/server";
import { SIGNED_OUT_PARAM } from "@/lib/auth-routes";

/**
 * Proxy (formerly "middleware") — runs before every matched route.
 *
 * Responsibilities:
 *  1. Emit a fresh, nonce-based Content-Security-Policy + the full set of
 *     hardening headers on every response.
 *  2. Perform *optimistic* auth routing based only on cookie presence
 *     (the authoritative check happens in the DAL against the DB).
 *
 * It never touches the database — proxy runs on the hot path for every
 * request, so DB work would be a latency/DoS risk.
 */

const isDev = process.env.NODE_ENV === "development";

// Must match SESSION_COOKIE in src/lib/session.ts.
const SESSION_COOKIE = isDev ? "ielts_session" : "__Host-ielts_session";

// Anything under these prefixes requires a session.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/practice",
  "/mock",
  "/profile",
  "/settings",
  "/admin",
  // Admin-only in practice — this list routes on cookie presence alone, so
  // requireAdmin() in the route's layout is what keeps candidates out.
  "/verify-students",
];
// Auth pages a logged-in user shouldn't see.
const AUTH_ROUTES = ["/login", "/signup"];

// S3-hosted media (listening audio, Task 1 images) and signed URLs live on
// *.amazonaws.com. Allowed for media/img/fetch so playback isn't CSP-blocked.
const S3 = "https://*.amazonaws.com";

/**
 * Razorpay Checkout's origins.
 *
 * The modal is an IFRAME served from api.razorpay.com, loaded by a script from
 * checkout.razorpay.com, which then talks to several razorpay.com subdomains
 * (api for the payment itself, lumberjack for its telemetry) and pulls bank and
 * wallet logos from its CDN. Every one of those is a separate CSP directive,
 * and the failure mode when one is missing is silent: the button opens an empty
 * white box with the refusal only in the console.
 *
 * The wildcard covers those subdomains without pinning a list that Razorpay is
 * free to change. It is not in `script-src`, where `strict-dynamic` makes host
 * expressions meaningless — the checkout script is trusted there by being
 * inserted from already-trusted code (see use-razorpay-checkout.ts), not by its
 * origin, which is the stronger rule and the reason the host is listed here for
 * documentation and for browsers too old to honour strict-dynamic.
 */
const RAZORPAY = "https://*.razorpay.com";

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    // 'strict-dynamic' lets the nonce'd Next bootstrap script load the rest;
    // 'unsafe-eval' is dev-only (React uses eval for better stack traces).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${RAZORPAY}${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles use 'unsafe-inline' WITHOUT a nonce. Per the CSP spec, a nonce (or
    // hash) in style-src makes the browser IGNORE 'unsafe-inline' — which would
    // block every React inline style={{…}} (colours, gradients, widths, fonts)
    // and Next's own injected styles. Inline style is low-risk (it can't run
    // JS); scripts stay strict with the nonce above, where the real risk is.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${S3} ${RAZORPAY}`,
    `media-src 'self' blob: ${S3}`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // Razorpay posts to its own domain for the bank / 3-D Secure hop.
    `form-action 'self' ${RAZORPAY}`,
    `frame-ancestors 'none'`, // clickjacking protection (with X-Frame-Options)
    // The Checkout modal itself. Without this it falls back to default-src
    // 'self' and the button opens a blank white box.
    `frame-src ${RAZORPAY}`,
    `connect-src 'self' ${S3} ${RAZORPAY}`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

function applySecurityHeaders(res: NextResponse, csp: string): void {
  res.headers.set("Content-Security-Policy", csp);
  // Force HTTPS for 2 years incl. subdomains (only meaningful over TLS).
  if (!isDev) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Permissions-Policy",
    // `payment=(self)` enables the Payment Request API that Razorpay Checkout
    // uses for saved cards and wallet autofill; it was disabled outright here
    // before there was anything on the site to pay for.
    "camera=(), geolocation=(), payment=(self), usb=(), microphone=(self)",
  );
  /*
   * `same-origin-allow-popups`, not `same-origin`.
   *
   * Razorpay Checkout sends some methods — netbanking especially — through a
   * popup that reports the result back via `window.opener`. Under plain
   * `same-origin` the browser severs that reference, and the popup completes
   * the payment with no way to tell the page it did: the customer is charged
   * and the modal sits there spinning. The relaxation only concerns popups THIS
   * page opens; a cross-origin document still cannot reach into this one, which
   * is the protection that matters here.
   */
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Make the nonce + CSP visible to the renderer so Next can stamp its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Not logged in → bounce to login, preserving intended destination.
  if (isProtected && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    applySecurityHeaders(res, csp);
    return res;
  }

  // Already logged in → keep them out of login/signup. Skipped when the request
  // is the hop straight out of /logout: if the cookie-clearing Set-Cookie ever
  // fails to apply, bouncing to /dashboard would restart the /dashboard →
  // /logout → /login loop and the router would give up on a blank page. With
  // the marker honoured, a failed clear costs one extra hop and still lands on
  // a usable login form.
  const justSignedOut = request.nextUrl.searchParams.has(SIGNED_OUT_PARAM);
  if (isAuthRoute && hasSession && !justSignedOut) {
    const res = NextResponse.redirect(new URL("/dashboard", request.url));
    applySecurityHeaders(res, csp);
    return res;
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(res, csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
