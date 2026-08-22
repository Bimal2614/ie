/**
 * The ONE canonical origin for the site — used for `metadataBase`, every
 * canonical tag, the sitemap and robots.txt. They must all agree, or Google's
 * canonical/redirect checks fail and pages land in "Discovered — currently not
 * indexed".
 *
 * Resolution order:
 *   1. APP_URL — explicit override, always wins (set this in prod for a custom
 *      domain). Must be the full public origin, e.g. https://ieltsvega.com.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's STABLE production domain (the
 *      custom domain if attached, else the *.vercel.app one). Auto-set on every
 *      deploy, so canonicals match the live URL even if APP_URL is forgotten.
 *   3. localhost — dev fallback.
 *
 * NOTE: do not set APP_URL=http://localhost:3000 in the Vercel environment — that
 * would poison every production canonical. Leave it unset there (so #2 is used)
 * or set it to the real public URL.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
