/**
 * Programmatic SEO content for "How to get Band N in IELTS" pages. Targets
 * high-intent queries (ielts band 7, how to get band 8 in ielts, etc.). One
 * entry per band → one page at /ielts-band-[slug].
 */

export type BandSkill = { key: "listening" | "reading" | "writing" | "speaking"; name: string; takes: string; tips: string[] };
export type BandGuide = {
  slug: string; // URL slug, e.g. "7" or "6-5"
  band: string; // display, e.g. "7" or "6.5"
  meaning: string;
  who: string;
  overall: string;
  raw: { listening: string; reading: string };
  skills: BandSkill[];
  misses: string[];
};

const SKILL_NAMES = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" } as const;

/** Per-band raw-score targets for Listening/Reading (out of 40) — approximate. */
const RAW: Record<string, { listening: string; reading: string }> = {
  "6-5": { listening: "23–25 / 40", reading: "23–26 / 40 (Academic)" },
  "7": { listening: "30 / 40", reading: "30 / 40 (Academic)" },
  "8": { listening: "35 / 40", reading: "35 / 40 (Academic)" },
  "9": { listening: "39 / 40", reading: "39 / 40 (Academic)" },
};

const CONFIG: { slug: string; band: string; meaning: string; who: string; overall: string;
  takes: Record<BandSkill["key"], string>; tips: Record<BandSkill["key"], string[]>; misses: string[] }[] = [
  {
    slug: "6-5", band: "6.5",
    meaning: "a 'competent' user — generally effective command of English with some inaccuracies.",
    who: "the common minimum for many undergraduate courses and some visa categories.",
    overall: "an average of 6.5 across the four skills (e.g. 6, 7, 6.5, 6.5).",
    takes: {
      listening: "Around 23–25 correct out of 40 — solid on completion tasks, most multiple choice.",
      reading: "Around 23–26 correct — reliable on True/False/Not Given and completion.",
      writing: "A clear response to the task with an overview (Task 1) and a position (Task 2), organised paragraphs, and errors that don't impede meaning.",
      speaking: "Extended answers with a mix of tenses; some hesitation and errors are fine if meaning is clear.",
    },
    tips: {
      listening: ["Nail the completion tasks — they're the most predictable marks.", "Predict answer types in the pre-section pause."],
      reading: ["Master True/False/Not Given — it's often a third of the paper.", "Don't over-run one passage; flag and move on."],
      writing: ["Always include a Task 1 overview and a clear Task 2 position.", "One idea per paragraph with a topic sentence."],
      speaking: ["Never give one-word answers — add a reason and example.", "Keep talking through Part 2's full two minutes."],
    },
    misses: ["Losing easy marks to spelling and word-limit errors in Listening/Reading.", "No overview in Task 1, or no clear opinion in Task 2."],
  },
  {
    slug: "7", band: "7",
    meaning: "a 'good' user — operational command with occasional inaccuracies and misunderstandings.",
    who: "the most requested band for skilled migration and competitive university courses.",
    overall: "an average of 7.0, usually with no skill far below 6.5.",
    takes: {
      listening: "Around 30 / 40 — accurate across all question types, few careless slips.",
      reading: "Around 30 / 40 — confident with paraphrase and inference, good pacing.",
      writing: "A fully-developed response, clear progression, a good range of vocabulary and structures, with the majority of sentences error-free.",
      speaking: "Fluent, developed answers, a range of structures and some less-common vocabulary, with only occasional errors.",
    },
    tips: {
      listening: ["Train with a single play — no replays.", "Learn to hear paraphrase, not keyword matches."],
      reading: ["Build synonym awareness — answers are reworded.", "Keep to ~20 minutes per passage; transfer as you go."],
      writing: ["Develop ideas fully: topic sentence → explain → example → link.", "Vary complex structures and use precise collocations, not memorised phrases."],
      speaking: ["Extend with reasons and examples; use idioms naturally.", "Prioritise fluency — keep going rather than freezing to self-correct."],
    },
    misses: ["Under-developed Task 2 ideas (listed, not explained).", "Repetitive vocabulary and mechanical linking.", "Careless Listening/Reading errors dragging one skill below 6.5."],
  },
  {
    slug: "8", band: "8",
    meaning: "a 'very good' user — fully operational command with only occasional unsystematic inaccuracies.",
    who: "a strong score for elite universities, professional registration, and standing out in migration.",
    overall: "an average of 8.0, with no skill much below 7.5.",
    takes: {
      listening: "Around 35 / 40 — near-flawless, losing only the hardest distractor items.",
      reading: "Around 35 / 40 — fast, accurate, comfortable with dense academic text.",
      writing: "A well-developed, precisely-worded response with a wide range of structures and only occasional slips.",
      speaking: "Fluent with ease, wide and flexible vocabulary, and a wide range of structures used accurately.",
    },
    tips: {
      listening: ["Drill the specific distractor patterns (corrections, negatives).", "Eliminate every avoidable spelling/transfer error."],
      reading: ["Read widely (journals, quality press) to raise reading speed.", "Master the trickier types: matching headings, matching information."],
      writing: ["Aim for precision and natural collocation over 'big words'.", "Keep cohesion invisible — link ideas, don't signpost every sentence."],
      speaking: ["Speak at length effortlessly; use precise, topic-specific vocabulary.", "Show range of intonation and stress — clarity, not accent."],
    },
    misses: ["Occasional imprecise word choice capping Lexical Resource.", "A single weaker skill pulling the average below 8.0."],
  },
  {
    slug: "9", band: "9",
    meaning: "an 'expert' user — fully operational command: appropriate, accurate and fluent, with complete understanding.",
    who: "the maximum score — near-native, sought by a small number of candidates and for perfect scores.",
    overall: "an average of 9.0 (or 8.75+, which rounds to 9.0).",
    takes: {
      listening: "Around 39 / 40 — effectively perfect comprehension under a single play.",
      reading: "Around 39 / 40 — complete, rapid understanding of complex text.",
      writing: "A fully-extended, natural response with a wide range of structures and virtually no errors.",
      speaking: "Effortless, natural fluency with fully flexible, precise language and pronunciation that never strains the listener.",
    },
    tips: {
      listening: ["Practise with fast, accented native audio (podcasts, lectures).", "Zero avoidable errors — accuracy is everything at this level."],
      reading: ["Read complex academic and literary texts daily for speed and nuance.", "Handle every question type with time to spare."],
      writing: ["Write with the precision and natural flow of a well-educated native.", "Errors must be rare and truly incidental."],
      speaking: ["Sound natural and spontaneous — idiomatic, precise, wholly fluent.", "Develop every answer with nuance and a clear point of view."],
    },
    misses: ["Any recurring error pattern — Band 9 tolerates only occasional slips.", "Sounding rehearsed rather than natural and spontaneous."],
  },
];

export const BANDS: Record<string, BandGuide> = Object.fromEntries(
  CONFIG.map((c) => [
    c.slug,
    {
      slug: c.slug,
      band: c.band,
      meaning: c.meaning,
      who: c.who,
      overall: c.overall,
      raw: RAW[c.slug],
      skills: (Object.keys(SKILL_NAMES) as BandSkill["key"][]).map((k) => ({
        key: k,
        name: SKILL_NAMES[k],
        takes: c.takes[k],
        tips: c.tips[k],
      })),
      misses: c.misses,
    },
  ]),
);

export const BAND_SLUGS = CONFIG.map((c) => c.slug);
