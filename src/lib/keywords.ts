/**
 * The long-tail keyword library.
 *
 * ── READ THIS BEFORE USING IT ───────────────────────────────────────────────
 * `<meta name="keywords">` has been ignored by Google since 2009 and carries a
 * trivial weight in Bing. Stuffing 400 terms into that tag ranks nothing. So
 * that is NOT what this file is for, even though `pageMeta()` does emit a small
 * slice of it (cheap, harmless, occasionally read by Bing/Yandex/Naver).
 *
 * What this file is actually for, in order of value:
 *
 *   1. PAGE INVENTORY. Every cluster below is a page that should exist, or a
 *      section inside one. A term with no page targeting it earns nothing. The
 *      clusters are sized so one page can own one cluster — that is the unit.
 *   2. ON-PAGE COPY. The terms are phrased the way people type them, so they
 *      drop into H2s, FAQ questions and first paragraphs without reading like
 *      keyword stuffing. Long-tail wins by matching phrasing, not by density.
 *   3. INTERNAL ANCHOR TEXT. Linking to /resources/writing with the anchor
 *      "IELTS Task 2 discussion essay structure" is worth more than "read more".
 *   4. AI / GEO SURFACES. ChatGPT, Perplexity and AI Overviews answer the
 *      question-shaped terms here directly. Pages that answer them in the first
 *      100 words get cited; pages that bury the answer do not.
 *
 * WHY LONG-TAIL. "IELTS practice test" is a head term owned by IDP, British
 * Council and ielts-up — a new domain will not touch page one for years. The
 * terms below are 3-9 words, low competition, and convert far better because
 * the intent is specific: someone searching "how to describe a bar chart in
 * IELTS writing task 1" is mid-preparation, not browsing.
 *
 * SIZE. ~430 terms across 22 clusters. Deliberately NOT deduplicated against
 * `KEYWORDS` in seo.ts — that file holds the head terms, this one holds the
 * tail, and a page usually wants a few of each.
 * ────────────────────────────────────────────────────────────────────────────
 */

/* ─────────────────────────── LISTENING ─────────────────────────── */

export const LISTENING_LONG_TAIL = [
  "IELTS listening practice test with answers and audio",
  "IELTS listening map labelling practice",
  "IELTS listening form completion practice",
  "IELTS listening multiple choice strategy",
  "IELTS listening matching questions practice",
  "IELTS listening plan map diagram labelling",
  "IELTS listening sentence completion tips",
  "IELTS listening note completion practice",
  "IELTS listening table completion exercises",
  "IELTS listening flow chart completion",
  "IELTS listening short answer questions practice",
  "how to improve IELTS listening from 6 to 7",
  "why do I lose marks in IELTS listening spelling",
  "IELTS listening section 4 monologue practice",
  "IELTS listening part 3 discussion practice",
  "IELTS listening distractors how to avoid",
  "IELTS listening accents Australian British practice",
  "IELTS listening transfer time computer delivered",
  "IELTS listening plural s common mistakes",
  "IELTS listening number and date dictation practice",
  "IELTS listening paraphrasing practice exercises",
  "IELTS listening prediction skills before audio plays",
  "IELTS listening band score 40 questions conversion",
  "free IELTS listening test online with instant score",
] as const;

/* ─────────────────────────── READING ─────────────────────────── */

export const READING_LONG_TAIL = [
  "IELTS reading true false not given practice exercises",
  "IELTS reading yes no not given difference",
  "IELTS reading matching headings practice with answers",
  "IELTS reading matching paragraph information practice",
  "IELTS reading matching features practice",
  "IELTS reading sentence completion practice",
  "IELTS reading summary completion with word list",
  "IELTS reading diagram label completion",
  "IELTS reading multiple choice technique",
  "IELTS reading short answer question practice",
  "how to finish IELTS reading in 60 minutes",
  "IELTS reading skimming and scanning practice",
  "IELTS academic reading passage 3 hardest tips",
  "IELTS general training reading section 1 practice",
  "IELTS general training reading advertisements practice",
  "IELTS reading band 8 how many correct answers",
  "IELTS reading time management strategy per passage",
  "IELTS reading not given vs false explained",
  "IELTS reading keyword table technique",
  "IELTS reading vocabulary for academic passages",
  "why is my IELTS reading stuck at 6.5",
  "IELTS reading practice test academic with answers pdf alternative",
  "IELTS reading paraphrase spotting exercises",
  "IELTS reading question order in passage",
] as const;

