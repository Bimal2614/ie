/**
 * The ONE canonical origin for the site — used for `metadataBase`, every
 * canonical tag, the sitemap and robots.txt. They must all agree, or Google's
 * canonical/redirect checks fail and pages land in "Discovered — currently not
 * indexed".
 *
 * Resolution order:
 *   1. APP_URL — explicit override, always wins (set this in prod for a custom
 *      domain). Must be the full public origin, e.g. https://www.ieltsvega.com.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's STABLE production domain (the
 *      custom domain if attached, else the *.vercel.app one). Auto-set on every
 *      deploy, so canonicals match the live URL even if APP_URL is forgotten.
 *   3. localhost — dev fallback.
 *
 * NOTE: do not set APP_URL=http://localhost:3000 in the Vercel environment — that
 * would poison every production canonical. Leave it unset there (so #2 is used)
 * or set it to the real public URL.
 */

/**
 * The host we actually serve on. Vercel has `www.ieltsvega.com` as the primary
 * domain and 308-redirects the apex to it, so `www` is the only host that
 * answers 200.
 *
 * This constant exists because getting it wrong is silent and expensive. APP_URL
 * was set to the apex, so every canonical, og:url, sitemap <loc>, JSON-LD @id
 * and rel=author pointed at a URL that immediately redirects — Google treats a
 * canonical-to-redirect as a conflicting signal and defers indexing. Nothing in
 * the app crashes when that happens; it just quietly stops ranking.
 *
 * `normaliseHost` below therefore upgrades the apex to `www` no matter what the
 * environment says, so a stale APP_URL in the Vercel dashboard cannot reintroduce
 * the bug. If the primary domain is ever flipped to the apex, change both this
 * constant and the redirect in Vercel — in that order.
 */
const CANONICAL_HOST = "www.ieltsvega.com";
const APEX_HOST = "ieltsvega.com";

/**
 * Force the production apex onto the canonical www host. Localhost, *.vercel.app
 * preview deploys and any other origin pass through untouched — previews must
 * keep their own origin or their internal links break.
 */
function normaliseHost(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname === APEX_HOST) {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      return url.origin;
    }
    return url.origin;
  } catch {
    // Malformed APP_URL — fall back rather than ship a broken metadataBase,
    // which throws at build time inside next/metadata.
    return `https://${CANONICAL_HOST}`;
  }
}

function resolveSiteUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return normaliseHost(explicit.replace(/\/+$/, ""));

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return normaliseHost(`https://${vercel.replace(/\/+$/, "")}`);

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/**
 * Absolute URL for a site-root-relative path, with the canonical origin and no
 * trailing slash on the root. Every builder that used to inline
 * `${SITE_URL}${path === "/" ? "" : path}` now calls this, so the "is the root
 * an empty string or a slash?" decision is made in exactly one place — the
 * mismatch that puts a canonical and a sitemap <loc> out of agreement.
 */
export function absoluteUrl(path: string): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
