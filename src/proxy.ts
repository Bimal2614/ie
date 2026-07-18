import { NextResponse, type NextRequest } from "next/server";

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
const PROTECTED_PREFIXES = ["/dashboard", "/practice", "/mock", "/profile", "/settings", "/admin"];
// Auth pages a logged-in user shouldn't see.
const AUTH_ROUTES = ["/login", "/signup"];

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    // 'strict-dynamic' lets the nonce'd Next bootstrap script load the rest;
    // 'unsafe-eval' is dev-only (React uses eval for better stack traces).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles use 'unsafe-inline' WITHOUT a nonce. Per the CSP spec, a nonce (or
    // hash) in style-src makes the browser IGNORE 'unsafe-inline' — which would
    // block every React inline style={{…}} (colours, gradients, widths, fonts)
    // and Next's own injected styles. Inline style is low-risk (it can't run
    // JS); scripts stay strict with the nonce above, where the real risk is.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`, // clickjacking protection (with X-Frame-Options)
    `connect-src 'self'`,
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
    "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
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

  // Already logged in → keep them out of login/signup.
  if (isAuthRoute && hasSession) {
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
