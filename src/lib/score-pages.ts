import { BAND_TABLES, overallBand } from "@/lib/ielts";

/**
 * One page per raw score: "/ielts-score/listening/32-out-of-40".
 *
 * Built because the band-chart post sits at position ~7 for 160+ queries of the
 * shape "32 out of 40 in ielts listening" with almost no clicks, while the
 * result Google's AI Overview cites is a competitor's page for that single
 * score (keyword-map, 2 Oct and 3 Oct 2026). Someone typing one score wants one
 * answer, not a 40-row table.
 *
 * Every number on these pages is computed from BAND_TABLES, the same tables
 * the calculator and the band-chart post use, so the three can never disagree.
 * Nothing here is written per score by hand: what makes 93 pages worth
 * indexing is that each one carries different, derived facts (its band, the
 * range that band covers, the distance to the next band, the same score in the
 * other two sections, the overall band it produces), not a template with a
 * number swapped in.
 */

export const SCORE_SECTIONS = {
  listening: {
    slug: "listening",
    name: "Listening",
    long: "IELTS Listening",
    table: BAND_TABLES.listening,
    note: "Listening uses one conversion table for Academic and General Training.",
    canada: true,
  },
  "academic-reading": {
    slug: "academic-reading",
    name: "Academic Reading",
    long: "IELTS Academic Reading",
    table: BAND_TABLES.academicReading,
    note: "Academic Reading has its own table. General Training Reading needs more correct answers for the same band.",
    canada: false,
  },
  "general-reading": {
    slug: "general-reading",
    name: "General Training Reading",
    long: "IELTS General Training Reading",
    table: BAND_TABLES.generalReading,
    note: "General Training texts are more everyday in style, so this table needs more correct answers than Academic for the same band.",
    canada: true,
  },
} as const;

export type ScoreSectionKey = keyof typeof SCORE_SECTIONS;
export type ScoreSection = (typeof SCORE_SECTIONS)[ScoreSectionKey];

/** Lowest score with its own page. Below this the bands are 3.5 and under, and nobody searches them. */
export const MIN_SCORE = 10;
export const MAX_SCORE = 40;

export const SECTION_KEYS = Object.keys(SCORE_SECTIONS) as ScoreSectionKey[];

export function scoreSlug(score: number) {
  return `${score}-out-of-40`;
}

export function parseScoreSlug(slug: string): number | null {
  const m = /^(\d{1,2})-out-of-40$/.exec(slug);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= MIN_SCORE && n <= MAX_SCORE ? n : null;
}

export function scorePath(section: ScoreSectionKey, score: number) {
  return `/ielts-score/${section}/${scoreSlug(score)}`;
}

export function allScorePaths() {
  return SECTION_KEYS.flatMap((s) =>
    Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => scorePath(s, MIN_SCORE + i)),
  );
}

type Table = readonly (readonly [number, number])[];

export function bandFor(table: Table, score: number): number {
  for (const [min, band] of table) if (score >= min) return band;
  return 0;
}

/** The raw-score range that earns `band` in this table. */
export function rangeFor(table: Table, band: number): { min: number; max: number } {
  const i = table.findIndex(([, b]) => b === band);
  return { min: table[i][0], max: i === 0 ? 40 : table[i - 1][0] - 1 };
}

/** The next band up, and the raw score it starts at. Null at Band 9. */
export function nextBand(table: Table, score: number): { band: number; min: number } | null {
  const i = table.findIndex(([min]) => score >= min);
  if (i <= 0) return null;
  return { band: table[i - 1][1], min: table[i - 1][0] };
}

export function fmtBand(b: number) {
  return b.toFixed(1);
}

/**
 * Home Affairs English levels, set per skill (verified 2026-10-08, see the
 * comment on /blog/ielts-score-for-australia-pr).
 */
export function australiaLevel(band: number): string {
  if (band >= 8) return "Superior English (8.0+), the 20-point level";
  if (band >= 7) return "Proficient English (7.0+), the 10-point level";
  if (band >= 6) return "Competent English (6.0+), the minimum for skilled visas";
  return "Below Competent English (6.0), the skilled-visa minimum";
}