/* ─────────────────────── WRITING TASK 1 (ACADEMIC) ─────────────────────── */

export const WRITING_TASK1_LONG_TAIL = [
  "how to describe a bar chart in IELTS writing task 1",
  "IELTS writing task 1 line graph vocabulary",
  "IELTS writing task 1 pie chart sample answer band 9",
  "IELTS writing task 1 table description structure",
  "IELTS writing task 1 process diagram sample answer",
  "IELTS writing task 1 map changes over time vocabulary",
  "IELTS writing task 1 mixed chart how to structure",
  "IELTS task 1 overview paragraph what to include",
  "IELTS writing task 1 word count minimum 150",
  "IELTS task 1 introduction paraphrasing examples",
  "IELTS writing task 1 comparison language",
  "IELTS writing task 1 trend vocabulary increase decrease",
  "IELTS task 1 how many paragraphs",
  "IELTS writing task 1 grouping data for the overview",
  "IELTS task 1 passive voice for process diagrams",
  "IELTS writing task 1 percentage vs proportion language",
  "should I include numbers in IELTS task 1 overview",
  "IELTS task 1 band descriptors task achievement explained",
  "IELTS writing task 1 common mistakes band 6",
  "IELTS academic task 1 time management 20 minutes",
] as const;

/* ─────────────────────── WRITING TASK 1 (GENERAL LETTERS) ─────────────────────── */

export const WRITING_LETTER_LONG_TAIL = [
  "IELTS general training letter writing formal informal",
  "IELTS complaint letter sample band 9",
  "IELTS request letter structure general training",
  "IELTS apology letter sample answer",
  "IELTS job application letter IELTS general task 1",
  "IELTS letter to a friend informal opening lines",
  "IELTS semi formal letter when to use",
  "IELTS letter greeting Dear Sir or Madam rules",
  "IELTS general task 1 letter tone mistakes",
  "IELTS letter writing bullet points how to cover",
  "IELTS general training letter closing phrases",
  "IELTS letter writing 150 words how long",
] as const;

/* ─────────────────────── WRITING TASK 2 ─────────────────────── */

export const WRITING_TASK2_LONG_TAIL = [
  "IELTS writing task 2 discussion essay structure",
  "IELTS opinion essay agree or disagree structure",
  "IELTS advantages and disadvantages essay structure",
  "IELTS problem solution essay template band 9",
  "IELTS two part question essay how to answer",
  "IELTS writing task 2 introduction examples band 9",
  "IELTS task 2 conclusion how to write quickly",
  "IELTS essay topic sentence examples",
  "IELTS writing task 2 coherence and cohesion band 7",
  "IELTS lexical resource how to improve band 7",
  "IELTS writing task 2 grammatical range and accuracy tips",
  "IELTS task response what examiners look for",
  "how to write 250 words in 40 minutes IELTS",
  "IELTS writing task 2 linking words to avoid",
  "IELTS essay overusing furthermore moreover penalty",
  "IELTS writing task 2 examples how specific",
  "IELTS essay do I need statistics",
  "IELTS writing task 2 balanced discussion both views",
  "IELTS essay partial agreement how to phrase",
  "IELTS writing band 6.5 to 7 what changes",
  "why is my IELTS writing stuck at 6.5",
  "IELTS writing task 2 memorised phrases penalty",
  "IELTS essay paragraph length ideal",
  "IELTS writing task 2 education topic vocabulary",
  "IELTS writing task 2 environment topic ideas",
  "IELTS writing task 2 technology essay ideas",
  "IELTS writing task 2 crime and punishment vocabulary",
  "IELTS writing task 2 health topic ideas band 8",
  "IELTS writing task 2 government spending essay ideas",
  "IELTS writing task 2 globalisation essay vocabulary",
  "recent IELTS writing task 2 topics this month",
  "IELTS writing task 2 practice with AI feedback",
] as const;

/* ─────────────────────── SPEAKING ─────────────────────── */

