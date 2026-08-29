/**
 * Shared types for blog content.
 *
 * These live in their own module so the post data can be split across several
 * files (`blog.ts`, `blog-2026-topics.ts`, `blog-practice.ts`) without any of
 * them importing each other at runtime. `blog.ts` re-exports them, so
 * `import type { BlogPost } from "@/lib/blog"` keeps working.
 */

export type BlogSection = { heading?: string; paragraphs?: string[]; bullets?: string[] };

export type BlogPost = {
  slug: string;
  /** The article headline. Rendered as the page H1 — keep it under 70 chars. */
  title: string;
  /**
   * Optional <title> override, for headlines that read well on the page but
   * exceed the ~60 characters Google renders in a result. Falls back to
   * `title`. Note the page title no longer carries a "| IELTSVega Blog"
   * suffix: 17 characters of brand was pushing every post's real headline out
   * of the visible part of the snippet.
   */
  seoTitle?: string;
  excerpt: string;
  category: string;
  date: string; // display string, e.g. "July 2026"
  /** ISO date (YYYY-MM-DD) for JSON-LD datePublished + freshness signals. */
  publishedAt?: string;
  readMins: number;
  /** SEO target queries for this post (meta keywords + JSON-LD). */
  keywords: string[];
  sections: BlogSection[];
  /** Optional Q&A — rendered as a visible FAQ section and FAQPage JSON-LD.
   *  Target real "People Also Ask" questions in the answers. */
  faqs?: { q: string; a: string }[];
};
