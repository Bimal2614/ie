/**
 * IELTS study materials — 2026 format. Deep per-task-type guides for Listening,
 * Reading and Speaking (Writing has its own richer module in study-writing.ts).
 * Each type carries: what it is, how to answer, dos, don'ts, useful language,
 * tips, and a WORKED EXAMPLE (a real-style question with the answer explained /
 * a Band 8–9 model). Content is data so the page stays DRY.
 */

export type StudyExample = {
  /** Transcript excerpt (Listening) / passage excerpt (Reading). Omitted for Speaking. */
  context?: string;
  /** The question / prompt / cue card. */
  prompt: string;
  /** The correct answer, or a Band 8–9 model response (Speaking). */
  answer: string;
  /** Speaking only — the band the model answer represents. */
  band?: string;
  /** Why that is the answer / why the model scores. */
  explanation: string[];
};

export type StudyTopic = {
  slug: string;
  name: string;
  what: string;
  howToAnswer: string[];
  dos: string[];
  donts: string[];
  usefulLanguage?: string[];
  tips?: string[];
  example: StudyExample;
};

export type StudyReference = { label: string; note: string; href: string };

export type StudySection = {
  key: "listening" | "reading" | "writing" | "speaking";
  name: string;
  tagline: string;
  overview: string;
  format: { label: string; value: string }[];
  bandTips: string[];
  topics: StudyTopic[];
  references: StudyReference[];
};

const REFERENCES: StudyReference[] = [
  { label: "IELTS.org — how IELTS is scored", note: "Official band descriptors and score information — the exact standard examiners use.", href: "https://www.ielts.org/for-test-takers/how-ielts-is-scored" },
  { label: "British Council — Take IELTS", note: "Official preparation, free practice tests and sample materials.", href: "https://takeielts.britishcouncil.org/take-ielts/prepare" },
  { label: "IDP IELTS — prepare", note: "Co-owner of IELTS; free samples, webinars and on-screen familiarisation.", href: "https://ielts.idp.com/prepare" },
  { label: "Cambridge IELTS 1–19", note: "The authentic past-paper series — the gold standard for real questions.", href: "https://www.cambridge.org/gb/cambridgeenglish/catalog/cambridge-english-exams-ielts" },
  { label: "IELTS Liz", note: "Widely-used free lessons, model answers and tips by skill.", href: "https://ieltsliz.com" },
  { label: "IELTS Simon (ex-examiner)", note: "Method and model answers from a former IELTS examiner.", href: "https://ielts-simon.com" },
];

