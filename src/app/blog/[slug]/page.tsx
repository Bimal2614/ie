import type { Metadata } from "next";
import { BRAND, LOGO_URL, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { POSTS, POST_BY_SLUG } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

type Params = { slug: string };

/**
 * The category that marks a post as written for a BUYER rather than a
 * candidate. Set in `blog-partners.ts`; kept as one constant so the closing CTA
 * and this page never drift apart. Adding a second B2B category means turning
 * this into a Set, not copying the string.
 */
const B2B_CATEGORY = "For institutes";

/** Closing CTA per audience. See the note above the CTA block below. */
const CTA_BY_AUDIENCE = {
  candidate: {
    heading: "Put it into practice.",
    body: "Get AI-scored on your Writing and Speaking, free to start.",
    href: "/signup",
    label: "Start practising free",
  },
  institute: {
    heading: "Run your classes on IELTSVega.",
    body: "Wholesale rates, a student roster and instant AI band scores. No joining fee, no minimum.",
    href: "/partners",
    label: "Become a partner",
  },
} as const;

/**
 * One guaranteed cross-category inbound link for every post.
 *
 * Computed once at module load, in POSTS order, assigning each post the eligible
 * partner that currently has the fewest inbound bridges. Greedy least-loaded is
 * enough: with 58 posts and 58 assignments it lands one on each, so no post is
 * reachable only from inside its own category.
 *
 * Why this exists rather than "just take one from the other-category list": the
 * related list is rotated by post index, and categories sit in contiguous blocks
 * in POSTS, so rotation alone sent whole runs of posts to the same target and
 * left 12 posts with no cross-category link at all — among them four of the "For
 * institutes" posts this was supposed to rescue. Balancing by inbound count is
 * what makes the guarantee hold instead of approximately holding.
 *
 * Deterministic by construction: same POSTS, same map, same link graph on every
 * request and every build.
 */
const CROSS_CATEGORY_BRIDGE: ReadonlyMap<string, string> = (() => {
  const inboundBridges = new Map<string, number>(POSTS.map((p) => [p.slug, 0]));
  const bridge = new Map<string, string>();

  for (const post of POSTS) {
    let best: (typeof POSTS)[number] | null = null;
    for (const candidate of POSTS) {
      if (candidate.slug === post.slug || candidate.category === post.category) continue;
      if (best === null || (inboundBridges.get(candidate.slug) ?? 0) < (inboundBridges.get(best.slug) ?? 0)) {
        best = candidate;
      }
    }
    if (best) {
      bridge.set(post.slug, best.slug);
      inboundBridges.set(best.slug, (inboundBridges.get(best.slug) ?? 0) + 1);
    }
  }

  return bridge;
})();

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = POST_BY_SLUG[slug];
  if (!post) return {};
  const meta = pageMeta({
    title: post.seoTitle ?? post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    type: "article",
    publishedTime: post.publishedAt,
  });

  /**
   * Drop `images` so Next re-injects this segment's own opengraph-image.tsx.
   *
   * Next merges a file-based OG image into a segment's metadata only when that
   * segment does not declare `openGraph.images` itself. pageMeta() always sets
   * the site-wide default, which would replace every post's generated card with
   * one identical brand image — so the per-post image is restored by removing
   * the key rather than by bypassing pageMeta and losing canonical, hreflang,
   * og:url and the Twitter card with it (which is what the hand-written object
   * this replaced was doing: every post shared with the HOME PAGE's title).
   */
  const openGraph = { ...meta.openGraph };
  delete (openGraph as { images?: unknown }).images;
  const twitter = { ...meta.twitter };
  delete (twitter as { images?: unknown }).images;

  return { ...meta, openGraph, twitter };
}

/** BlogPosting structured data — helps Google surface the article richly.
 *  JSON-LD is data, not executable script, so CSP script-src doesn't gate it
 *  and no nonce is needed. */
