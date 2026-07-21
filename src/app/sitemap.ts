import type { MetadataRoute } from "next";
import { STUDY } from "@/lib/study-content";
import { POSTS } from "@/lib/blog";
import { BAND_SLUGS } from "@/lib/band-content";

const BASE = process.env.APP_URL ?? "https://ieltsace.com";

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
    "/resources",
    "/resources/writing",
    "/resources/writing/task-1",
    "/resources/writing/task-2",
    "/ielts-band-scores",
  ];

  const sectionPaths = STUDY.filter((s) => s.key !== "writing").map((s) => `/resources/${s.key}`);
  const bandPaths = BAND_SLUGS.map((b) => `/ielts-band/${b}`);
  const blogPaths = POSTS.map((p) => `/blog/${p.slug}`);

  const all = [...staticPaths, ...sectionPaths, ...bandPaths, "/blog", ...blogPaths];

  return Array.from(new Set(all)).map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/resources") || path.startsWith("/ielts-band") ? 0.8 : 0.6,
  }));
}
