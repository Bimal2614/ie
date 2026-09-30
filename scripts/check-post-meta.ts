/**
 * Metadata length linter for blog posts.
 *
 * WHY THIS EXISTS AS A SEPARATE SCRIPT.
 *
 * `pageMeta()` in src/lib/seo.ts already warns when a title or description
 * drifts outside the range Google renders, and its comment claims the warning
 * "appears in `next build` output". It does not, for two independent reasons:
 *
 *   1. `next build` runs with NODE_ENV="production", and the guard originally
 *      read `NODE_ENV !== "production"` — so it was switched off during the
 *      exact run it was written for. (Now fixed to also check NEXT_PHASE.)
 *   2. More fundamentally, the app is `force-dynamic` site-wide because the
 *      nonce CSP requires per-request rendering. `/blog/[slug]` is therefore
 *      server-rendered on demand and its `generateMetadata` NEVER executes
 *      during a build. No guard change can fix that — the code does not run.
 *
 * So `npm run build | grep '[seo]'` returned nothing on a site that had six
 * descriptions over the limit, and the silence was read as a pass. Ahrefs Site
 * Audit found them on 14 Sep 2026; our own tooling could not have.
 *
 * This script reads the post data directly, so it covers every post regardless
 * of how the route renders, and it is deterministic and fast.
 *
 * Run it by hand:  npx tsx scripts/check-post-meta.ts
 * Exits non-zero if anything is out of range, so it can gate CI later.
 */
import { POSTS } from "../src/lib/blog";

/** Google renders roughly this much. Same bounds pageMeta() enforces. */
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 160;

type Problem = { slug: string; field: string; length: number; want: string; text: string };

const problems: Problem[] = [];

for (const post of POSTS) {
  // `seoTitle` is what actually ships as <title> when present.
  const title = post.seoTitle ?? post.title;
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    problems.push({
      slug: post.slug,
      field: post.seoTitle ? "seoTitle" : "title",
      length: title.length,
      want: `${TITLE_MIN}-${TITLE_MAX}`,
      text: title,
    });
  }

  if (post.excerpt.length < DESC_MIN || post.excerpt.length > DESC_MAX) {
    problems.push({
      slug: post.slug,
      field: "excerpt",
      length: post.excerpt.length,
      want: `${DESC_MIN}-${DESC_MAX}`,
      text: post.excerpt,
    });
  }
}

console.log(`Checked ${POSTS.length} posts.`);

if (problems.length === 0) {
  console.log("All titles and excerpts are within range.");
  process.exit(0);
}

console.log(`\n${problems.length} problem(s):\n`);
for (const p of problems) {
  const over = p.length > Number(p.want.split("-")[1]);
  console.log(
    `  ${p.slug}\n    ${p.field}: ${p.length} chars (want ${p.want}) — ${over ? "TOO LONG" : "TOO SHORT"}\n    "${p.text}"\n`,
  );
}

process.exit(1);
