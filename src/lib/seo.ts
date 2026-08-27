/**
 * One place for everything search engines read.
 *
 * WHY THIS EXISTS. Metadata was previously hand-written per page, so the OG tags,
 * Twitter card and keyword sets drifted — most pages shipped no OG image at all and
 * link previews fell back to a bare URL. `pageMeta()` builds a complete, consistent
 * `Metadata` object from a title/description/path, and the KEYWORDS clusters keep the
 * target queries in one auditable list instead of scattered inline arrays.
 *
 * On <meta keywords>: Google ignores it outright; Bing and Yandex give it a small
 * weight. It is cheap and harmless, so we set it — but the real ranking work is done
 * by the title, H1, description, body copy, internal links and JSON-LD below.
 */

import type { Metadata } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { SAME_AS, SUPPORT_EMAIL } from "@/lib/brand-links";
import { metaKeywordSlice } from "@/lib/keywords";

export const BRAND = "IELTSVega";
/**
 * Absolute URL of the brand mark. Used by the Organization JSON-LD (Google wants
 * a real raster logo of at least 112x112 there — a favicon.ico is rejected) and
 * by the transactional emails, which can only load images over http(s).
 */
export const LOGO_URL = `${SITE_URL}/brand/logo-512.png`;
export const SITE_NAME = "IELTSVega: IELTS Practice Online";

/**
 * The site-wide title. 58 characters — Google truncates the SERP link around
 * 60, and the previous 63-character version was losing "IELTSVega" to an
 * ellipsis on desktop, which is the worst half to lose: the brand is the part
 * that earns the repeat click.
 *
 * It leads with "IELTS Practice Test Online" rather than "IELTS Practice
 * Online" because the former is the phrase with the search volume behind it.
 */
export const DEFAULT_TITLE = "IELTS Practice Test Online with AI Band Scores | IELTSVega";

/**
 * 142 characters. Google renders roughly 155-160 before truncating, and the old
 * 198-character version was cut mid-sentence at "...General Training questions.
 * Real band jum…" — so the closing hook never showed. Ends on a call to action
 * instead, which is what a description is actually for: it does not rank the
 * page, it decides whether the impression becomes a click.
 */
export const DEFAULT_DESCRIPTION =
  "Practise IELTS online: instant AI band scores for Writing & Speaking, full mock tests, and 15,000+ Academic and General questions. Start free.";

/* ───────────────────────────── Keyword clusters ─────────────────────────────
 * Grouped by search intent so a page can pull the clusters it actually competes
 * for. Ordered roughly by volume within each cluster (head terms first).
 */
export const KEYWORDS = {
  /** Head terms — highest volume, highest competition. Home page only. */
  core: [
    "IELTS practice test",
    "IELTS practice online",
    "free IELTS practice test",
    "IELTS mock test",
    "IELTS preparation",
    "IELTS online test",
    "IELTS exam practice",
    "IELTS test practice free",
  ],

  /** Tool intent — people looking for a calculator/checker, not a course. */
  tools: [
    "IELTS band score calculator",
    "IELTS score calculator",
    "IELTS band calculator",
    "calculate IELTS band score",
    "IELTS raw score to band score",
    "IELTS listening band score chart",
    "IELTS reading band score chart",
    "IELTS overall band score calculator",
  ],

  /** Scoring / band explainer intent. */
  bands: [
    "IELTS band scores",
    "IELTS band score",
    "how IELTS is scored",
    "IELTS band descriptors",
    "IELTS scoring system",
    "IELTS overall band score",
    "IELTS band score chart",
  ],

  /** AI-assisted practice — a fast-growing modifier on every section term. */
  ai: [
    "AI IELTS band score",
    "IELTS writing checker",
    "IELTS essay checker",
    "IELTS writing evaluation AI",
    "AI IELTS speaking practice",
    "instant IELTS band score",
  ],

  /**
   * 2026 format transition — surging demand. Paper-based IELTS was retired in most
   * markets on 27 June 2026, One Skill Retake became standard on computer-delivered
   * tests, and a "Writing on Paper" option launched in selected markets.
   */
  changes2026: [
    "IELTS 2026 changes",
    "computer delivered IELTS",
    "IELTS one skill retake",
    "IELTS paper based test discontinued",
    "IELTS writing on paper",
    "IELTS on computer 2026",
    "IELTS new format 2026",
    "IELTS test format changes",
  ],

  /** Module choice — a very common pre-booking query. */
  modules: [
    "IELTS Academic",
    "IELTS General Training",
    "IELTS Academic vs General",
    "which IELTS should I take",
    "IELTS UKVI",
  ],

  /** Per-section terms, keyed by section. */
  listening: ["IELTS listening practice", "IELTS listening test", "IELTS listening practice test with answers", "IELTS listening tips", "IELTS listening map questions"],
  reading: ["IELTS reading practice", "IELTS reading test with answers", "IELTS reading tips", "true false not given IELTS", "IELTS matching headings"],
  writing: ["IELTS writing practice", "IELTS writing task 1", "IELTS writing task 2", "IELTS essay writing", "IELTS writing band 9 samples"],
  speaking: ["IELTS speaking practice", "IELTS speaking part 2", "IELTS cue cards", "IELTS speaking questions", "IELTS speaking topics"],
} as const;