export const STUDY: StudySection[] = [
  /* ─────────────────────────── LISTENING ─────────────────────────── */
  {
    key: "listening",
    name: "Listening",
    tagline: "One play, four recordings, 40 questions.",
    overview:
      "The Listening test is identical for Academic and General Training: four recordings of increasing difficulty, played ONCE only. On the computer-delivered test you get 2 minutes at the end to review; on paper, 10 minutes to transfer answers. Spelling and grammar must be correct to earn the mark, and answers within a type follow the order of the audio.",
    format: [
      { label: "Time", value: "~30 min + review" },
      { label: "Questions", value: "40 (4 sections × 10)" },
      { label: "Audio", value: "Played once only" },
      { label: "Guide", value: "≈30/40 ≈ Band 7" },
    ],
    bandTips: [
      "Read and predict during the pause before each section — decide the answer TYPE (number, name, place) for each gap.",
      "Answers come in order; if you miss one, abandon it and lock onto the next so you don't lose two.",
      "Obey the word limit ('NO MORE THAN TWO WORDS') — one word over scores zero.",
      "Always practise with a SINGLE listen — replaying trains a habit the real test won't allow.",
    ],
    topics: [
      {
        slug: "form-note-table-completion",
        name: "Form / Note / Table / Flow-chart completion",
        what: "Fill gaps in a form, notes, table or flow-chart with words or numbers said in the audio. Answers are spoken verbatim (not paraphrased).",
        howToAnswer: [
          "Read the headings to grasp the context (booking, registration, enquiry).",
          "Predict each gap: name, number, date, or a noun? Note the expected type.",
          "Write exactly what you hear; fix spelling and singular/plural at once.",
        ],
        dos: ["Check the word limit and count your words.", "Write numbers as digits to save time.", "Spell names from the spelling given aloud."],
        donts: ["Don't add words not needed to fill the gap.", "Don't leave a blank — guess the right type.", "Don't fall for self-corrections ('sorry, 15 not 50')."],
        tips: ["Speakers often 'correct' a number or spelling — write the FINAL value they settle on."],
        example: {
          context: "\"…so the deposit is normally £50, but for students it's reduced to £35. And can I take a contact number? It's 07-double 7-1, 3-0-9-4-2.\"",
          prompt: "Deposit (student): £ ______   ·   Phone: ______",
          answer: "£35   ·   07771 30942",
          explanation: [
            "The speaker corrects £50 → £35 for students, so the final value (35) is the answer.",
            "'double 7' means 77; write the digits exactly as dictated.",
          ],
        },
      },
      {
        slug: "multiple-choice",
        name: "Multiple choice",
        what: "Choose one (or sometimes more) correct option from A/B/C. The correct option is paraphrased; wrong options often echo words you hear.",
        howToAnswer: [
          "Read the stem and options first; underline what makes each option different.",
          "Listen for the meaning, not matching words — traps repeat exact words.",
          "Eliminate options as the speaker rules them out; decide only when the point is complete.",
        ],
        dos: ["Track every option — each is usually mentioned to distract.", "Wait for the full idea before choosing."],
        donts: ["Don't pick an option just because you heard its words.", "Don't commit to the first thing you hear."],
        example: {
          context: "\"I was going to do the morning tour, but it was fully booked, so I've ended up on the afternoon one — which is actually better for photos.\"",
          prompt: "Which tour did the speaker book?  A) morning  B) afternoon  C) evening",
          answer: "B — afternoon",
          explanation: [
            "'morning' is heard but rejected ('fully booked') — a classic distractor.",
            "The answer is signalled by 'I've ended up on the afternoon one'.",
          ],
        },
      },
      {
        slug: "matching",
        name: "Matching",
        what: "Match a list of items (people, places) to a set of options (opinions, features). Options can repeat or go unused.",
        howToAnswer: [
          "Read both lists; note synonyms next to each option.",
          "Follow the question order — it tracks the audio.",
          "Listen for who says or does what, not just a keyword.",
        ],
        dos: ["Keep your eyes on the current question.", "Expect options to repeat or not be used."],
        donts: ["Don't assume each option is used exactly once."],
        example: {
          context: "\"Tom found the museum a bit dull, honestly. Priya loved it — she said the exhibits were fascinating.\"",
          prompt: "Match each person to their opinion.  Tom: ___  Priya: ___   (A fascinating  B boring  C too expensive)",
          answer: "Tom → B (boring),  Priya → A (fascinating)",
          explanation: ["'a bit dull' paraphrases 'boring'; 'fascinating' is a direct match — listen for the opinion attached to each name."],
        },
      },
      {
        slug: "plan-map-diagram-labelling",
        name: "Plan / Map / Diagram labelling",
        what: "Label a map, plan or diagram using a box of options or words from the audio. Tests directional and location language.",
        howToAnswer: [
          "Orient first: find the entrance, 'you are here', North and any labelled anchor.",
          "Track direction words: opposite, next to, at the end of, turn left, adjacent.",
          "Move along the speaker's route rather than jumping around.",
        ],
        dos: ["Mark the start point and follow step by step.", "Learn prepositions of place cold."],
        donts: ["Don't lose your place — if you do, jump to the next clearly-named landmark."],
        example: {
          context: "\"From the entrance, go straight ahead. The library is the first building on your right, and the café is directly opposite it.\"",
          prompt: "Label the café (A–E on the plan).",
          answer: "The building opposite the library (i.e. first on the LEFT from the entrance).",
          explanation: ["'directly opposite' the library, which is 'first on your right' → the café is first on the left. Anchor to the named building, then apply the direction."],
        },
      },
      {
        slug: "sentence-summary-completion",
        name: "Sentence & summary completion",
        what: "Complete sentences or a summary with words from the recording, within a word limit. Grammar must fit the gap.",
        howToAnswer: [
          "Read first for gist and to predict each answer.",
          "Check the words around the gap to know the part of speech required.",
          "Answers are usually in audio order.",
        ],
        dos: ["Make the completed sentence grammatical.", "Respect the word limit."],
        donts: ["Don't change the form of the word you hear unless grammar demands it."],
        example: {
          context: "\"The main problem the researchers faced was a lack of funding, which delayed the project by two years.\"",
          prompt: "The project was delayed by a lack of ______.",
          answer: "funding",
          explanation: ["The gap needs a noun; 'a lack of funding' is stated directly. 'money' would be a paraphrase and risks being marked wrong — use the word heard."],
        },
      },
    ],
    references: REFERENCES,
  },

  /* ─────────────────────────── READING ─────────────────────────── */
  {
    key: "reading",
    name: "Reading",
    tagline: "60 minutes, 40 questions, no extra transfer time.",
    overview:
      "Academic Reading has 3 long passages from books, journals and newspapers. General Training has shorter everyday and workplace texts plus one longer passage. Both are 60 minutes for 40 questions with NO extra transfer time — pacing is everything. The answer is almost never worded the same as the question; you're hunting synonyms and paraphrase.",
    format: [
      { label: "Time", value: "60 min (no transfer time)" },
      { label: "Questions", value: "40 across 3 sections" },
      { label: "Academic", value: "3 academic passages" },
      { label: "General", value: "Everyday + workplace + 1 long text" },
    ],
    bandTips: [
      "Budget ~20 min per passage; flag a hard question and return rather than sinking time.",
      "Most types are in passage order — use that to locate the next answer quickly.",
      "Scan for keywords and their synonyms, not the exact words in the question.",
      "Transfer answers as you go — there is no extra minute at the end.",
    ],
    topics: [
      {
        slug: "true-false-notgiven",
        name: "True / False / Not Given (and Yes / No / Not Given)",
        what: "Decide whether a statement agrees with (TRUE), contradicts (FALSE), or is absent from (NOT GIVEN) the text. YNNG is identical but tests the writer's opinion.",
        howToAnswer: [
          "Identify the exact claim the statement makes.",
          "Locate the matching part of the text with keywords/synonyms (statements are in order).",
          "TRUE = confirmed; FALSE = actively contradicted; NOT GIVEN = neither confirmed nor denied.",
        ],
        dos: ["Answer only from the passage, never your own knowledge.", "Treat FALSE as a genuine contradiction."],
        donts: ["Don't confuse FALSE with NOT GIVEN — the No.1 band-killer.", "Don't over-infer: if it isn't stated either way, it's NOT GIVEN."],
        example: {
          context: "Passage: \"The 1959 expedition was the first to reach the summit in winter. Earlier attempts had all been made in summer.\"",
          prompt: "Statement: The 1959 expedition was the first to reach the summit at any time of year.",
          answer: "FALSE",
          explanation: [
            "The text says it was the first to reach it IN WINTER — and mentions earlier (summer) attempts, so it was NOT the first ever.",
            "The statement contradicts the passage → FALSE (not NOT GIVEN, because the text gives us enough to disprove it).",
          ],
        },
      },
      {
        slug: "matching-headings",
        name: "Matching headings",
        what: "Match a heading to each paragraph/section. Headings capture the MAIN idea, not a single detail. There are always extra headings you won't use.",
        howToAnswer: [
          "Do this type first if it covers the whole passage — it forces gist reading.",
          "Read the first and last sentence of a paragraph, then skim the middle for the central point.",
          "Match to the main idea; reject headings that fit only one detail.",
        ],
        dos: ["Cross off headings as you use them.", "Beware one or two headings that are never used."],
        donts: ["Don't choose a heading just because it shares a word with the paragraph."],
        example: {
          context: "Paragraph: \"While early critics dismissed the technique, later studies repeatedly confirmed its accuracy, and it is now standard practice in most laboratories.\"",
          prompt: "Choose a heading:  i) Early doubts about a method  ii) From scepticism to acceptance  iii) The cost of new equipment",
          answer: "ii — From scepticism to acceptance",
          explanation: ["The paragraph's whole arc is doubt → confirmation → standard practice. (i) matches only the first clause; (ii) captures the main idea."],
        },
      },
      {
        slug: "matching-information-features",
        name: "Matching information / features / sentence endings",
        what: "Match statements, features or sentence-endings to paragraphs, people or categories. These are usually NOT in passage order.",
        howToAnswer: [
          "Expect to scan the whole text — order isn't guaranteed.",
          "Underline the specific detail each item needs, then locate it.",
          "For matching features (e.g. researchers), map each name to its claim first.",
        ],
        dos: ["Check whether options can be used more than once (read the instruction)."],
        donts: ["Don't assume top-to-bottom order — answers jump around."],
        example: {
          context: "Passage names three scientists: \"Lee argued cost was the barrier; Okoro blamed poor training; Silva saw no single cause.\"",
          prompt: "Who believed there was no single reason?  A Lee  B Okoro  C Silva",
          answer: "C — Silva",
          explanation: ["'no single cause' paraphrases 'no single reason'. Map each name to its claim, then match the item."],
        },
      },
      {
        slug: "multiple-choice",
        name: "Multiple choice",
        what: "Choose the correct option (A–D) on a detail or main idea. Wrong options are often true-but-irrelevant, partly wrong, or overstated.",
        howToAnswer: [
          "Read the stem first, then locate the relevant lines.",
          "Predict the answer before reading the options.",
          "Eliminate options that overstate, are irrelevant, or only half-match.",
        ],
        dos: ["Match meaning, not vocabulary."],
        donts: ["Don't pick the option with the most words copied from the text — often the trap."],
        example: {
          context: "Passage: \"The scheme reduced traffic, though critics note the improvement was smaller than the council claimed.\"",
          prompt: "The scheme…  A failed completely  B reduced traffic, but less than claimed  C had no critics  D was abandoned",
          answer: "B",
          explanation: ["A and D overstate; C is contradicted ('critics note'). B matches the qualified success the text describes."],
        },
      },
      {
        slug: "completion-tasks",
        name: "Sentence / summary / note / table completion",
        what: "Fill gaps with words taken FROM the passage, within a strict word limit (unless a box of options is provided).",
        howToAnswer: [
          "Predict the part of speech and likely meaning of each gap.",
          "Find the relevant lines; lift the exact word(s).",
          "Make the completed sentence grammatical and within the limit.",
        ],
        dos: ["Copy words exactly — spelling counts.", "Count your words."],
        donts: ["Don't paraphrase when told to use words from the passage."],
        example: {
          context: "Passage: \"The bridge is supported by two enormous steel cables anchored deep in the bedrock.\"",
          prompt: "The bridge is held up by two steel ______. (NO MORE THAN TWO WORDS)",
          answer: "cables",
          explanation: ["'held up by' = 'supported by'; the gap needs the noun 'cables' (one word, within the limit). Take the exact word from the text."],
        },
      },
      {
        slug: "short-answer",
        name: "Short-answer questions",
        what: "Answer direct questions with words from the passage, within a word limit.",
        howToAnswer: [
          "Turn the question into what you're scanning for (who/what/where/how many).",
          "Locate it and lift the exact words within the limit.",
        ],
        dos: ["Keep answers concise and grammatical."],
        donts: ["Don't write a full sentence when a phrase is asked for."],
        example: {
          context: "Passage: \"Construction was funded entirely by private donations from local businesses.\"",
          prompt: "Who funded the construction? (NO MORE THAN THREE WORDS)",
          answer: "local businesses",
          explanation: ["Scan for 'funded'; the answer 'local businesses' is two words, within the limit, lifted from the text."],
        },
      },
    ],
    references: REFERENCES,
  },

  /* ─────────────────────────── SPEAKING ─────────────────────────── */
  {
    key: "speaking",
    name: "Speaking",
    tagline: "A 11–14 minute conversation in three parts.",
    overview:
      "A face-to-face (or video) interview, identical for Academic and General Training. Marked on Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation. It's a conversation — extend your answers, speak naturally, and let some personality through. There are no 'right opinions', only well-expressed English.",
    format: [
      { label: "Part 1", value: "Interview · 4–5 min" },
      { label: "Part 2", value: "Long turn · 1 min prep + 1–2 min" },
      { label: "Part 3", value: "Discussion · 4–5 min" },
      { label: "Criteria", value: "FC · LR · GRA · Pronunciation" },
    ],
    bandTips: [
      "Extend every answer — a reason plus an example turns a Band 5 answer into a Band 7.",
      "Fluency beats perfection: keep going; a single self-correction is fine, freezing is not.",
      "Show range — idioms, mixed tenses, topic vocabulary — to lift Lexical Resource and GRA.",
      "Pronunciation is clarity and natural stress/intonation, not accent.",
    ],
    topics: [
      {
        slug: "part-1-interview",
        name: "Part 1 — Introduction & interview",
        what: "Familiar questions about you: home, work/study, hobbies, hometown, daily routine. The warm-up — keep it natural and personal.",
        howToAnswer: [
          "Answer directly, then add a reason or detail (2–3 sentences).",
          "Mix tenses naturally (I usually…, last weekend I…, I'm hoping to…).",
          "Sound relaxed — these are the easy questions.",
        ],
        dos: ["Extend with 'because…', 'for example…', 'these days…'.", "Use contractions and natural spoken English."],
        donts: ["Don't give one-word answers.", "Don't recite memorised speeches — they sound unnatural and lower your score."],
        usefulLanguage: ["To be honest…; I'd say…; I'm really into…; It depends, but usually…; I've never been a big fan of…"],
        example: {
          prompt: "Do you enjoy cooking?",
          band: "Band 8–9",
          answer:
            "To be honest, I do — although I didn't used to. I've really got into it over the last couple of years, mainly because it's such a good way to unwind after a long day. Just last night I made a Thai green curry from scratch, which turned out surprisingly well!",
          explanation: [
            "Direct answer → reason → specific recent example, all in natural spoken English.",
            "Range: mixed tenses (do / didn't use to / 've got into / made), phrasal verbs ('got into', 'unwind') and a natural exclamation.",
          ],
        },
      },
      {
        slug: "part-2-cue-card",
        name: "Part 2 — Long turn (cue card)",
        what: "A topic card with prompts; 1 minute to prepare, then you speak for 1–2 minutes uninterrupted.",
        howToAnswer: [
          "Use the prep minute to jot keywords for each bullet — not full sentences.",
          "Cover all bullets, but treat them as a springboard to tell a story.",
          "Keep talking for the full two minutes; it's fine to be stopped.",
        ],
        dos: ["Use the prep minute.", "Use past/future tenses and descriptive vocabulary."],
        donts: ["Don't stop after 30 seconds.", "Don't just read out the bullets mechanically."],
        usefulLanguage: ["I'd like to talk about…; It all started when…; What made it special was…; Looking back…; I'll never forget…"],
        example: {
          prompt:
            "Describe a place you visited that left a strong impression on you. You should say: where it was; when you went; what you did there; and explain why it made such an impression.",
          band: "Band 8–9",
          answer:
            "I'd like to talk about a trip I took to Kyoto in Japan, about three years ago, during the autumn. What drew me there was the promise of the changing leaves, and it completely lived up to it. I spent most of my days simply wandering — visiting old temples, walking through a bamboo forest, and sitting by the river watching the maple leaves drift down. What made it so memorable, though, wasn't any single sight; it was the atmosphere — this incredible sense of calm and craftsmanship in everything, from the gardens to the food. Looking back, it was one of those rare trips that genuinely changed how I think about slowing down, and I've wanted to go back ever since.",
          explanation: [
            "All four bullets covered, but woven into a narrative rather than listed.",
            "Rich descriptive vocabulary, varied structures, and a reflective 'looking back' close — sustained for the full turn.",
          ],
        },
      },
      {
        slug: "part-3-discussion",
        name: "Part 3 — Two-way discussion",
        what: "Abstract, opinion-based questions linked to the Part 2 topic. Answers should be more analytical and general than Part 1.",
        howToAnswer: [
          "Give an opinion, justify it, and consider another angle.",
          "Speak about society, trends and the future — not just yourself.",
          "Buy thinking time naturally ('That's a good question — I'd say…').",
        ],
        dos: ["Develop ideas: claim → reason → example → implication.", "Use hedging/speculation (it depends, arguably, it might) to show range."],
        donts: ["Don't give short answers — Part 3 rewards developed responses.", "Don't panic about 'knowing' the answer — there's no right one."],
        usefulLanguage: ["Arguably…; It largely depends on…; There's a strong case that…; On the other hand…; In the long run…"],
        example: {
          prompt: "Do you think tourism always benefits local communities?",
          band: "Band 8–9",
          answer:
            "Not always, no — it really depends on how it's managed. On the one hand, tourism can be a huge economic lifeline: it creates jobs and can fund the preservation of heritage sites that might otherwise fall into disrepair. On the other hand, when it's poorly managed, you get 'over-tourism' — rising rents that push out locals, and a kind of cultural dilution where a place starts performing for visitors rather than living authentically. So arguably the benefit isn't automatic; it hinges on whether the profits actually stay in the community and whether growth is kept sustainable.",
          explanation: [
            "Balanced, analytical answer: both sides, a real concept ('over-tourism'), and a conditional conclusion.",
            "Hedging and sophisticated linking ('arguably', 'it hinges on') signal a high band.",
          ],
        },
      },
    ],
    references: REFERENCES,
  },

  /* Writing lives in study-writing.ts (Task 1 & Task 2 sub-guides). This stub
     powers only the /resources hub card; its own route is /resources/writing. */
  {
    key: "writing",
    name: "Writing",
    tagline: "Two tasks, 60 minutes, four scored criteria.",
    overview:
      "Task 1 (20 min, 150+ words) and Task 2 (40 min, 250+ words, weighted double). Marked on Task Achievement/Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. See the dedicated Task 1 and Task 2 guides for every question type and Band 9 models.",
    format: [
      { label: "Task 1", value: "20 min · 150+ words" },
      { label: "Task 2", value: "40 min · 250+ words" },
      { label: "Weight", value: "Task 2 counts double" },
      { label: "Criteria", value: "TA/TR · CC · LR · GRA" },
    ],
    bandTips: [],
    topics: [],
    references: REFERENCES,
  },
];

export const STUDY_BY_KEY = Object.fromEntries(STUDY.map((s) => [s.key, s])) as Record<
  StudySection["key"],
  StudySection
>;
