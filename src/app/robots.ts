import type { MetadataRoute } from "next";
import { SITE_URL as BASE } from "@/lib/site";

/**
 * robots.txt — allow crawling of all public marketing/SEO pages; keep the
 * authenticated app and auth screens out of the index (thin/gated for crawlers)
 * and point Google at the sitemap.
 */
/**
 * Every gated or thin route, in one list. These are also marked
 * `robots: { index: false }` in their page metadata — robots.txt stops the crawl,
 * the meta tag stops indexing if a URL is reached some other way (a shared link,
 * an inbound link). Belt and braces, because the two mechanisms fail differently.
 */
const DISALLOW = [
  "/dashboard",
  "/settings",
  "/history",
  "/results",
  "/practice",
  "/mock-test",
  "/mock-tests",
  "/section-practice",
  "/login",
  "/signup",
  "/logout",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/",
];

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
