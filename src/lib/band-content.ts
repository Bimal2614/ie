/**
 * Programmatic SEO content for "How to get Band N in IELTS" pages. Targets
 * high-intent queries (ielts band 7, how to get band 8 in ielts, etc.). One
 * entry per band → one page at /ielts-band/[slug].
 *
 * SOURCING. The `accepted` entries state real 2026 requirements and are the
 * part of this file most likely to go stale, so they are the part to re-check
 * first. As of August 2026:
 *   - UK: the first-time Skilled Worker / Scale-up / High Potential Individual
 *     English requirement rose from B1 to B2 on 8 January 2026 — IELTS for UKVI
 *     5.5 in EVERY skill, not an overall average. UKVI IELTS moved to
 *     computer-only delivery on 22 March 2026.
 *   - Canada: Express Entry uses IELTS General Training only. CLB 9 = Listening
 *     8.0, Reading 7.0, Writing 7.0, Speaking 7.0. CLB 8 = Listening 7.5,
 *     Reading 6.5, Writing 6.5, Speaking 6.5. Listening is the strictest skill
 *     in the mapping, which is why a flat band often lands a level lower than
 *     candidates expect.
 *   - Australia: Competent English 6.0 in each skill (0 points), Proficient 7.0
 *     in each (10 points), Superior 8.0 in each (20 points). Per skill, never
 *     an average.
 *
 * Raw-score conversions are approximations by design: the official mapping
 * shifts slightly between papers to hold difficulty constant, so a fixed table
 * would be wrong to state as exact. Every page says so.
 */

export type BandSkill = { key: "listening" | "reading" | "writing" | "speaking"; name: string; takes: string; tips: string[] };

/** A realistic timeline to this band from a given starting point. */
export type BandJourney = { from: string; weeks: string; focus: string };

/** Where this band actually gets you. Verified against 2026 requirements. */
export type BandAcceptance = { context: string; detail: string; enough: "yes" | "partly" | "no" };

export type BandGuide = {
  slug: string; // URL slug, e.g. "7" or "6-5"
  band: string; // display, e.g. "7" or "6.5"
  meaning: string;
  who: string;
  overall: string;
  raw: { listening: string; reading: string };
  skills: BandSkill[];
  misses: string[];
  journey: BandJourney[];
  accepted: BandAcceptance[];
  /** What computer-delivered IELTS changes at this level specifically. */
  onScreen: string;
  /** How to use One Skill Retake at this band. */
  retake: string;
  /** Rendered as a visible Q&A block and as FAQPage structured data. */
  faqs: { q: string; a: string }[];
};

const SKILL_NAMES = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" } as const;

/** Per-band raw-score targets for Listening/Reading (out of 40) — approximate. */
const RAW: Record<string, { listening: string; reading: string }> = {
  "6-5": { listening: "23-25 / 40", reading: "23-26 / 40 (Academic)" },
  "7": { listening: "30 / 40", reading: "30 / 40 (Academic)" },
  "8": { listening: "35 / 40", reading: "35 / 40 (Academic)" },
  "9": { listening: "39 / 40", reading: "39 / 40 (Academic)" },
};

