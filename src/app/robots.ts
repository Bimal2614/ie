import type { MetadataRoute } from "next";

const BASE = process.env.APP_URL ?? "https://ieltsace.com";

/**
 * robots.txt — allow crawling of all public marketing/SEO pages; keep the
 * authenticated app and auth screens out of the index (thin/gated for crawlers)
 * and point Google at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/settings",
        "/history",
        "/results",
        "/practice",
        "/mock-test",
        "/mock-tests",
        "/login",
        "/signup",
        "/logout",
        "/api/",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