/** Terms every page can safely carry — brand + the single biggest head term. */
const BASELINE_KEYWORDS = ["IELTS", "IELTS practice", BRAND];

/**
 * The site-wide share image, served by app/opengraph-image.tsx.
 *
 * It has to be named explicitly here. Next merges a file-based opengraph-image into
 * the metadata of its OWN segment, but a page that exports its own `openGraph`
 * object replaces the parent's wholesale — images included. So every page built by
 * pageMeta() would otherwise ship with no og:image and share as a bare link, which
 * is exactly what was happening before this default existed.
 */
const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "IELTSVega: practise IELTS online with AI band scoring",
};

/**
 * Build a full Metadata object.
 *
 * `path` must be the site-root-relative canonical (e.g. "/pricing"). Passing a page's
 * real path is what keeps the canonical, og:url and sitemap in agreement — the three
 * Google cross-checks before it will index a URL.
 */
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  /** Set false on gated app screens so they never enter the index. */
  index?: boolean;
  /** Article pages pass "article" plus their dates. */
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  /** Override the site-wide OG image (blog posts generate their own). */
  imageUrl?: string;
}): Metadata {
  const { title, description, path, keywords = [], index = true, type = "website", publishedTime, modifiedTime, imageUrl } = opts;

  /**
   * Length guard. Not cosmetic: 46 of 52 titles and 36 of 52 descriptions had
   * drifted outside the range Google renders, so most of the site was being
   * truncated mid-phrase in search results. Nothing catches that at review time
   * — a title only looks too long once you count it — so it is counted here.
   *
   * Dev/build only, and a warning rather than a throw: shipping a 62-character
   * title is a minor CTR loss, while failing a production build over one would
   * be an outage. The warning appears in `next build` output, which is where
   * anyone adding a page will see it.
   */
  if (process.env.NODE_ENV !== "production") {
    if (title.length < 30 || title.length > 60) {
      console.warn(`[seo] ${path}: title is ${title.length} chars (want 30-60) — "${title}"`);
    }
    if (description.length < 120 || description.length > 160) {
      console.warn(`[seo] ${path}: description is ${description.length} chars (want 120-160)`);
    }
  }

  const url = absoluteUrl(path);
  const image = imageUrl ? { ...DEFAULT_OG_IMAGE, url: imageUrl } : DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    // Capped — see metaKeywordSlice. Pages pass whole clusters for readability;
    // only the first dozen ship, because the tag barely counts and the bytes do.
    keywords: metaKeywordSlice([...keywords, ...BASELINE_KEYWORDS]),
    alternates: {
      canonical: url,
      /**
       * hreflang. The site is English-only, so this is a SELF-REFERENCING set:
       * `en` points at this page and `x-default` names it the fallback for every
       * other language. That is not a no-op — without x-default, Google has no
       * declared default for a monolingual site and the audit reports the
       * implementation as broken. It also reserves the shape for the day a
       * localised version exists: add `"hi": ...` here and nothing else changes.
       *
       * Absolute URLs are mandatory in hreflang; relative ones are ignored
       * silently, which is why this passes `url` and not `path`.
       */
      languages: {
        en: url,
        "x-default": url,
      },
    },
    robots: index
      ? undefined // inherit the permissive root default (see app/layout.tsx)
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      type,
      url,
      siteName: BRAND,
      title,
      description,
      locale: "en_US",
      images: [image],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

/* ─────────────────────────────── JSON-LD builders ───────────────────────────
 * Structured data is how a page earns rich results — FAQ accordions, breadcrumb
 * trails and course cards in the SERP. Each builder returns a plain object; render
 * it with <JsonLd> from components/seo/json-ld.
 */

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The brand entity. Emitted once, on the home page, and referenced by `@id`
 * from every other block on the site.
 *
 * `sameAs` is the part that matters here: it is how five separate social
 * profiles and this domain get resolved to ONE entity, which is the
 * precondition for a knowledge panel and for a brand search returning us rather
 * than an unrelated account with a similar handle. It is populated from
 * lib/brand-links, and only with profiles marked verified — an unreachable
 * sameAs discredits the whole list.
 *
 * `contactPoint` replaces the postal address Google's "local business" advice
 * asks for. This is a global online platform with no walk-in premises, so
 * LocalBusiness + PostalAddress would be a fabricated claim; ContactPoint with
 * areaServed: Worldwide is the honest and valid way to state the same thing.
 */
export function organizationJsonLd() {
  return {
    "@type": "EducationalOrganization",
    "@id": ORG_ID,
    name: BRAND,
    alternateName: "IELTS Vega",
    url: SITE_URL,
    // Google rejects a favicon here and wants a raster image of at least
    // 112x112; logo-512.png is the 512px master.
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 512,
      height: 512,
      caption: BRAND,
    },
    image: LOGO_URL,
    description:
      "IELTS preparation platform with AI band scoring for Writing and Speaking, full mock tests, and 15,000+ Academic and General Training questions.",
    email: SUPPORT_EMAIL,
    ...(SAME_AS.length > 0 ? { sameAs: [...SAME_AS] } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SUPPORT_EMAIL,
      url: absoluteUrl("/contact"),
      areaServed: "Worldwide",
      availableLanguage: ["English"],
    },
    knowsAbout: [
      "IELTS Academic",
      "IELTS General Training",
      "IELTS band descriptors",
      "English language proficiency testing",
    ],
  };
}