const CONFIG: { slug: string; band: string; meaning: string; who: string; overall: string;
  takes: Record<BandSkill["key"], string>; tips: Record<BandSkill["key"], string[]>; misses: string[];
  journey: BandJourney[]; accepted: BandAcceptance[]; onScreen: string; retake: string;
  faqs: { q: string; a: string }[] }[] = [
  {
    slug: "6-5", band: "6.5",
    meaning: "a 'competent' user: generally effective command of English with some inaccuracies.",
    who: "the common minimum for many undergraduate courses and some visa categories.",
    overall: "an average of 6.5 across the four skills (e.g. 6, 7, 6.5, 6.5).",
    takes: {
      listening: "Around 23-25 correct out of 40: solid on completion tasks, most multiple choice.",
      reading: "Around 23-26 correct: reliable on True/False/Not Given and completion.",
      writing: "A clear response to the task with an overview (Task 1) and a position (Task 2), organised paragraphs, and errors that don't impede meaning.",
      speaking: "Extended answers with a mix of tenses; some hesitation and errors are fine if meaning is clear.",
    },
    tips: {
      listening: ["Nail the completion tasks: they're the most predictable marks.", "Predict answer types in the pre-section pause."],
      reading: ["Master True/False/Not Given: it's often a third of the paper.", "Don't over-run one passage; flag and move on."],
      writing: ["Always include a Task 1 overview and a clear Task 2 position.", "One idea per paragraph with a topic sentence."],
      speaking: ["Never give one-word answers: add a reason and example.", "Keep talking through Part 2's full two minutes."],
    },
    misses: ["Losing easy marks to spelling and word-limit errors in Listening/Reading.", "No overview in Task 1, or no clear opinion in Task 2."],
    journey: [
      { from: "Band 5.0", weeks: "12-16 weeks", focus: "Accuracy before ambition. At 5.0 the ceiling is almost never vocabulary; it is grammar you can recognise but cannot yet produce reliably under time, plus Listening and Reading marks given away to spelling and word-limit slips. Fix those two and 6.0 arrives faster than most people expect." },
      { from: "Band 5.5", weeks: "8-12 weeks", focus: "Structure. A 5.5 Writing script usually has ideas but no controlled shape: no Task 1 overview, or a Task 2 position that shifts between paragraphs. Learning one reliable structure per task type is worth more here than any amount of new vocabulary." },
      { from: "Band 6.0", weeks: "4-6 weeks", focus: "One skill, not four. At 6.0 the average is usually held down by a single skill sitting at 5.5. Find it with a diagnostic, drill only that, and let the rounding do the rest - moving one skill from 5.5 to 7.0 lifts the overall average by nearly 0.4." },
    ],
    accepted: [
      { context: "Undergraduate and taught postgraduate study", detail: "6.5 overall with no band below 6.0 is the single most common entry requirement across UK and Australian universities. Check the per-skill minimum as well as the overall - a 7.0 average with 5.5 in Writing is refused where a flat 6.5 is accepted.", enough: "yes" },
      { context: "UK Skilled Worker visa", detail: "Clears it comfortably. From 8 January 2026 the requirement rose from B1 to B2 for first-time Skilled Worker, Scale-up and High Potential Individual applicants - that is IELTS for UKVI 5.5 in every skill, and the benchmark is per skill, not an overall average.", enough: "yes" },
      { context: "Canada Express Entry (CLB 8)", detail: "Not quite. On General Training, CLB 8 needs Listening 7.5, Reading 6.5, Writing 6.5 and Speaking 6.5. A flat 6.5 leaves you at CLB 7 because Listening is the strictest skill in the mapping. CLB 7 (6.0 in every skill) is the usual minimum to enter the pool.", enough: "partly" },
      { context: "Australia skilled migration", detail: "Above the Competent English floor of 6.0 in each skill, but worth zero points. Proficient English needs 7.0 in every skill for 10 points, and Superior English needs 8.0 in every skill for 20.", enough: "partly" },
    ],
    onScreen: "Computer-delivered Listening gives you roughly two minutes to check answers at the end, not the ten-minute transfer window paper allowed. At 6.5 that removes the safety net most candidates at this level were relying on to fix spelling. Type the answer correctly the first time, and practise the completion tasks on screen rather than on paper.",
    retake: "One Skill Retake is at its most valuable at this level, because a single weak skill is usually what is holding the average down. Sit the full test, find the skill sitting a band below the others, drill it for four to six weeks, then re-sit only that skill within 60 days. It only applies to computer-delivered IELTS, must be taken in the same country as the original test, and can be used once per full test.",
    faqs: [
      { q: "How many correct answers do I need for Band 6.5 in IELTS Reading?", a: "Roughly 23-26 out of 40 on Academic Reading, and around 30 out of 40 on General Training Reading, which is marked to a stricter curve. Listening needs about 23-25 out of 40 in either module. These are close approximations - the exact conversion shifts slightly between papers to keep difficulty comparable." },
      { q: "Is Band 6.5 good enough for a UK university?", a: "For most taught undergraduate and master's courses, yes: 6.5 overall with no band below 6.0 is the standard requirement. Competitive courses, and law, medicine, journalism and teaching in particular, often ask for 7.0 or higher with per-skill minimums." },
      { q: "How long does it take to go from 5.5 to 6.5 in IELTS?", a: "Eight to twelve weeks of consistent, targeted practice is realistic for most candidates. The variable is not study hours but whether the practice is diagnosed - people who drill their weakest question types move roughly twice as fast as people who take full mock tests repeatedly without analysing them." },
      { q: "Can I get 6.5 overall with a 6.0 in Writing?", a: "Yes, arithmetically: 7, 7, 6, 6.5 averages to 6.625, which rounds up to 6.5. Whether it is accepted is a separate question - many universities and every visa category that specifies per-skill minimums will reject it regardless of the overall. Always read the per-skill requirement before deciding a band is enough." },
    ],
  },
  {
    slug: "7", band: "7",
    meaning: "a 'good' user: operational command with occasional inaccuracies and misunderstandings.",
    who: "the most requested band for skilled migration and competitive university courses.",
    overall: "an average of 7.0, usually with no skill far below 6.5.",
    takes: {
      listening: "Around 30 / 40: accurate across all question types, few careless slips.",
      reading: "Around 30 / 40: confident with paraphrase and inference, good pacing.",
      writing: "A fully-developed response, clear progression, a good range of vocabulary and structures, with the majority of sentences error-free.",
      speaking: "Fluent, developed answers, a range of structures and some less-common vocabulary, with only occasional errors.",
    },
    tips: {
      listening: ["Train with a single play: no replays.", "Learn to hear paraphrase, not keyword matches."],
      reading: ["Build synonym awareness: answers are reworded.", "Keep to ~20 minutes per passage; transfer as you go."],
      writing: ["Develop ideas fully: topic sentence → explain → example → link.", "Vary complex structures and use precise collocations, not memorised phrases."],
      speaking: ["Extend with reasons and examples; use idioms naturally.", "Prioritise fluency: keep going rather than freezing to self-correct."],
    },
    misses: ["Under-developed Task 2 ideas (listed, not explained).", "Repetitive vocabulary and mechanical linking.", "Careless Listening/Reading errors dragging one skill below 6.5."],
    journey: [
      { from: "Band 6.0", weeks: "12-16 weeks", focus: "The jump from 6.0 to 7.0 is the hardest single step in IELTS, because 6.0 rewards being understood and 7.0 rewards being precise. Expect to rebuild Writing from the paragraph up: one central idea per paragraph, developed with explanation and a specific example rather than a list of assertions." },
      { from: "Band 6.5", weeks: "6-10 weeks", focus: "Range with accuracy. At 6.5 most candidates already use complex structures; what caps them is that the complex sentences carry the errors. Deliberately write the structures you find risky, get them corrected, and repeat until the majority of your sentences are error-free - that phrase is the actual Band 7 descriptor." },
      { from: "Band 6.5 with one weak skill", weeks: "4-6 weeks", focus: "If three skills are already at 7.0 and one sits at 6.0, this is a One Skill Retake problem, not a study-plan problem. Drill the single skill and re-sit it alone." },
    ],
    accepted: [
      { context: "Australia skilled migration - Proficient English", detail: "7.0 in every skill earns 10 points on the SkillSelect points test. The per-skill wording matters more here than anywhere: an overall 7.5 with Writing at 6.5 is not Proficient English and earns nothing. Those 10 points are worth roughly several years of skilled work experience.", enough: "yes" },
      { context: "Canada Express Entry (CLB 9)", detail: "Almost. CLB 9 on General Training needs Listening 8.0, Reading 7.0, Writing 7.0 and Speaking 7.0. A flat 7.0 gives you CLB 8 overall because Listening falls short - and Listening is usually the easiest of the four to lift half a band, which makes it the highest-return skill to target.", enough: "partly" },
      { context: "Competitive university courses", detail: "7.0 overall with no band below 6.5 is the common bar for law, medicine, journalism, teaching and most PhD programmes, and for many Russell Group and Group of Eight departments regardless of subject.", enough: "yes" },
      { context: "Professional registration", detail: "Many nursing, medical and engineering registration bodies set 7.0 per skill. Several accept an average across two test sittings within six months - check whether yours does before paying for a full retake.", enough: "yes" },
    ],
    onScreen: "At Band 7 the on-screen format starts to help rather than hurt. Editing a Task 2 essay in a text box is far faster than re-drafting by hand, so the candidates who plan for two minutes and then revise for five now finish comfortably. The cost sits in Reading: you cannot annotate a passage with a pencil, so build the habit of using the on-screen highlight and note tools in every practice session rather than discovering them on test day.",
    retake: "This is the band where One Skill Retake changes strategy the most, because Band 7 is so often required in every skill rather than overall. If you sit a 7.5, 7.5, 7.0, 6.5, a retake of that one 6.5 is dramatically cheaper and faster than another full test. Book it within 60 days of the original, in the same country, and confirm first that your university or visa authority accepts a One Skill Retake Test Report Form - acceptance is broad but not universal.",
    faqs: [
      { q: "How many correct answers do I need for Band 7 in IELTS?", a: "About 30 out of 40 in Listening, and about 30 out of 40 in Academic Reading. General Training Reading is marked more strictly and needs around 34 out of 40 for the same band. Writing and Speaking are not raw-score based - they are judged against four band descriptors, each weighted equally." },
      { q: "Why is my IELTS Writing stuck at 6.5?", a: "Almost always one of three things: ideas that are listed rather than developed, so Task Response caps at 6; mechanical linking - a Firstly, Moreover, In conclusion scaffold that signposts every sentence and reads as memorised; or complex sentences that carry most of your errors, which caps Grammatical Range and Accuracy. Band 7 asks that the majority of sentences be error-free, so writing slightly simpler sentences accurately often scores higher than writing ambitious ones with mistakes." },
      { q: "How long does it take to go from 6.5 to 7 in IELTS?", a: "Six to ten weeks of targeted work for most candidates, and longer if Writing is the weak skill - Writing is the slowest of the four to move because it needs corrected feedback rather than repetition. Listening and Reading respond fastest, often within a month, because their gains come from technique and accuracy rather than from language range." },
      { q: "Is Band 7 hard to get?", a: "It is the band where the criteria change character. Up to 6.5 you are rewarded for communicating clearly; from 7.0 you are rewarded for precision, range and control. That is why so many fluent, confident speakers plateau at 6.5 - fluency alone stops earning marks, and accuracy starts." },
    ],
  },
  {
    slug: "8", band: "8",
    meaning: "a 'very good' user: fully operational command with only occasional unsystematic inaccuracies.",
    who: "a strong score for elite universities, professional registration, and standing out in migration.",
    overall: "an average of 8.0, with no skill much below 7.5.",
    takes: {
      listening: "Around 35 / 40: near-flawless, losing only the hardest distractor items.",
      reading: "Around 35 / 40: fast, accurate, comfortable with dense academic text.",
      writing: "A well-developed, precisely-worded response with a wide range of structures and only occasional slips.",
      speaking: "Fluent with ease, wide and flexible vocabulary, and a wide range of structures used accurately.",
    },
    tips: {
      listening: ["Drill the specific distractor patterns (corrections, negatives).", "Eliminate every avoidable spelling/transfer error."],
      reading: ["Read widely (journals, quality press) to raise reading speed.", "Master the trickier types: matching headings, matching information."],
      writing: ["Aim for precision and natural collocation over 'big words'.", "Keep cohesion invisible: link ideas, don't signpost every sentence."],
      speaking: ["Speak at length effortlessly; use precise, topic-specific vocabulary.", "Show range of intonation and stress: clarity, not accent."],
    },
    misses: ["Occasional imprecise word choice capping Lexical Resource.", "A single weaker skill pulling the average below 8.0."],
    journey: [
      { from: "Band 7.0", weeks: "10-16 weeks", focus: "Precision, not more vocabulary. At 7.0 the errors left are a small, repeating set - articles, prepositions, plural agreement, one or two collocations you have been using wrongly for years. Band 8 tolerates only occasional, unsystematic slips, so the work is identifying your personal error pattern and drilling it out, which needs corrected writing rather than more reading." },
      { from: "Band 7.5", weeks: "6-10 weeks", focus: "The last half band is usually Lexical Resource. Band 8 wants a wide, flexible range used naturally; what caps most 7.5 scripts is an almost-right word choice - a collocation that a native speaker would not pair. Read heavily in the topic areas IELTS reuses and collect phrasing, not synonyms." },
      { from: "7.5 with one weak skill", weeks: "4-8 weeks", focus: "At this level Listening and Reading are the realistic targets for a single-skill push: both can reach 8.0 through pure accuracy work, whereas Writing at 8.0 needs a change in how you write, not how carefully." },
    ],
    accepted: [
      { context: "Australia skilled migration - Superior English", detail: "8.0 in every skill is Superior English: 20 points on the SkillSelect points test, the largest single English award available and 20 more than Competent English. In a competitive occupation ceiling this is often the difference between an invitation and an indefinite wait.", enough: "yes" },
      { context: "Canada Express Entry - maximum CRS language points", detail: "CLB 10 and above is where per-skill CRS language points top out. On General Training that is Listening 8.5, Reading 8.0, Writing 7.5 and Speaking 7.5, so a flat 8.0 already earns close to the maximum in three skills.", enough: "yes" },
      { context: "Elite university admission", detail: "Oxford, Cambridge and a small number of departments elsewhere set a higher tier of around 7.5 overall with 7.0 in each skill; 8.0 sits clearly above it. For most applicants at this level the score has stopped being the constraint.", enough: "yes" },
      { context: "Professional registration and teaching", detail: "Some medical, nursing and academic-teaching bodies require 8.0 in Speaking or Writing specifically, even where the overall requirement is lower. Check which skill your body singles out - it is frequently Writing.", enough: "yes" },
    ],
    onScreen: "The on-screen format is a mild advantage at Band 8 and the reason is mechanical: at this level you have the time to revise, and revising in a text box is faster than on paper. The one genuine risk is Listening. The two-minute check window at the end is short, and at 8.0 you are aiming to lose no more than five marks across forty questions, so a single mistyped answer that you would have caught in a ten-minute transfer now costs you the band.",
    retake: "Use it surgically. At 7.5 overall with one skill at 7.0, a One Skill Retake on that skill is the cheapest route to 8.0, and Listening or Reading are the most reliable targets because both respond to accuracy drilling within weeks. Remember the constraints: computer-delivered tests only, within 60 days, same country, once per full test.",
    faqs: [
      { q: "How many correct answers do I need for Band 8 in IELTS?", a: "Around 35 out of 40 in Listening and around 35 out of 40 in Academic Reading. On General Training Reading it is closer to 38 out of 40, because that paper is marked to a much stricter curve. In practice Band 8 means you can afford roughly five errors across an entire section." },
      { q: "Is Band 8 hard to get in IELTS Writing?", a: "Writing is the hardest skill to take to 8.0 and by some distance. Listening and Reading reward accuracy, which you can drill; Writing at 8.0 requires a wide range of structures used naturally with only occasional slips, and natural is the operative word. It generally needs corrected feedback over months, not more practice essays written unmarked." },
      { q: "What is the difference between a Band 7 and a Band 8 essay?", a: "A Band 7 essay is clear, developed and mostly accurate. A Band 8 essay reads as though the writer had a choice about every word and made the right one - the vocabulary is precise rather than merely correct, the cohesion is invisible rather than signposted, and the errors are so few and so unpatterned that you could not predict where the next one falls." },
      { q: "Do I need Band 8 for a visa?", a: "Rarely as a minimum, often as an advantage. Australia awards 20 points for Superior English at 8.0 in each skill, and Canada's CRS language points peak around CLB 10. No major visa category refuses an applicant for being below 8.0 alone, but in points-tested systems the gap between 7.0 and 8.0 is frequently decisive." },
    ],
  },
  {
    slug: "9", band: "9",
    meaning: "an 'expert' user. Fully operational command: appropriate, accurate and fluent, with complete understanding.",
    who: "the maximum score: near-native, sought by a small number of candidates and for perfect scores.",
    overall: "an average of 9.0 (or 8.75+, which rounds to 9.0).",
    takes: {
      listening: "Around 39 / 40: effectively perfect comprehension under a single play.",
      reading: "Around 39 / 40: complete, rapid understanding of complex text.",
      writing: "A fully-extended, natural response with a wide range of structures and virtually no errors.",
      speaking: "Effortless, natural fluency with fully flexible, precise language and pronunciation that never strains the listener.",
    },
    tips: {
      listening: ["Practise with fast, accented native audio (podcasts, lectures).", "Zero avoidable errors: accuracy is everything at this level."],
      reading: ["Read complex academic and literary texts daily for speed and nuance.", "Handle every question type with time to spare."],
      writing: ["Write with the precision and natural flow of a well-educated native.", "Errors must be rare and truly incidental."],
      speaking: ["Sound natural and spontaneous: idiomatic, precise, wholly fluent.", "Develop every answer with nuance and a clear point of view."],
    },
    misses: ["Any recurring error pattern: Band 9 tolerates only occasional slips.", "Sounding rehearsed rather than natural and spontaneous."],
    journey: [
      { from: "Band 8.0", weeks: "12-24 weeks", focus: "Band 9 is not Band 8 done more carefully. It asks for language that is appropriate, accurate and fluent with complete understanding - and the residual errors at 8.0 are usually invisible to the person making them. This step is effectively impossible without expert correction, because you cannot self-diagnose a mistake you do not perceive as one." },
      { from: "Band 8.5", weeks: "8-16 weeks", focus: "At 8.5 the remaining gap is nearly always naturalness rather than correctness. Scripts read as very good non-native English: technically sound, faintly effortful. Extensive reading of well-edited prose does more here than any exam technique." },
      { from: "Realistically", weeks: "-", focus: "Very few candidates need Band 9, and almost no institution requires it. Before spending months on it, check whether the requirement you are actually chasing is 7.0 or 8.0 - it usually is, and the time is better spent elsewhere." },
    ],
    accepted: [
      { context: "Every university and visa category", detail: "Band 9 is the maximum on the scale and exceeds every published requirement anywhere. No institution asks for more.", enough: "yes" },
      { context: "Points-tested migration", detail: "No system awards more for 9.0 than for 8.0. Australia's Superior English tops out at 8.0 in each skill, and Canada's CRS language points peak around CLB 10. Above those thresholds the extra half bands are worth nothing.", enough: "yes" },
      { context: "When it is genuinely worth chasing", detail: "Translation and interpreting work, some academic teaching posts, and personal benchmarking. For visa or admission purposes it is almost always effort spent past the point of return.", enough: "yes" },
    ],
    onScreen: "At this level the format is close to neutral. The two-minute Listening check is the one place it can still cost you, because Band 9 allows roughly one error across forty questions and a typo counts exactly like a misheard answer. If you handwrite faster than you type, the Writing on Paper option now available in selected markets is worth seeking out - it lets you handwrite the Writing component while Reading and Listening still run on computer.",
    retake: "One Skill Retake is how most Band 9 overall scores are actually assembled. Reaching 9.0 in all four skills at one sitting is rare; reaching it in three and re-sitting the fourth is far more achievable. The 60-day window, the same-country rule and the once-per-test limit still apply, so plan the retake before you sit the original.",
    faqs: [
      { q: "How many correct answers do I need for Band 9 in IELTS?", a: "About 39 out of 40 in both Listening and Academic Reading - effectively one permitted error per section. There is no margin for a spelling slip or a mistyped answer, which is why Band 9 in the receptive skills is as much an accuracy discipline as a comprehension one." },
      { q: "What percentage of test takers get Band 9?", a: "A very small fraction, well under one percent overall, and lower still for a 9.0 in all four skills at a single sitting. Band 9 in one individual skill - most often Listening - is considerably more common than a 9.0 overall." },
      { q: "Do native English speakers get Band 9?", a: "Not automatically, and this surprises people. Native speakers routinely score 8.0 or 8.5 in Writing because IELTS Writing is marked against task-specific criteria - a Task 1 overview, a consistently held position, controlled paragraphing - and being a native speaker does not mean you have practised those. Band 9 rewards examination technique as much as it rewards English." },
      { q: "Is it worth trying for Band 9?", a: "For almost everyone, no. No university or visa category requires it, and no points system rewards it above 8.0. Unless you need it for translation, interpreting or a specific academic post, the same months invested in another part of your application will return far more." },
    ],
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
      journey: c.journey,
      accepted: c.accepted,
      onScreen: c.onScreen,
      retake: c.retake,
      faqs: c.faqs,
    },
  ]),
);

export const BAND_SLUGS = CONFIG.map((c) => c.slug);