export const SPEAKING_LONG_TAIL = [
  "IELTS speaking part 1 questions and answers work study",
  "IELTS speaking part 2 cue card describe a person",
  "IELTS speaking part 2 describe a place you visited",
  "IELTS speaking part 2 describe an object you own",
  "IELTS speaking part 2 describe an experience sample answer",
  "IELTS speaking part 3 abstract questions how to answer",
  "IELTS speaking cue card 1 minute preparation notes",
  "IELTS speaking how long should part 2 answer be",
  "IELTS speaking fluency and coherence band 7 tips",
  "IELTS speaking pronunciation band descriptors explained",
  "IELTS speaking lexical resource idiomatic language",
  "IELTS speaking grammatical range complex sentences",
  "IELTS speaking hesitation fillers how to reduce",
  "IELTS speaking accent does it matter",
  "IELTS speaking what if I don't know the topic",
  "IELTS speaking can I ask the examiner to repeat",
  "IELTS speaking part 1 hometown answers",
  "IELTS speaking part 1 hobbies sample answers",
  "IELTS speaking part 3 comparing past and present",
  "IELTS speaking practice with AI instant band score",
  "IELTS speaking mock test online with feedback",
  "recent IELTS speaking questions this month",
  "IELTS speaking test length and structure",
  "IELTS speaking how to extend short answers",
  "IELTS speaking topics list with model answers",
  "IELTS speaking part 2 follow up questions",
  "IELTS speaking band 6 to 7 what to change",
  "IELTS speaking self recording practice method",
] as const;

/* ─────────────────────── BAND TARGET INTENT ─────────────────────── */

export const BAND_TARGET_LONG_TAIL = [
  "how to get band 7 in IELTS in one month",
  "how to get band 8 in IELTS writing",
  "how to get band 9 in IELTS listening",
  "how to get band 6.5 in IELTS quickly",
  "how to get 7.5 in IELTS speaking",
  "IELTS band 7 in each module requirement",
  "IELTS band 6 is it good enough for university",
  "IELTS band 7.5 overall how to calculate",
  "how many correct answers for band 7 IELTS reading",
  "how many correct answers for band 8 IELTS listening",
  "IELTS band 5.5 to 6.5 study plan",
  "IELTS band 6.5 to 7.5 realistic timeline",
  "is IELTS band 8 hard to get",
  "IELTS band 9 percentage of test takers",
  "minimum IELTS band for masters in UK",
  "IELTS band requirement for Canada express entry",
  "IELTS band score for Australia PR points",
  "IELTS band score for New Zealand residence",
  "IELTS band 7 CLB 9 equivalent",
  "IELTS band score for US university admission",
] as const;

/* ─────────────────────── SCORING & CALCULATION ─────────────────────── */

export const SCORING_LONG_TAIL = [
  "IELTS band score calculator academic reading",
  "IELTS band score calculator general training reading",
  "IELTS listening raw score to band score chart",
  "how is IELTS overall band score rounded",
  "IELTS 6.25 rounds to which band",
  "IELTS 6.75 rounds up or down",
  "IELTS writing task 1 and task 2 weighting",
  "IELTS writing score calculation task 2 counts double",
  "IELTS speaking four criteria equal weighting",
  "IELTS band descriptors writing task 2 explained",
  "IELTS band descriptors speaking official explained",
  "IELTS half band scores how they work",
  "IELTS overall band score calculator all four skills",
  "IELTS academic vs general reading band difference",
  "why is general training reading scored harder",
  "IELTS score report form explained",
  "how long are IELTS scores valid",
  "IELTS enquiry on results remark worth it",
  "IELTS one skill retake how scoring works",
  "IELTS computer delivered results how many days",
] as const;

/* ─────────────────────── 2026 FORMAT / LOGISTICS ─────────────────────── */

