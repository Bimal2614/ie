import type { MetadataRoute } from "next";
import { STUDY } from "@/lib/study-content";
import { POSTS } from "@/lib/blog";
import { BAND_SLUGS } from "@/lib/band-content";
import { WRITING_GUIDES } from "@/lib/study-writing";
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
    "/faq",
    "/resources",
    "/resources/writing",
    "/resources/writing/task-1",
    "/resources/writing/task-2",
    "/ielts-band-scores",
    "/ielts-band-score-calculator",
    "/ielts-2026-changes",
  ];

  const sectionPaths = STUDY.filter((s) => s.key !== "writing").map((s) => `/resources/${s.key}`);
  const bandPaths = BAND_SLUGS.map((b) => `/ielts-band/${b}`);

  // One URL per Writing question type (line graph, discussion essay, …) — twelve
  // pages generated from the same data the task guides render.
  const writingTypePaths = (["task-1", "task-2"] as const).flatMap((task) =>
    WRITING_GUIDES[task].types.map((t) => `/resources/writing/${task}/${t.slug}`),
  );

  /**
   * Non-blog pages carry NO `lastModified`.
   *
   * They used to carry `now`, and that was actively harmful. This file is
   * evaluated per request, so every fetch of /sitemap.xml told Google that all
   * 36 static pages had changed that very second. Google's documented behaviour
   * is to ignore `lastmod` on a sitemap it finds unreliable — and a sitemap
   * where nothing is ever older than the current timestamp is the textbook
   * case. Faking freshness on every URL does not buy a recrawl; it costs you
   * the signal on the URLs where it would have been true.
   *
   * Omitting the field is the sanctioned option: Google falls back to its own
   * crawl history, which is what it was doing anyway. Add a real date here only
   * if these pages ever start tracking one.
   */
  const staticEntries: MetadataRoute.Sitemap = Array.from(
    new Set([...staticPaths, ...sectionPaths, ...bandPaths, ...writingTypePaths]),
  ).map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/resources") || path.startsWith("/ielts-band") ? 0.8 : 0.6,
  }));

  /**
   * Blog posts: a real `lastModified` only when the post actually declares one.
   * `publishedAt` is optional on BlogPost and thirteen of the evergreen posts
   * leave it unset — those previously fell back to `now`, i.e. the same
   * per-request timestamp described above. Undated posts now ship no `lastmod`
   * rather than a false one.
   *
   * Posts dated in the future are dropped entirely. A `lastmod` ahead of the
   * crawl time is a malformed signal, and the post is not meant to be public
   * yet either — this keeps the sitemap and the intent in agreement.
   */
  const blogEntries: MetadataRoute.Sitemap = POSTS.filter(
    (p) => !p.publishedAt || new Date(p.publishedAt) <= now,
  ).map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    ...(p.publishedAt ? { lastModified: new Date(p.publishedAt) } : {}),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
