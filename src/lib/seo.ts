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
import { SITE_URL } from "@/lib/site";

export const BRAND = "IELTSVega";
export const SITE_NAME = "IELTSVega: IELTS Practice Online";
export const DEFAULT_DESCRIPTION =
  "Practise IELTS online with instant AI band scores for Writing & Speaking, full-length mock tests, and 15,000+ Academic and General Training questions.";

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
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const image = imageUrl ? { ...DEFAULT_OG_IMAGE, url: imageUrl } : DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    keywords: [...new Set([...keywords, ...BASELINE_KEYWORDS])],
    alternates: { canonical: path },
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