export const FORMAT_2026_LONG_TAIL = [
  "IELTS 2026 format changes explained",
  "is paper based IELTS discontinued 2026",
  "IELTS one skill retake eligibility 2026",
  "IELTS writing on paper option which countries",
  "computer delivered IELTS what to expect",
  "IELTS on computer vs paper which is easier",
  "IELTS computer delivered typing speed matter",
  "IELTS computer test highlight and notes tools",
  "IELTS one skill retake how many times",
  "IELTS one skill retake cost and booking",
  "IELTS 2026 test day rules what to bring",
  "IELTS test centre vs IELTS online at home",
  "IELTS online test accepted by which universities",
  "IELTS UKVI vs IELTS academic difference",
  "IELTS life skills a1 b1 who needs it",
  "IELTS for UKVI test centre requirement",
] as const;

/* ─────────────────────── MODULE CHOICE ─────────────────────── */

export const MODULE_CHOICE_LONG_TAIL = [
  "IELTS academic or general training which one do I need",
  "IELTS general training for Canada immigration",
  "IELTS academic for university admission requirement",
  "can I switch from academic to general IELTS",
  "IELTS academic vs general training difficulty",
  "IELTS general training reading is it easier",
  "IELTS academic writing vs general writing difference",
  "IELTS for nursing NMC which module",
  "IELTS for Australian skilled migration module",
  "IELTS for UK student visa which test",
] as const;

/* ─────────────────────── COMPARISON / ALTERNATIVES ─────────────────────── */

export const COMPARISON_LONG_TAIL = [
  "IELTS vs TOEFL which is easier for me",
  "IELTS vs PTE academic score comparison",
  "IELTS vs Duolingo English test acceptance",
  "IELTS band 7 equivalent TOEFL score",
  "IELTS 6.5 equivalent PTE score",
  "IELTS vs Cambridge C1 advanced comparison",
  "which English test is cheapest for immigration",
  "IELTS or PTE for Australia PR",
  "IELTS or TOEFL for US universities",
  "IELTS to CEFR level mapping",
] as const;

/* ─────────────────────── STUDY PLANS & METHOD ─────────────────────── */

export const STUDY_PLAN_LONG_TAIL = [
  "IELTS study plan 30 days from scratch",
  "IELTS 2 week preparation plan band 7",
  "IELTS 3 month study plan working professional",
  "IELTS self study plan without coaching",
  "how many hours a day to prepare for IELTS",
  "IELTS preparation without joining an institute",
  "IELTS daily practice routine schedule",
  "how many mock tests before IELTS exam",
  "IELTS last week revision checklist",
  "IELTS preparation for beginners where to start",
  "IELTS study plan for band 8 in 6 weeks",
  "how to practise IELTS at home effectively",
  "IELTS practice test how often should I take",
  "IELTS preparation while working full time",
] as const;

/* ─────────────────────── VOCABULARY & GRAMMAR ─────────────────────── */

export const LANGUAGE_LONG_TAIL = [
  "IELTS vocabulary for band 7 writing",
  "academic collocations for IELTS writing task 2",
  "IELTS linking words list with examples",
  "complex sentence structures for IELTS writing",
  "IELTS grammar mistakes that cost band scores",
  "article usage a an the IELTS writing errors",
  "subject verb agreement IELTS writing common errors",
  "IELTS paraphrasing techniques with examples",
  "IELTS topic vocabulary environment education health",
  "how to avoid repetition in IELTS writing",
  "relative clauses for IELTS band 7 grammar",
  "conditional sentences IELTS speaking part 3",
  "IELTS synonyms list for common words",
  "formal vs informal vocabulary IELTS writing",
  "IELTS punctuation errors that lower your band",
] as const;

/* ─────────────────────── PROBLEM / DIAGNOSTIC INTENT ─────────────────────── */

export const PROBLEM_LONG_TAIL = [
  "why is my IELTS writing score always 6.5",
  "IELTS speaking score lower than expected reasons",
  "I keep getting 6.5 in IELTS what to do",
  "IELTS listening score dropped second attempt",
  "running out of time in IELTS reading fix",
  "IELTS writing task 2 off topic penalty",
  "IELTS under word count penalty how much",
  "IELTS writing memorised answer detection",
  "IELTS speaking too short answers penalty",
  "IELTS handwriting illegible marking",
  "IELTS test anxiety strategies exam day",
  "failed IELTS three times what am I doing wrong",
  "IELTS score not improving despite practice",
  "IELTS writing feedback where to get it free",
] as const;

/* ─────────────────────── AI / TOOL INTENT ─────────────────────── */

