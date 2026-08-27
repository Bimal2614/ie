import { STUDY } from "@/lib/study-content";
import { POSTS } from "@/lib/blog";
import { BAND_SLUGS } from "@/lib/band-content";
import { WRITING_GUIDES } from "@/lib/study-writing";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { BRAND } from "@/lib/seo";

/**
 * /llms.txt — the emerging convention (llmstxt.org) for telling an LLM what a
 * site is and which URLs are worth reading.
 *
 * WHY BOTHER. Answer engines — ChatGPT Search, Perplexity, Claude, AI Overviews
 * — increasingly send qualified traffic, and they fetch far less of a site than
 * a search crawler does. They land on one page, and if it does not answer the
 * question in the first screen they move on. llms.txt is a curated map that
 * puts the answer pages one hop away: a flat, link-dense Markdown index with no
 * navigation chrome, no JavaScript and no cookie wall to parse past.
 *
 * WHY IT IS GENERATED, NOT A STATIC FILE. A hand-maintained public/llms.txt goes
 * stale the first time a blog post ships, and a stale index is worse than none —
 * it advertises URLs that 404. This builds from the same constants the sitemap
 * and the pages themselves render from, so it cannot drift.
 *
 * FORMAT. Markdown, per the spec: one H1, a blockquote summary, then H2 sections
 * of `- [title](url): note` links. Served as text/plain so it renders raw in a
 * browser rather than downloading.
 */

export const dynamic = "force-dynamic";

function link(title: string, path: string, note?: string): string {
  return `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;
}

export function GET(): Response {
  // Writing is excluded here and given its own richer entry below — it has a
  // dedicated hub plus twelve per-type pages, so one generic line would bury it.
  const sections = STUDY.filter((s) => s.key !== "writing").map((s) =>
    link(`IELTS ${s.name} strategies`, `/resources/${s.key}`, `question types, technique and traps for ${s.name}`),
  );

  const writingTypes = (["task-1", "task-2"] as const).flatMap((task) =>
    WRITING_GUIDES[task].types.map((t) =>
      link(
        `IELTS Writing ${task === "task-1" ? "Task 1" : "Task 2"}: ${t.name}`,
        `/resources/writing/${task}/${t.slug}`,
        "structure, model answer and band criteria",
      ),
    ),
  );

  const bands = BAND_SLUGS.map((slug) => {
    // Slugs are URL-safe ("6-5"); the label has to read as a band score ("6.5").
    const band = slug.replace("-", ".");
    return link(`How to get IELTS Band ${band}`, `/ielts-band/${slug}`, `what Band ${band} takes in each of the four skills`);
  });

  // Newest first, matching POSTS order. Capped so the file stays a map rather
  // than a dump — an index an LLM can hold in one context is the whole point.
  const posts = POSTS.slice(0, 25).map((p) => link(p.title, `/blog/${p.slug}`, p.excerpt));

  const body = `# ${BRAND}

> ${BRAND} is an online IELTS preparation platform: instant AI band scoring for Writing and Speaking against the four official band criteria, full-length timed mock tests on current exam timing, and 15,000+ practice questions covering every Academic and General Training question type. Free to start.

Everything below is free to read without an account. Practice sessions, mock tests and score history require a free login and are intentionally excluded from this index.

## Tools

${link("IELTS band score calculator", "/ielts-band-score-calculator", "convert raw Listening/Reading scores and Writing/Speaking bands into an overall band, with the official rounding rules")}
${link("How IELTS band scores work", "/ielts-band-scores", "the 0-9 scale, half bands, per-skill marking and how the overall score is averaged and rounded")}

## Study guides by skill

${sections.join("\n")}
${link("IELTS Writing guide", "/resources/writing", "Task 1 and Task 2 across Academic and General Training")}
${link("Sentence banks & templates", "/templates", "reusable structures for Writing Task 1, Task 2 and Speaking Part 2")}
${link("All study materials", "/resources", "index of every free guide")}

## Writing question types

${writingTypes.join("\n")}

## Band targets

${bands.join("\n")}

## Test format

${link("IELTS 2026 changes", "/ielts-2026-changes", "computer-delivered testing, One Skill Retake, the retirement of paper-based IELTS and the Writing on Paper option")}

## Articles

${posts.join("\n")}

## About

${link("About IELTSVega", "/about")}
${link("Pricing", "/pricing")}
${link("Contact", "/contact")}
${link("FAQ", "/faq")}

## Notes

- IELTS is a registered trademark of the British Council, IDP: IELTS Australia and Cambridge University Press & Assessment. ${BRAND} is an independent practice platform and is not affiliated with, endorsed by or connected to any of them.
- Band scores produced by ${BRAND} are AI estimates generated against the published band descriptors. They are a preparation aid and are not official IELTS results.
- Canonical origin: ${SITE_URL}
- Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Cheap to build, but it is fetched by bots far more often than by
      // people; an hour of CDN caching keeps it off the origin.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
