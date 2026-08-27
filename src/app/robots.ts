import type { MetadataRoute } from "next";
import { SITE_URL as BASE } from "@/lib/site";

/**
 * robots.txt — allow the crawl of everything that can carry its own meta robots
 * tag, block only what cannot, and point Google at the sitemap.
 *
 * Only what must never be fetched at all.
 *
 * THIS LIST USED TO BE MUCH LONGER, and that was the bug. Every gated route was
 * both `Disallow`-ed here and marked `robots: { index: false }` in its metadata,
 * described as "belt and braces". The two do not stack that way — they conflict:
 *
 *   Disallow stops Google FETCHING the page, so Google never reads the noindex
 *   meta tag inside it. A disallowed URL that Google finds by any other route —
 *   and /mock-tests and /practice/* are linked from the footer of every public
 *   page — can still be indexed as a bare URL with "No information is available
 *   for this page" under it. Disallow suppresses the description, not the entry.
 *
 * The correct pairing is the opposite of what was here: ALLOW the crawl so the
 * noindex is actually read, and Google drops the URL cleanly and permanently.
 * Crawl budget is not a reason to keep them — that only becomes a real
 * constraint in the millions of URLs, and this site has ~52 indexable pages.
 *
 * So what remains is only what genuinely cannot carry a meta tag or must never
 * be requested by a bot:
 *   /api/         — JSON and media; no HTML, so no meta robots is possible.
 *   /logout       — mutates session state on GET.
 *   /verify-email — one-shot token URL; a crawler fetch would burn the token.
 *
 * Everything else (/dashboard, /practice, /mock-tests, /login, /signup, …) is
 * crawlable and relies on its own `index: false`, which now actually gets read.
 */
const DISALLOW = ["/api/", "/logout", "/verify-email"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      /**
       * Ahrefs and Semrush crawl aggressively and buy us nothing — they exist so
       * competitors can audit the site. Blocking them cuts origin load without
       * touching anything that sends traffic.
       */
      { userAgent: ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot"], disallow: "/" },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