export const AI_TOOL_LONG_TAIL = [
  "AI IELTS writing checker with band score",
  "IELTS essay checker free instant feedback",
  "IELTS speaking AI evaluation with pronunciation score",
  "IELTS writing correction online band descriptors",
  "AI IELTS band predictor accuracy",
  "IELTS essay grader like a real examiner",
  "IELTS writing task 2 evaluation online free",
  "instant IELTS band score for my essay",
  "IELTS speaking practice app with AI examiner",
  "IELTS mock test with automatic scoring",
  "IELTS practice platform with AI feedback",
  "IELTS writing sample corrected by AI band 7",
] as const;

/* ─────────────────────── COST / BOOKING ─────────────────────── */

export const LOGISTICS_LONG_TAIL = [
  "how to book IELTS test online step by step",
  "IELTS test fee this year by country",
  "IELTS test dates how far in advance to book",
  "IELTS reschedule test date policy",
  "IELTS cancellation refund policy",
  "IELTS test day what documents to bring",
  "IELTS test centre rules phone and watch",
  "IELTS results how to check online",
  "IELTS test report form sending to universities",
  "IELTS retake how soon can I book again",
] as const;

/* ─────────────────────── FREE / PRACTICE MATERIAL INTENT ─────────────────────── */

export const PRACTICE_MATERIAL_LONG_TAIL = [
  "free IELTS mock test online full length",
  "IELTS practice test online with instant results",
  "full length IELTS test simulation timed",
  "IELTS section wise practice tests online",
  "IELTS listening practice tests with transcripts",
  "IELTS reading practice passages with explanations",
  "IELTS writing practice questions with model answers",
  "IELTS speaking practice questions with recordings",
  "IELTS practice questions by question type",
  "IELTS academic practice test free no signup",
  "IELTS general training practice test online free",
  "unlimited IELTS practice questions online",
  "IELTS question bank academic and general",
  "IELTS practice test that feels like the real exam",
] as const;

/* ─────────────────────── ENTIRE LIBRARY ─────────────────────── */

/**
 * Every cluster, keyed so a page can pull exactly the set it targets:
 *   keywords: [...LONG_TAIL.writingTask2, ...LONG_TAIL.aiTools]
 *
 * Keep clusters intact when you pull them. Cherry-picking three terms out of a
 * cluster and scattering them across four pages is how you build four pages that
 * all rank for nothing — one page per cluster is the whole point.
 */
export const LONG_TAIL = {
  listening: LISTENING_LONG_TAIL,
  reading: READING_LONG_TAIL,
  writingTask1: WRITING_TASK1_LONG_TAIL,
  writingLetters: WRITING_LETTER_LONG_TAIL,
  writingTask2: WRITING_TASK2_LONG_TAIL,
  speaking: SPEAKING_LONG_TAIL,
  bandTargets: BAND_TARGET_LONG_TAIL,
  scoring: SCORING_LONG_TAIL,
  format2026: FORMAT_2026_LONG_TAIL,
  moduleChoice: MODULE_CHOICE_LONG_TAIL,
  comparison: COMPARISON_LONG_TAIL,
  studyPlans: STUDY_PLAN_LONG_TAIL,
  language: LANGUAGE_LONG_TAIL,
  problems: PROBLEM_LONG_TAIL,
  aiTools: AI_TOOL_LONG_TAIL,
  logistics: LOGISTICS_LONG_TAIL,
  practiceMaterial: PRACTICE_MATERIAL_LONG_TAIL,
} as const;

/** Flat list of every long-tail term. Used by the coverage audit script. */
export const ALL_LONG_TAIL: readonly string[] = Object.values(LONG_TAIL).flat();

/**
 * Trim a keyword set for the `<meta name="keywords">` tag.
 *
 * The tag is worth so little that a 400-term list in it is pure page weight —
 * and page weight was already flagged (109KB HTML). Twelve terms is enough for
 * the engines that still read it, so pages pass the full cluster to `pageMeta()`
 * for readability and this caps what actually ships.
 */
export function metaKeywordSlice(terms: readonly string[], limit = 12): string[] {
  return [...new Set(terms)].slice(0, limit);
}
