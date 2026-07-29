import type { MetadataRoute } from "next";
import { STUDY } from "@/lib/study-content";
import { POSTS } from "@/lib/blog";
import { BAND_SLUGS } from "@/lib/band-content";
import { SITE_URL as BASE } from "@/lib/site";

/**
 * XML sitemap of every public, indexable URL — the map Google uses to discover
 * and prioritise pages. Authenticated app routes are intentionally excluded
 * (see robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPaths = [
    "", // home
    "/pricing",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
    "/refunds",
    "/blog",
    "/templates",
    "/resources",
    "/resources/writing",
    "/resources/writing/task-1",
    "/resources/writing/task-2",
    "/ielts-band-scores",
  ];

  const sectionPaths = STUDY.filter((s) => s.key !== "writing").map((s) => `/resources/${s.key}`);
  const bandPaths = BAND_SLUGS.map((b) => `/ielts-band/${b}`);

  // Non-blog pages: one lastModified (now), priority by importance.
  const staticEntries: MetadataRoute.Sitemap = Array.from(
    new Set([...staticPaths, ...sectionPaths, ...bandPaths]),
  ).map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/resources") || path.startsWith("/ielts-band") ? 0.8 : 0.6,
  }));

  // Blog posts: use each post's real publish date so Google sees accurate
  // freshness, and mark them weekly so new/updated articles get recrawled sooner.
  const blogEntries: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
