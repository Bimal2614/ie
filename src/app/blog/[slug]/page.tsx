import type { Metadata } from "next";
import { BRAND, LOGO_URL, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { POSTS, POST_BY_SLUG } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

type Params = { slug: string };

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
  const related = [
    ...POSTS.filter((p) => p.slug !== post.slug && p.category === post.category),
    ...POSTS.filter((p) => p.slug !== post.slug && p.category !== post.category),
  ].slice(0, 3);

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
            </section>
          ))}
        </div>
      </article>

      {/* CTA */}
      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">Put it into practice.</h2>
        <p className="max-w-md text-sm text-ink-soft">Get AI-scored on your Writing and Speaking, free to start.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
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