/**
 * The site entity. Separate from the organization because they are genuinely
 * different things — the org publishes the site — and Google reads the
 * publisher edge between them.
 *
 * No `potentialAction`/SearchAction is declared. That markup only earns the
 * sitelinks searchbox when the URL template it names is a real, crawlable
 * search endpoint returning results; there is no such route here, and declaring
 * one that 404s is an invalid-markup error rather than a missed opportunity.
 * Add it the day /search exists.
 */
export function webSiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: "Practise IELTS online with AI band scoring and full mock tests.",
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

/**
 * Wrap a set of schema blocks into one `@graph`.
 *
 * One graph per page, not one <script> per block: cross-references by `@id`
 * only resolve reliably inside a single graph, and it is the difference between
 * Google seeing four related entities and four orphans.
 */
export function graphJsonLd(...blocks: object[]) {
  return { "@context": "https://schema.org", "@graph": blocks };
}

/** Breadcrumb trail. Pass the full path including the page itself. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path === "/" ? "" : it.path}`,
    })),
  };
}

/** FAQ rich result. Google shows these as an expandable accordion under the link. */
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * A study guide that teaches a skill — eligible for the Course rich result.
 *
 * `hasCourseInstance` and `offers` are not optional in practice: Google's Course
 * validator reports them as missing required fields and drops the page from the
 * rich result without them, even though schema.org itself treats them as optional.
 * `courseWorkload` must be an ISO 8601 duration.
 */
export function courseJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  /** ISO 8601 duration for a typical read-and-practise session. */
  workload?: string;
}) {
  const url = `${SITE_URL}${opts.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    description: opts.description,
    url,
    provider: { "@type": "Organization", name: BRAND, "@id": ORG_ID, url: SITE_URL },
    // Free-to-read guide; the practice platform behind it is the paid product.
    isAccessibleForFree: true,
    inLanguage: "en",
    about: { "@type": "Thing", name: "IELTS" },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: opts.workload ?? "PT45M",
      // Self-paced: no scheduled sessions, so no startDate/endDate to declare.
      inLanguage: "en",
    },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", category: "Free", url },
  };
}

/** An interactive tool (the band calculator) — marks it as software, not an article. */
export function webAppJsonLd(opts: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": ORG_ID },
  };
}

/** Step-by-step guidance — eligible for the HowTo rich result. */
export function howToJsonLd(opts: { name: string; description: string; steps: { name: string; text: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