function ArticleJsonLd({ post }: { post: (typeof POSTS)[number] }) {
  const base = SITE_URL;
  const json = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    keywords: post.keywords.join(", "),
    articleSection: post.category,
    url: `${base}/blog/${post.slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/blog/${post.slug}` },
    /**
     * `image` is the property Google's Article documentation asks for and the
     * one every post here was shipping without — all 46 of them. The picture
     * already exists: opengraph-image.tsx renders a 1200x630 PNG per post, and
     * the <meta og:image> tag points at it. It was simply never named in the
     * structured data, so Google had a card image for social and nothing for
     * search.
     *
     * The og:image meta carries a cache-busting query (…/opengraph-image?ab12…)
     * that is generated per build and cannot be reconstructed here. The bare
     * route serves the identical PNG — verified 200 image/png, 1200x630 — so
     * the un-suffixed URL is the stable one to publish.
     */
    image: [`${base}/blog/${post.slug}/opengraph-image`],
    author: { "@type": "Organization", name: BRAND, url: base },
    publisher: {
      "@type": "Organization",
      name: BRAND,
      url: base,
      // Google rejects a favicon here and wants a real raster mark; LOGO_URL is
      // the 512x512 PNG the Organization schema already uses elsewhere.
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    /**
     * Thirteen of the 46 posts leave `publishedAt` unset, so they emit no
     * date at all rather than a fabricated one — same rule the sitemap now
     * follows. Giving those posts real dates is a content job, not a code one.
     */
    ...(post.publishedAt
      ? { datePublished: post.publishedAt, dateModified: post.publishedAt }
      : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

/** FAQPage structured data — pairs with the visible FAQ section below. */
function FaqJsonLd({ faqs }: { faqs: NonNullable<(typeof POSTS)[number]["faqs"]> }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

/** Breadcrumb structured data — gives Google the Home › Blog › Post hierarchy,
 *  which can render as a breadcrumb line in the search result and reinforces the
 *  site structure crawlers use to index deep pages. */
function BreadcrumbJsonLd({ post }: { post: (typeof POSTS)[number] }) {
  const base = SITE_URL;
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${base}/blog/${post.slug}` },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export default async function BlogArticle({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = POST_BY_SLUG[slug];
  if (!post) notFound();

  // Related articles — same category first, then fill from the rest. Internal
  // links like these help Google discover and index every post (they stop being
  // orphan pages) and keep readers on-site.
  //
  // Both lists are ROTATED by the current post's index, and that rotation is
  // the whole point. Taking them in plain array order meant every post whose
  // category ran short filled its remaining slots from the top of POSTS, so on
  // 14 Sep 2026 the post at index 0 collected 19 inbound links while 7 posts
  // collected none — among them `how-to-book-ielts-test`, which is the single
  // URL sitting in GSC's "Crawled – currently not indexed" bucket. Rotating
  // spreads the same number of links across the whole archive: measured
  // afterwards, zero posts have no inbound link and the range is 1–6.
  //
  // Keep this deterministic. Randomising would give Google a different link
  // graph on every request, which is worse than concentrating it.
  //
  // One slot is RESERVED for the CROSS_CATEGORY_BRIDGE partner, the rest go to
  // the post's own category. Rotation alone did not fix the real failure: any
  // category with 3+ posts filled all three slots from itself and became a
  // sealed island, reachable only from /blog and the sitemap. On 17 Sep 2026 all
  // ten "For institutes" posts — published 15 Sep, crawled the same day — sat in
  // "Crawled – currently not indexed" receiving inbound links from nothing but
  // each other, and `how-to-book-ielts-test` had been stuck in that bucket since
  // 1 Sep for the same reason inside "Basics". With the bridge reserved, every
  // one of the 58 posts has at least one inbound link from outside its cluster.
  const idx = POSTS.findIndex((p) => p.slug === post.slug);
  const rotate = <T,>(arr: T[], by: number): T[] =>
    arr.length === 0 ? arr : [...arr.slice(by % arr.length), ...arr.slice(0, by % arr.length)];
  const bridged = POSTS.find((p) => p.slug === CROSS_CATEGORY_BRIDGE.get(post.slug));
  const sameCategory = rotate(
    POSTS.filter((p) => p.slug !== post.slug && p.category === post.category),
    idx,
  );
  const otherCategory = rotate(
    POSTS.filter((p) => p.slug !== post.slug && p.category !== post.category),
    idx,
  );
  const related = [
    ...(bridged ? [bridged] : []),
    ...sameCategory.slice(0, 2),
    ...otherCategory,
    ...sameCategory.slice(2),
  ]
    .filter((p, i, all) => all.findIndex((x) => x.slug === p.slug) === i)
    .slice(0, 3);

  const cta = CTA_BY_AUDIENCE[post.category === B2B_CATEGORY ? "institute" : "candidate"];

  return (
    <MarketingShell>
      <ArticleJsonLd post={post} />
      <BreadcrumbJsonLd post={post} />
      {post.faqs && post.faqs.length > 0 && <FaqJsonLd faqs={post.faqs} />}

      {/* Visible breadcrumb — internal links to Home & Blog on every post. */}
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand hover:underline">Home</Link></li>
          <li aria-hidden className="text-ink-muted/50">/</li>
          <li><Link href="/blog" className="hover:text-brand hover:underline">Blog</Link></li>
          <li aria-hidden className="text-ink-muted/50">/</li>
          <li aria-current="page" className="truncate text-ink-soft">{post.category}</li>
        </ol>
      </nav>

      <Link href="/blog" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="size-4" /> All articles
      </Link>

      <article className="mt-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">{post.category}</span>
          <span className="flex items-center gap-1 text-ink-muted"><Clock className="size-3" /> {post.readMins} min read</span>
          {post.publishedAt ? (
            <time dateTime={post.publishedAt} className="text-ink-muted">· {post.date}</time>
          ) : (
            <span className="text-ink-muted">· {post.date}</span>
          )}
        </div>

        <h1 className="font-serif mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{post.excerpt}</p>

        <div className="mt-8 space-y-7 border-t border-line pt-8">
          {post.sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2 className="text-xl font-semibold text-ink">{s.heading}</h2>}
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="mt-2 leading-relaxed text-ink-soft">{p}</p>
              ))}
              {s.bullets && (
                <ul className="mt-3 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-ink-soft">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-muted/50" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {/* In-body internal links. These are the ones that actually pass
                  equity to the pages we want indexed, so the anchor text is the
                  author's descriptive label rather than a bare URL. */}
              {s.links && s.links.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {s.links.map((l) => (
                    <li key={l.href} className="flex gap-2.5">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand/50" />
                      <Link
                        href={l.href}
                        className="font-medium text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:decoration-brand"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {/* Tables are wrapped in their own horizontal scroller so a wide
                  fee or band-conversion table never forces the article body to
                  scroll sideways on a phone. */}
              {s.table && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-sm">
                    {s.table.caption && (
                      <caption className="pb-2 text-left text-xs text-ink-muted">{s.table.caption}</caption>
                    )}
                    <thead>
                      <tr className="border-b border-line">
                        {s.table.headers.map((h) => (
                          <th key={h} scope="col" className="px-3 py-2 text-left font-semibold text-ink">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, r) => (
                        <tr key={r} className="border-b border-line/60">
                          {row.map((cell, c) => (
                            <td key={c} className="px-3 py-2 align-top text-ink-soft">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </article>

      {/*
        CTA — and it has to match who is reading.

        Every post used to close on "Start practising free" pointing at /signup,
        which is right for a candidate and wrong for the B2B cluster: an
        institute owner who has just read about franchise costs is not looking
        for a free student account, and sending them to one wastes the only
        conversion the post exists to produce. The category decides.
      */}
      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">{cta.heading}</h2>
        <p className="max-w-md text-sm text-ink-soft">{cta.body}</p>
        <Link href={cta.href} className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          {cta.label} <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* FAQ — visible Q&A that targets "People Also Ask" queries; paired with
          the FAQPage JSON-LD above. Questions are H3 under the section H2. */}
      {post.faqs && post.faqs.length > 0 && (
        <section className="mt-14 border-t border-line pt-8">
          <h2 className="font-serif text-2xl tracking-tight">Frequently asked questions</h2>
          <dl className="mt-6 space-y-6">
            {post.faqs.map((f) => (
              <div key={f.q}>
                <dt><h3 className="text-base font-semibold text-ink">{f.q}</h3></dt>
                <dd className="mt-1.5 leading-relaxed text-ink-soft">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Related articles — internal links for crawlability + on-site reading. */}
      {related.length > 0 && (
        <section className="mt-14 border-t border-line pt-8">
          <h2 className="font-serif text-2xl tracking-tight">Related articles</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-5 transition-shadow hover:shadow-lg"
              >
                <span className="text-xs font-medium text-brand">{r.category}</span>
                <span className="mt-2 flex-1 text-sm font-semibold leading-snug text-ink">{r.title}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand">
                  Read <ArrowRight className="size-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </MarketingShell>
  );
}
