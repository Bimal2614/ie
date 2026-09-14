import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { POSTS } from "@/lib/blog";
import type { BlogPost } from "@/lib/blog-types";

/**
 * "From the blog" strip — surfaces posts on high-authority marketing pages
 * (home, resources) so link equity flows into individual articles. This is the
 * main lever against "Discovered — currently not indexed": posts stop being
 * reachable only from the blog index and get crawled sooner.
 *
 * `slugs` exists because the default — `POSTS.slice(0, limit)` — hands the two
 * strongest pages on the site to whatever happens to sit at the top of the
 * array. On 14 Sep 2026 that was three dated "recent questions" posts carrying
 * 5–14 impressions each, while pages on 298–540 impressions received no
 * internal links at all. Equity should be aimed, not allocated by array order,
 * so callers on `/` and `/resources` name the posts they want to push.
 */
export function BlogStrip({
  limit = 3,
  title = "From the blog",
  eyebrow = "Guides & tips",
  exclude,
  slugs,
}: {
  limit?: number;
  title?: string;
  eyebrow?: string;
  /** Slug to omit (e.g. when shown on a post to avoid linking to itself). */
  exclude?: string;
  /**
   * Explicit posts to link, in order. Unknown slugs are skipped rather than
   * rendered empty, so a renamed post degrades to a shorter strip instead of
   * crashing the page it is embedded in.
   */
  slugs?: string[];
}) {
  const posts = slugs
    ? slugs
        .map((s) => POSTS.find((p) => p.slug === s))
        .filter((p): p is BlogPost => Boolean(p) && p!.slug !== exclude)
    : POSTS.filter((p) => p.slug !== exclude).slice(0, limit);
  if (posts.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
          <h2 className="font-serif mt-3 text-3xl tracking-tight sm:text-4xl">{title}</h2>
        </div>
        <Link href="/blog" className="hidden items-center gap-1.5 text-sm font-medium text-brand hover:underline sm:inline-flex">
          All articles <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">{p.category}</span>
              <span className="flex items-center gap-1 text-ink-muted"><Clock className="size-3" /> {p.readMins} min</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-snug text-ink">{p.title}</h3>
            <p className="mt-2 flex-1 text-sm text-ink-soft">{p.excerpt}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
              Read article <ArrowRight className="size-4" />
            </span>
          </Link>
        ))}
      </div>

      <Link href="/blog" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline sm:hidden">
        All articles <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