/**
 * IELTS General Training to CLB, for Listening and Reading. Same table as
 * /blog/ielts-score-for-canada-express-entry; change both together.
 */
export function canadaClb(section: ScoreSectionKey, band: number): string {
  const steps: [number, number][] =
    section === "listening"
      ? [[8.5, 10], [8, 9], [7.5, 8], [6, 7], [5.5, 6]]
      : [[8, 10], [7, 9], [6.5, 8], [6, 7], [5, 6]];
  for (const [min, clb] of steps) if (band >= min) return `CLB ${clb}`;
  return "Below CLB 6";
}

/** What an overall band looks like if the other three skills all land on `other`. */
export function overallWith(band: number, other: number) {
  return overallBand([band, other, other, other]);
}

export type ScoreFacts = {
  section: ScoreSection;
  key: ScoreSectionKey;
  score: number;
  band: number;
  percent: number;
  range: { min: number; max: number };
  next: { band: number; min: number; more: number } | null;
  /** Correct answers you can lose before the band drops. */
  cushion: number;
  others: { key: ScoreSectionKey; name: string; band: number }[];
  neighbours: { score: number; band: number }[];
};

export function scoreFacts(key: ScoreSectionKey, score: number): ScoreFacts {
  const section = SCORE_SECTIONS[key];
  const band = bandFor(section.table, score);
  const range = rangeFor(section.table, band);
  const n = nextBand(section.table, score);
  return {
    section,
    key,
    score,
    band,
    percent: Math.round((score / 40) * 100),
    range,
    next: n ? { ...n, more: n.min - score } : null,
    cushion: score - range.min,
    others: SECTION_KEYS.filter((k) => k !== key).map((k) => ({
      key: k,
      name: SCORE_SECTIONS[k].name,
      band: bandFor(SCORE_SECTIONS[k].table, score),
    })),
    neighbours: Array.from({ length: 7 }, (_, i) => score - 3 + i)
      .filter((s) => s >= 1 && s <= 40)
      .map((s) => ({ score: s, band: bandFor(section.table, s) })),
  };
}

/** Every visible question below is answered on the page; the FAQ JSON-LD mirrors it. */
export function scoreFaqs(f: ScoreFacts): { q: string; a: string }[] {
  const s = f.section;
  const b = fmtBand(f.band);
  const good =
    f.band >= 8
      ? "a very strong score: Band 8 and above is in the top range of the scale"
      : f.band >= 7
        ? "a good score: Band 7 and above meets most university and professional requirements"
        : f.band >= 6
          ? "a competent score: it meets many minimum requirements, but not most Band 7 targets"
          : "below the 6.0 most universities and visas ask for as a minimum";
  const faqs = [
    {
      q: `What band is ${f.score} out of 40 in ${s.long}?`,
      a: `${f.score} out of 40 in ${s.long} is Band ${b}. Any score from ${f.range.min} to ${f.range.max} gets the same band. ${s.note} Conversion tables are equated for each test version, so the cut-off can move by a mark either way.`,
    },
    {
      q: `Is ${f.score} out of 40 a good score in ${s.long}?`,
      a: `Band ${b} is ${good}. Requirements are almost always set per skill, so check the band your university or visa asks for in ${s.name} specifically, not just overall.`,
    },
  ];
  if (f.next) {
    faqs.push({
      q: `How many correct answers do I need for Band ${fmtBand(f.next.band)} in ${s.long}?`,
      a: `${f.next.min} out of 40. From ${f.score} that is ${f.next.more} more correct answer${f.next.more === 1 ? "" : "s"}.`,
    });
  }
  const other = f.others[0];
  faqs.push({
    q: `Is ${f.score}/40 the same band in ${other.name}?`,
    a: `No. ${f.score} out of 40 is Band ${fmtBand(other.band)} in ${other.name} and Band ${fmtBand(f.others[1].band)} in ${f.others[1].name}. Each section has its own conversion table.`,
  });
  return faqs;
}
