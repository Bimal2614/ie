/**
 * Blog content. Real, useful IELTS articles as data — add entries here and both
 * the index and the article page pick them up. Newest first.
 */

export type BlogSection = { heading?: string; paragraphs?: string[]; bullets?: string[] };
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // display string
  readMins: number;
  sections: BlogSection[];
};

export const POSTS: BlogPost[] = [
  {
    slug: "how-ielts-band-score-is-calculated",
    title: "How the IELTS band score is calculated — and how to raise it",
    excerpt: "The 9-band scale, how each section is scored, how the overall band is rounded, and where the easiest half-bands hide.",
    category: "Scoring",
    date: "July 2026",
    readMins: 6,
    sections: [
      { paragraphs: ["IELTS reports scores on a 9-band scale, from Band 1 (non-user) to Band 9 (expert). You receive a band for each of the four skills — Listening, Reading, Writing and Speaking — plus an overall band. Understanding exactly how those numbers are produced is the fastest way to stop losing marks you don't need to."] },
      { heading: "Listening and Reading: raw score → band", paragraphs: ["Both are marked out of 40. Your raw score (the number of correct answers) is converted to a band using a fixed conversion table. As a rough guide, around 30/40 maps to Band 7 and 35/40 to Band 8, though the exact table varies slightly by test. Every mark counts, and spelling and grammar must be correct."] },
      { heading: "Writing and Speaking: four criteria", paragraphs: ["These are marked by criteria, each weighted equally:"], bullets: ["Task Achievement / Task Response", "Coherence & Cohesion (Fluency & Coherence in Speaking)", "Lexical Resource", "Grammatical Range & Accuracy (plus Pronunciation in Speaking)"] },
      { heading: "How the overall band is rounded", paragraphs: ["Your overall band is the average of the four skill bands, rounded to the nearest half-band. A .25 average rounds up to the next half-band, and .75 rounds up to the next whole band. So a 6.75 average becomes 7.0 — meaning a single half-band in your weakest skill can lift your overall score.", "Within Writing, Task 2 counts twice as much as Task 1, so protect your Task 2 time."] },
      { heading: "Where the easiest half-bands hide", bullets: ["Listening/Reading: fix careless spelling and word-limit errors — pure lost marks.", "Writing: add a clear overview (Task 1) and a consistent position (Task 2).", "Speaking: extend every answer with a reason and an example.", "Target your weakest skill — rounding rewards lifting the lowest number."] },
    ],
  },
  {
    slug: "writing-mistakes-stuck-at-6-5",
    title: "7 mistakes that keep you stuck at Band 6.5 in Writing",
    excerpt: "The recurring habits that cap fluent writers at 6.5 — and the specific fixes that move you to 7 and beyond.",
    category: "Writing",
    date: "July 2026",
    readMins: 7,
    sections: [
      { paragraphs: ["Most people stuck at 6.5 in Writing are not weak at English — they're making a handful of predictable, fixable errors against the band descriptors. Here are the seven that matter most."] },
      { heading: "1. No clear position (Task 2)", paragraphs: ["If the question asks your opinion, state it in the introduction and hold it to the conclusion. Sitting on the fence caps Task Response."] },
      { heading: "2. No overview (Task 1)", paragraphs: ["A data-free sentence naming the main trends is the single most important line in Task 1. Without it, you're capped at Band 6 no matter how accurate your figures are."] },
      { heading: "3. Under-developed ideas", paragraphs: ["A reason with no explanation or example is a listed idea, not a developed one. Follow topic sentence → explain → example → link back."] },
      { heading: "4. Memorised phrases and templates", paragraphs: ["Examiners spot 'It is a well-known fact that…' openers instantly and penalise memorised, off-topic language. Write to the specific question."] },
      { heading: "5. Mechanical linking", paragraphs: ["'Firstly, Secondly, Moreover, In conclusion' on every sentence signals weak cohesion, not strong. Link ideas naturally and vary connectors."] },
      { heading: "6. Repetitive vocabulary", paragraphs: ["Reusing the same words (especially the topic's keywords) limits Lexical Resource. Paraphrase and use precise collocations — not rare 'big words' used wrongly."] },
      { heading: "7. Ignoring proofreading", paragraphs: ["Articles, subject–verb agreement, plurals and tense slips add up. Leave three minutes to check — it's the cheapest half-band available."] },
    ],
  },
  {
    slug: "ielts-4-week-study-plan",
    title: "How to prepare for IELTS in 4 weeks: a realistic plan",
    excerpt: "A week-by-week plan that diagnoses your weak spots, drills the right question types, and builds exam stamina with mock tests.",
    category: "Study plan",
    date: "July 2026",
    readMins: 8,
    sections: [
      { paragraphs: ["Four weeks is enough to make a real difference if you spend it on the right things: your weakest skill, the specific question types you lose marks on, and full timed practice. Here's a realistic structure."] },
      { heading: "Week 1 — Diagnose and learn the format", paragraphs: ["Take one timed practice test per skill to find your baseline and weakest areas. Learn the exact question types and marking criteria — you can't fix what you don't understand. End the week knowing your target band and your two weakest skills."] },
      { heading: "Week 2 — Drill weak question types", paragraphs: ["Focus daily practice on the specific types costing you marks (e.g. True/False/Not Given, matching headings, Task 1 overviews). Use instant feedback to correct patterns, not just to see a score."] },
      { heading: "Week 3 — Productive skills under time", paragraphs: ["Write and speak daily under timed conditions with AI band feedback. Build templates you can adapt (not memorise), and log your recurring errors so you stop repeating them."] },
      { heading: "Week 4 — Full mocks and exam stamina", paragraphs: ["Sit full-length mock tests on real timing to build endurance and iron out pacing. Review every mistake, do light targeted practice on your weakest type, and rest before test day."] },
      { heading: "Daily habits that compound", bullets: ["Practise Listening with a single play, never replaying.", "Keep an error log and review it before each session.", "Read/listen to English daily for range and speed.", "Sit at least two full mock tests before the real exam."] },
    ],
  },
];

export const POST_BY_SLUG = Object.fromEntries(POSTS.map((p) => [p.slug, p])) as Record<string, BlogPost>;
