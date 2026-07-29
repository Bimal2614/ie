/**
 * Blog content. Real, useful IELTS articles as data — add entries here and both
 * the index and the article page pick them up (and the sitemap). Newest first.
 *
 * `keywords` drives the per-article <meta keywords> and BlogPosting JSON-LD, and
 * is the SEO target list for each post — write the body to serve those queries.
 * Every call-to-action points at IELTSAce; we never link to other platforms.
 */

export type BlogSection = { heading?: string; paragraphs?: string[]; bullets?: string[] };
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // display string, e.g. "July 2026"
  /** ISO date (YYYY-MM-DD) for JSON-LD datePublished + freshness signals. */
  publishedAt?: string;
  readMins: number;
  /** SEO target queries for this post (meta keywords + JSON-LD). */
  keywords: string[];
  sections: BlogSection[];
  /** Optional Q&A — rendered as a visible FAQ section and FAQPage JSON-LD.
   *  Target real "People Also Ask" questions in the answers. */
  faqs?: { q: string; a: string }[];
};

export const POSTS: BlogPost[] = [
  /* ---------------------------------------------------------------- *
   * Timely "recent questions" posts — these target the monthly, high-
   * intent searches ("recent ielts speaking questions July 2026") that
   * bring fresh traffic every exam cycle. They are hand-written topic
   * round-ups (commonly reported themes + model approaches), NOT leaked
   * exam content — which keeps them accurate and safely indexable.
   * Add a new one each month; keep publishedAt current.
   * ---------------------------------------------------------------- */
  {
    slug: "recent-ielts-speaking-questions-july-2026",
    title: "Recent IELTS Speaking questions — July 2026 (Part 1, 2 & 3 with model answers)",
    excerpt:
      "The IELTS Speaking topics most commonly reported this July 2026 cycle — real-style Part 1, 2 and 3 questions, cue cards, and model answers you can practise today.",
    category: "Speaking",
    date: "July 2026",
    publishedAt: "2026-07-05",
    readMins: 12,
    keywords: [
      "recent ielts speaking questions",
      "ielts speaking questions july 2026",
      "ielts speaking topics 2026",
      "ielts speaking part 1 questions",
      "ielts speaking part 2",
      "ielts speaking part 3",
      "ielts speaking test questions",
      "ielts speaking cue cards",
      "ielts speaking",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["IELTS Speaking topics rotate on a roughly three-to-four-month cycle, and the same themes are reported by test takers around the world during each window. Below are the topics most commonly reported in the July 2026 cycle, grouped by Part 1, 2 and 3, with sample questions and model approaches. These are representative topic round-ups compiled from candidate reports — not official exam content — so treat them as high-value practice material, not a script."] },
      { heading: "Part 1 — familiar topics reported this month", paragraphs: ["Part 1 asks short questions about you and your life. Commonly reported July 2026 topic areas:"], bullets: ["Hometown & home — Where do you live? What do you like about it? Would you move?", "Work or study — What do you do? Why did you choose it? What's the hardest part?", "Daily routine & mornings — Are you a morning person? Has your routine changed?", "Technology & phones — How often do you use your phone? What apps do you use most?", "Weather & seasons — What's your favourite season? Does weather affect your mood?", "Music — What music do you like? Has your taste changed since childhood?"] },
      { heading: "Part 1 model answer", paragraphs: ["Q: Do you prefer texting or calling your friends?", "Model: \"I'm definitely a texter. It's quicker and I can reply whenever suits me, whereas a call sometimes comes at a bad moment. That said, if something's important or emotional, I'll always call — you just can't read someone's tone in a message.\""] },
      { heading: "Part 2 — cue cards reported this cycle", paragraphs: ["Part 2 gives you a card, one minute to prepare, and 1–2 minutes to speak. Cue cards commonly reported in July 2026:"], bullets: ["Describe a skill you would like to learn.", "Describe a person who has influenced you.", "Describe a time you helped someone.", "Describe a place you visited that was full of history.", "Describe an app or website you find useful.", "Describe a decision that took you a long time to make."] },
      { heading: "Part 2 model approach — 'a skill you would like to learn'", paragraphs: ["Use your prep minute to note one keyword per bullet, then tell it as a small story so you never run dry: \"The skill I'd most like to learn is public speaking. I first realised I needed it during a university presentation when my nerves got the better of me… I'd learn it by joining a local speaking club and recording myself… and honestly it would change my life, because confidence in front of people opens doors in almost every career.\" Spend the most time on the final 'explain how it would change your life' prompt — that's where the higher bands are won."] },
      { heading: "Part 3 — discussion questions reported this cycle", paragraphs: ["Part 3 broadens your Part 2 topic into abstract discussion. Commonly reported follow-ups:"], bullets: ["Skills & learning — Should schools teach practical skills? Do people learn better from teachers or on their own?", "Influence & role models — Who influences young people most today? Is celebrity influence a good thing?", "Technology — Has technology made us more or less social? Will it replace human jobs?", "History & places — Why is it important to preserve old buildings? Should governments fund museums?"] },
      { heading: "Part 3 model answer", paragraphs: ["Q: Do you think people rely too much on technology today?", "Model: \"In some ways, yes. We reach for our phones for things our parents did from memory — directions, arithmetic, even remembering birthdays. On the other hand, I'd argue it's less 'over-reliance' and more a sensible shift: if a tool does something faster and frees your mind for harder problems, that's progress. The real risk is losing skills entirely, so a balance matters.\""] },
      { heading: "How to use these questions", bullets: ["Record yourself answering — don't just read. Fluency comes from speaking, not planning.", "Time Part 2 strictly: one minute prep, then two minutes talking without stopping.", "For every Part 3 answer, give an opinion, a reason, and a 'that said…' counterpoint.", "Review against the four criteria: Fluency, Vocabulary, Grammar, Pronunciation."] },
      { heading: "Practise this month's topics with instant feedback", paragraphs: ["Reading questions isn't practice — speaking them is. On IELTSAce you can record answers to real Part 1, 2 and 3 questions (with the built-in Part 2 prep timer), then get instant AI band scoring against all four Speaking criteria. Run through this month's topics a few at a time and your confidence builds fast before test day."] },
    ],
  },
  {
    slug: "recent-ielts-speaking-questions-june-2026",
    title: "Recent IELTS Speaking questions — June 2026 (Part 1, 2 & 3)",
    excerpt:
      "The IELTS Speaking topics commonly reported in the June 2026 cycle — Part 1 questions, Part 2 cue cards and Part 3 discussion prompts, with tips to answer each well.",
    category: "Speaking",
    date: "June 2026",
    publishedAt: "2026-06-05",
    readMins: 10,
    keywords: [
      "recent ielts speaking questions",
      "ielts speaking questions june 2026",
      "ielts speaking topics 2026",
      "ielts speaking part 1 questions",
      "ielts speaking part 2",
      "ielts speaking part 3",
      "ielts speaking test questions",
      "ielts speaking cue cards",
      "ielts speaking",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["Here are the IELTS Speaking topics most commonly reported by candidates during the June 2026 cycle, across all three parts. As always, exact wording varies by examiner and test centre, and these are candidate-reported topic round-ups rather than official questions — so use them to build fluency on likely themes, not to memorise scripts (which examiners penalise)."] },
      { heading: "Part 1 — reported topics", bullets: ["Hometown, neighbours and where you live.", "Studies or job, and future plans.", "Hobbies and free time — reading, sports, cooking.", "Food and cooking — do you cook? favourite meals?", "Travel and holidays — do you prefer city or nature trips?", "Photos — do you take many? do you prefer taking or being in them?"] },
      { heading: "Part 2 — cue cards reported this cycle", bullets: ["Describe a book you enjoyed reading.", "Describe a place you like to relax.", "Describe an important journey you took.", "Describe a piece of good news you received.", "Describe a person who is a good leader.", "Describe something you bought that you were happy with."] },
      { heading: "Part 2 model approach — 'a place you like to relax'", paragraphs: ["Anchor it in the senses and a story: \"The place I go to relax is a small park near my flat. What makes it special is how quiet it is early in the morning — just birdsong and a bit of mist over the pond. I usually go there when work has been stressful… and it resets me completely.\" Cover all four bullets, but let the 'why it's special / how you feel there' part run longest."] },
      { heading: "Part 3 — discussion prompts", bullets: ["Reading & books — Are people reading less than before? Should children be encouraged to read more?", "Leadership — What makes a good leader? Are leaders born or made?", "Travel — Does tourism help or harm local communities? Will people travel more in the future?", "News & media — How do people get news today? Can we trust online news?"] },
      { heading: "Answering Part 3 well", paragraphs: ["Part 3 is where Band 7+ is decided. Don't give one-line answers — take a position, justify it with a reason and example, then acknowledge another view. Useful frames: \"It depends on…\", \"On the one hand… on the other hand…\", \"I'd argue that…\". Speculating about the future (\"I imagine that…\", \"it's likely that…\") shows grammatical range examiners reward."] },
      { heading: "Turn topics into real practice", paragraphs: ["Pick three cue cards above and record a full two-minute answer for each. On IELTSAce you can do exactly that with real IELTS Speaking questions and instant AI band feedback on fluency, vocabulary, grammar and pronunciation — so you find and fix your weak criterion before the exam."] },
    ],
  },
  {
    slug: "recent-ielts-writing-task-2-topics-july-2026",
    title: "Recent IELTS Writing Task 2 topics — July 2026 (with essay plans)",
    excerpt:
      "The IELTS Writing Task 2 essay questions and themes commonly reported this July 2026 cycle — grouped by type, with quick plans and a Band 8 opening for each.",
    category: "Writing",
    date: "July 2026",
    publishedAt: "2026-07-10",
    readMins: 10,
    keywords: [
      "ielts writing task 2 topics",
      "recent ielts essay questions july 2026",
      "ielts writing questions 2026",
      "ielts writing task 2",
      "ielts essay topics",
      "ielts writing",
      "ielts writing task 2 sample",
      "band ielts",
      "ielts academic",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["IELTS Writing Task 2 asks you to write a 250-word essay responding to a prompt, and the same themes recur every cycle. Below are the Task 2 topic areas and question types most commonly reported in July 2026, grouped so you can prepare ideas in advance — then a quick plan and a strong opening line for each. These are representative themes from candidate reports, not official questions."] },
      { heading: "The five recurring theme areas", bullets: ["Education — online vs classroom learning, subjects schools should teach, exams vs continuous assessment.", "Technology — social media's effect on relationships, AI replacing jobs, screen time for children.", "Environment — individual vs government responsibility, plastic and consumption, city planning.", "Work — work-life balance, remote working, changing jobs frequently.", "Society & culture — globalisation and local culture, ageing populations, crime and punishment."] },
      { heading: "Know your four question types", paragraphs: ["Whatever the theme, Task 2 comes in a few fixed formats. Identify yours before you write — the structure depends on it:"], bullets: ["Opinion (agree/disagree) — state a clear position and defend it throughout.", "Discussion (discuss both views + your opinion) — one body paragraph per view, then your stance.", "Problem/solution (or cause/solution) — one paragraph on causes/problems, one on solutions.", "Two-part (direct questions) — answer each question in its own paragraph."] },
      { heading: "Reported question 1 — Technology (opinion)", paragraphs: ["\"Some people believe that social media has done more harm than good to personal relationships. To what extent do you agree or disagree?\"", "Plan: State a clear position (e.g. mostly agree). Body 1 — harms: shallow interactions, comparison and anxiety. Body 2 — the genuine upside: staying connected across distance. Conclusion — restate, with a balanced qualifier.", "Band 8 opening: \"While social media has undeniably made staying in touch effortless, I largely agree that it has weakened the depth of our personal relationships rather than strengthened them.\""] },
      { heading: "Reported question 2 — Education (discussion)", paragraphs: ["\"Some think children should study a wide range of subjects; others believe they should focus only on subjects useful for their future career. Discuss both views and give your opinion.\"", "Plan: Body 1 — the case for breadth (well-rounded thinking, keeping options open). Body 2 — the case for focus (depth, employability). Conclusion — your view (e.g. breadth first, specialisation later).", "Band 8 opening: \"Whether young people benefit more from a broad education or an early focus on career-relevant subjects is a genuine dilemma, and while both have merit, I believe breadth should come first.\""] },
      { heading: "Reported question 3 — Environment (problem/solution)", paragraphs: ["\"Many cities are becoming increasingly polluted. What are the causes of this, and what measures can be taken to solve the problem?\"", "Plan: Body 1 — causes: traffic, industry, poor planning. Body 2 — solutions: public transport investment, emissions rules, green urban design. Keep causes and solutions in separate paragraphs.", "Band 8 opening: \"Urban pollution has worsened sharply in recent decades, driven largely by traffic and unchecked industrial growth; addressing it will require decisive action from both governments and individuals.\""] },
      { heading: "How to prepare Task 2 efficiently", bullets: ["Prepare ideas by theme, not by memorising essays — you can't predict the exact prompt.", "Always write a clear thesis in the introduction and hold it to the conclusion.", "Develop each idea fully: point → explain → example → link. Two developed ideas beat five listed ones.", "Practise under 40 minutes so timing is automatic on test day."] },
      { heading: "Get your essays scored instantly", paragraphs: ["Writing a plan is easy; hitting the band descriptors under time is the hard part. On IELTSAce you can write real Task 2 essays on prompts like these and get instant AI band scoring on all four criteria — Task Response, Coherence, Lexical Resource and Grammar — with feedback on exactly what's holding your band down. Fix the pattern, not just one essay."] },
    ],
  },
  /* ---------------------------------------------------------------- *
   * SEO pillar posts (2026) — targeting the highest-volume and rising
   * IELTS queries. Each is written to genuinely answer the query, then
   * points the reader into IELTSAce practice.
   * ---------------------------------------------------------------- */
  {
    slug: "what-is-ielts-complete-guide",
    title: "What is IELTS? A complete beginner's guide to the exam (2026)",
    excerpt:
      "What the IELTS test is, who accepts it, Academic vs General Training, the four sections, how band scores work, and how to start practising — everything a first-time test taker needs.",
    category: "Basics",
    date: "July 2026",
    readMins: 9,
    keywords: [
      "what is ielts",
      "test ielts",
      "ielts exam",
      "ielts academic",
      "ielts general",
      "band ielts",
      "ielts online",
      "ielts score",
      "ielts practice",
      "idp ielts",
    ],
    sections: [
      { paragraphs: ["IELTS — the International English Language Testing System — is the world's most widely accepted English test for study, work and migration. If you're planning to study abroad, apply for a skilled visa, or register with a professional body in an English-speaking country, IELTS is very likely the test you'll sit. This guide explains exactly what the IELTS exam is, how it's structured, how it's scored, and how to start preparing efficiently."] },
      { heading: "What does the IELTS test actually measure?", paragraphs: ["IELTS measures your real-world English across four skills — Listening, Reading, Writing and Speaking — rather than testing grammar rules in isolation. It's jointly run by the British Council, IDP: IELTS Australia, and Cambridge University Press & Assessment, and results are recognised by more than 12,000 organisations worldwide, including universities, employers and immigration authorities."] },
      { heading: "IELTS Academic vs IELTS General Training", paragraphs: ["There are two versions of the test, and choosing the right one matters:"], bullets: ["IELTS Academic — for university/college admission and professional registration. The Reading and Writing tasks use academic language and data (graphs, processes, diagrams).", "IELTS General Training — for work, migration, and secondary education. Reading and Writing focus on everyday and workplace English (including a letter task).", "Listening and Speaking are identical in both versions."] },
      { heading: "The four sections at a glance", bullets: ["Listening — 30 minutes, 40 questions, four recordings. The audio plays once only.", "Reading — 60 minutes, 40 questions, three passages (academic texts, or general/workplace texts).", "Writing — 60 minutes, two tasks. Task 2 (an essay) is worth twice Task 1.", "Speaking — an 11–14 minute face-to-face (or video-call) interview in three parts."] },
      { heading: "How long is the test and what's the format?", paragraphs: ["Listening, Reading and Writing are completed back-to-back in about 2 hours 45 minutes with no breaks. Speaking may be on the same day or up to a week before or after. You can take IELTS on paper or on a computer — the content and scoring are identical; only the interface differs (computer tests usually return results faster)."] },
      { heading: "How is IELTS scored?", paragraphs: ["Every skill is reported on a 9-band scale, from Band 1 (non-user) to Band 9 (expert user), in half-band steps. Listening and Reading are marked out of 40 and converted to a band. Writing and Speaking are marked by trained examiners against four equally-weighted criteria. Your overall band is the average of the four skills, rounded to the nearest half-band — so lifting your weakest skill by half a band is often the fastest way to raise your overall score.", "Most universities ask for an overall Band 6.0–7.0 with no skill below a set minimum; many visa routes specify an exact band. Always check the exact requirement for your course or visa before you book."] },
      { heading: "Is IELTS hard? What most people underestimate", paragraphs: ["The English itself is rarely the problem — it's the format and timing. Listening plays only once. Reading punishes slow readers. Writing rewards a very specific structure (a clear Task 1 overview and a consistent Task 2 position). Speaking rewards extended, developed answers. Learning these patterns is what separates a 6.5 from a 7.5, and it's exactly what focused practice fixes."] },
      { heading: "How to start preparing", paragraphs: ["A simple, effective sequence: (1) take a timed practice test in each skill to find your baseline, (2) learn the marking criteria so you know what examiners reward, (3) drill your weakest question types with instant feedback, and (4) sit full mock tests to build stamina and pacing.", "On IELTSAce you can do all four in one place — practise every question type for both Academic and General Training, get instant AI band scoring on Writing and Speaking, and sit full-length mock tests on real exam timing. It's free to start, so you can find your baseline today."] },
    ],
    faqs: [
      { q: "Is IELTS hard?", a: "For most people the English itself isn't the hardest part — the format and timing are. Listening plays only once, Reading is time-pressured, and Writing and Speaking reward a specific structure. Learning those patterns with focused practice is what raises your score." },
      { q: "How long is an IELTS score valid?", a: "An IELTS Test Report Form is normally valid for two years from the test date. Check the specific requirement of your university or visa route, as some accept a shorter window." },
      { q: "What is a good IELTS score?", a: "It depends on your goal. Many universities ask for an overall Band 6.0–7.0 with no skill below a set minimum, while some competitive courses and visas require 7.0+. Always confirm the exact band your programme needs." },
      { q: "Should I take IELTS Academic or General Training?", a: "Take Academic for university admission or professional registration, and General Training for work, migration or secondary education. Listening and Speaking are identical in both; only Reading and Writing differ." },
    ],
  },
  {
    slug: "ielts-speaking-parts-questions-answers",
    title: "IELTS Speaking Part 1, 2 & 3: sample questions and Band 9 model answers",
    excerpt:
      "How the IELTS Speaking test is structured, real sample questions for Parts 1–3, model answers, and the exact techniques that move you from Band 6 to Band 8.",
    category: "Speaking",
    date: "July 2026",
    readMins: 11,
    keywords: [
      "ielts speaking",
      "ielts speaking part 1",
      "ielts speaking part 2",
      "ielts speaking part 3",
      "ielts speaking test",
      "ielts speaking test questions",
      "ielts speaking part 1 questions",
      "ielts speaking band descriptors",
      "ielts pronunciation",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["The IELTS Speaking test is an 11–14 minute conversation with a real examiner, scored on four criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation. It's the same in Academic and General Training. This guide walks through all three parts with sample questions and model answers, and shows the techniques examiners reward."] },
      { heading: "Part 1 — Introduction and interview (4–5 minutes)", paragraphs: ["The examiner asks familiar questions about you: home, work or study, hobbies, and everyday topics. The trap is answering too briefly. Aim for two to three sentences — a direct answer, a reason, and a small detail or example."] },
      { heading: "Part 1 sample question + model answer", paragraphs: ["Q: Do you prefer to study in the morning or the evening?", "Model: \"Definitely the morning. My mind is freshest just after breakfast, so I get through difficult material much faster than I would at night. By the evening I'm usually too tired to concentrate, so I save that time for lighter tasks like reviewing vocabulary.\""] },
      { heading: "Part 2 — The long turn (3–4 minutes)", paragraphs: ["You get a cue card with a topic and prompts, one minute to prepare with notes, then you speak for 1–2 minutes uninterrupted. Use your prep minute to jot keywords for each bullet, and structure your talk with a beginning, middle and a reflective ending."] },
      { heading: "Part 2 sample cue card + how to answer", paragraphs: ["Cue card: Describe a skill you would like to learn. You should say: what the skill is, why you want to learn it, how you would learn it, and explain how it would change your life.", "Cover every bullet, but spend most time on the 'explain' prompt — that's where you show range. Tell a small story rather than listing facts: \"The skill I'd most like to learn is coding… I first became interested when…\" Narrative keeps you fluent and fills the two minutes naturally."] },
      { heading: "Part 3 — Two-way discussion (4–5 minutes)", paragraphs: ["The examiner asks broader, more abstract questions linked to your Part 2 topic. This is where you earn the higher bands, so give opinions, compare, speculate and justify. Use phrases like \"It depends on…\", \"On the one hand… on the other…\", and \"I'd argue that…\"."] },
      { heading: "Part 3 sample question + model answer", paragraphs: ["Q: Do you think schools should teach practical skills as well as academic subjects?", "Model: \"Absolutely, and I'd argue they're just as important. Academic knowledge matters, but many graduates leave school unable to manage money or communicate well in an interview. If schools built in practical skills — basic finance, public speaking, even simple coding — students would be far better prepared for real life. That said, the challenge is fitting it into an already crowded timetable.\""] },
      { heading: "The four things examiners actually reward", bullets: ["Fluency: keep going. A little hesitation is fine; long silences are not. Fillers like \"that's an interesting question\" buy thinking time.", "Vocabulary: precise collocations and idiomatic phrases beat rare 'big words' used incorrectly.", "Grammar: mix simple and complex sentences, and use a range of tenses accurately.", "Pronunciation: clarity and natural sentence stress matter far more than accent — you do not need to sound British or American."] },
      { heading: "Common mistakes that cap your score", bullets: ["One-word or one-line answers in Part 1.", "Memorised speeches — examiners spot them instantly and mark them down.", "Running out of things to say in Part 2 (fix this by telling a story, not listing).", "Giving yes/no answers in Part 3 instead of developing a position."] },
      { heading: "How to practise Speaking effectively", paragraphs: ["Speaking improves fastest with recorded practice and honest feedback. On IELTSAce you can practise real Part 1, 2 and 3 questions, record your answers with the built-in timer (including the Part 2 preparation minute), and get instant AI scoring against all four Speaking criteria — including pronunciation. Do a few every day and your fluency compounds quickly."] },
    ],
    faqs: [
      { q: "How long is the IELTS Speaking test?", a: "The Speaking test lasts 11–14 minutes in total: Part 1 is 4–5 minutes, Part 2 is 3–4 minutes (including one minute of preparation), and Part 3 is 4–5 minutes of discussion." },
      { q: "Does my accent affect my IELTS Speaking score?", a: "No — accent is not marked. Pronunciation is scored on how clearly you're understood, using features like word stress, rhythm and intonation. You don't need a British or American accent to reach Band 8." },
      { q: "Can I ask the examiner to repeat a question?", a: "Yes, in Part 1 and Part 3 you can politely ask the examiner to repeat or rephrase a question. In Part 2 you speak from the cue card, so use your one-minute preparation time to plan." },
    ],
  },
  {
    slug: "ielts-writing-task-1-guide-band-9",
    title: "IELTS Writing Task 1: a step-by-step guide with Band 9 examples",
    excerpt:
      "How to structure IELTS Academic Writing Task 1, write a high-scoring overview, describe data accurately, and hit Band 9 — with a full model answer.",
    category: "Writing",
    date: "July 2026",
    readMins: 10,
    keywords: [
      "ielts writing",
      "ielts writing task 1",
      "band ielts",
      "ielts academic",
      "ielts practice",
      "ielts exam",
      "ielts writing task 1 vs task 2",
      "ielts score",
      "cambridge ielts",
      "ielts general",
    ],
    sections: [
      { paragraphs: ["In IELTS Academic Writing Task 1 you describe a visual — a line graph, bar chart, pie chart, table, map or process diagram — in at least 150 words in about 20 minutes. In General Training, Task 1 is a letter instead. This guide focuses on the Academic data task and gives you a repeatable structure that reaches Band 7+ every time, plus a Band 9 model answer."] },
      { heading: "What Task 1 is really testing", paragraphs: ["You're marked on four criteria: Task Achievement (did you select and report the key features with accurate data?), Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. You are NOT asked for opinions or reasons — just an accurate, well-organised description of what the data shows."] },
      { heading: "A four-paragraph structure that works", bullets: ["Introduction — paraphrase the question (say what the visual shows). One sentence.", "Overview — the single most important paragraph: 2–3 sentences naming the biggest trends or differences, with NO specific numbers.", "Body 1 — describe the first group of key features with data.", "Body 2 — describe the remaining key features with data."] },
      { heading: "The overview is where marks are won or lost", paragraphs: ["Without a clear overview you are capped at Band 5 for Task Achievement, no matter how accurate your figures are. The overview zooms out: what's the highest, the lowest, the overall direction, the biggest gap? Signal it with \"Overall, …\" so the examiner can't miss it."] },
      { heading: "Language for describing data", bullets: ["Increase: rose, climbed, surged, grew, went up.", "Decrease: fell, declined, dropped, plummeted, decreased.", "Stability: remained stable, held steady, plateaued, levelled off.", "Degree + speed: a sharp rise, a gradual decline, a slight increase, a dramatic fall.", "Vary your grammar: \"Sales rose sharply\" (verb + adverb) and \"There was a sharp rise in sales\" (adjective + noun)."] },
      { heading: "Band 9 model answer (line graph — coffee vs tea consumption)", paragraphs: ["Introduction: \"The line graph illustrates how much coffee and tea were consumed per person in a European country between 2000 and 2020.\"", "Overview: \"Overall, coffee consumption rose steadily across the period and overtook tea, which had been the more popular drink at the start but declined consistently by the end.\"", "Body 1: \"In 2000, tea was clearly dominant at around 4 kg per person, compared with just 2 kg for coffee. Tea then fell gradually, dipping below 3 kg by 2010 and reaching roughly 2 kg by 2020.\"", "Body 2: \"Coffee, meanwhile, climbed steadily throughout, passing tea at approximately 3 kg around 2012 before peaking at about 4.5 kg in 2020 — more than double its starting figure.\""] },
      { heading: "Timing and word count", paragraphs: ["Spend no more than 20 minutes on Task 1 and leave 40 for Task 2 (it's worth twice the marks). Write at least 150 words — under-length answers are penalised — but don't pad; examiners reward selection of key features, not every tiny detail."] },
      { heading: "Task 1 vs Task 2 — don't confuse them", paragraphs: ["Task 1 is a factual description (150+ words, 20 minutes); Task 2 is an argumentative essay (250+ words, 40 minutes) worth double. If you're short on time, protect Task 2 — a strong essay lifts your Writing band more than a perfect Task 1."] },
      { heading: "Practise with instant band feedback", paragraphs: ["Task 1 improves fastest when you write under time and get specific feedback on your overview and data accuracy. On IELTSAce you can practise real Academic Task 1 charts (and General Training letters), then get instant AI band scoring against all four criteria — so you know exactly which paragraph is costing you marks before test day."] },
    ],
  },
  {
    slug: "ielts-reading-tips-improve-score",
    title: "IELTS Reading tips: how to improve your score fast",
    excerpt:
      "Timing, skimming and scanning, the toughest question types (True/False/Not Given, matching headings), and the habits that quickly raise your IELTS Reading band.",
    category: "Reading",
    date: "July 2026",
    readMins: 9,
    keywords: [
      "reading ielts",
      "ielts reading",
      "ielts practice",
      "band ielts",
      "ielts exam",
      "ielts academic",
      "ielts general",
      "ielts online",
      "ielts score",
      "test ielts",
    ],
    sections: [
      { paragraphs: ["IELTS Reading gives you 60 minutes to answer 40 questions across three passages, with no extra transfer time. Most people lose marks not because the texts are too hard, but because they run out of time or misread the question type. Here's how to fix both — fast."] },
      { heading: "Master the clock first", paragraphs: ["That's roughly 20 minutes per passage, including transferring answers. Don't read every word — you don't have time. The skill IELTS actually tests is finding information quickly, so build your strategy around skimming and scanning, not deep reading."] },
      { heading: "Skim, then scan", bullets: ["Skim first: read the title, first line of each paragraph, and any headings to grasp the overall structure — about 2 minutes.", "Scan for answers: go to the questions, identify keywords, then hunt the passage for those words or their synonyms.", "Answers usually appear in passage order for most question types, so you rarely need to search the whole text again."] },
      { heading: "The hardest type: True / False / Not Given", paragraphs: ["This trips up more candidates than any other. The distinction:"], bullets: ["True — the passage confirms the statement.", "False — the passage contradicts the statement.", "Not Given — the passage neither confirms nor contradicts it. There's simply no information.", "The rule: never use outside knowledge or assumptions. If you can't find it stated or contradicted in the text, it's Not Given — even if it feels obviously true."] },
      { heading: "Matching headings", paragraphs: ["Read the paragraph, then pick the heading that captures its main idea — not a heading that just repeats one word from the paragraph. Distractor headings deliberately reuse a keyword while missing the paragraph's actual point. Do these last, after easier questions have narrowed your options."] },
      { heading: "Watch the word limit", paragraphs: ["Completion questions specify a limit like \"NO MORE THAN TWO WORDS\". Exceeding it — even with a correct answer — scores zero. Copy words exactly from the passage, and check your spelling: a misspelt answer is marked wrong."] },
      { heading: "Habits that raise your band", bullets: ["Practise under strict timing from day one — accuracy without speed won't help on test day.", "Build synonym awareness: IELTS almost never uses the exact question word in the passage.", "Do the questions you can answer quickly first; flag hard ones and return to them.", "Never leave a blank — there's no negative marking, so always guess."] },
      { heading: "Practise the exact question types", paragraphs: ["The fastest way to improve is drilling the specific types that cost you marks — True/False/Not Given, matching headings, sentence completion — until the pattern is automatic. On IELTSAce you can practise every IELTS Reading question type for both Academic and General Training, with instant answers and explanations so you learn from each mistake, plus full timed mock tests to build your pace."] },
    ],
  },
  {
    slug: "ielts-listening-strategies",
    title: "IELTS Listening: strategies that actually work",
    excerpt:
      "Why the audio plays only once, how to use the reading time, spelling and number traps, and the section-by-section strategy that raises your IELTS Listening band.",
    category: "Listening",
    date: "July 2026",
    readMins: 8,
    keywords: [
      "listening ielts",
      "ielts listening",
      "ielts practice",
      "ielts exam",
      "band ielts",
      "ielts online",
      "ielts score",
      "test ielts",
      "ielts academic",
      "ielts general",
    ],
    sections: [
      { paragraphs: ["IELTS Listening is 30 minutes, 40 questions, four recordings that get progressively harder — and the audio plays only once. That single-play rule is what makes it feel stressful, but with the right strategy it's one of the most improvable sections. Here's how to score higher."] },
      { heading: "The four sections", bullets: ["Section 1 — an everyday conversation (e.g. booking something). The easiest; don't lose marks here.", "Section 2 — a monologue on a general topic (e.g. a tour or facility).", "Section 3 — a conversation in an academic/training context (e.g. students discussing an assignment).", "Section 4 — an academic lecture. The hardest, with the fewest pauses."] },
      { heading: "Use the reading time — every second of it", paragraphs: ["Before each section you get time to read the questions. Use it to underline keywords and predict answers: is the gap a number, a name, a date, a noun? Knowing what you're listening for is half the battle, because you'll recognise the answer the moment it's spoken."] },
      { heading: "Listen for signposts and synonyms", paragraphs: ["The recording almost never uses the exact word from the question — it uses a synonym or paraphrase. Train your ear for meaning, not word-matching. Also listen for corrections: speakers often say a detail then change it (\"It's on Tuesday — sorry, Thursday\"), and the second version is the answer."] },
      { heading: "Spelling and numbers cost easy marks", bullets: ["Answers must be spelled correctly — a right word spelt wrong scores zero. Practise common spellings (accommodation, Wednesday, February).", "Learn how letters and numbers are dictated, and watch date and currency formats.", "Respect the word limit (e.g. \"ONE WORD AND/OR A NUMBER\")."] },
      { heading: "Don't get left behind", paragraphs: ["If you miss an answer, let it go immediately and focus on the next question — chasing a lost answer makes you miss two more. Leave it blank in your head, keep pace with the recording, and come back to guess at the end. Never leave any answer blank on the sheet; there's no penalty for wrong guesses."] },
      { heading: "Build the skill deliberately", paragraphs: ["Train under real conditions: single play, no pausing, no rewinding. On IELTSAce every Listening set plays once, just like the real exam, and covers all the question types — form completion, multiple choice, map labelling, matching. You get instant answers and can review the transcript afterwards to catch exactly where your ear slipped, then reinforce it with full mock tests."] },
    ],
  },
  {
    slug: "ielts-academic-vs-general-training",
    title: "IELTS Academic vs General Training: what's the difference?",
    excerpt:
      "The exact differences between IELTS Academic and General Training — who each is for, how Reading and Writing differ, and how to choose the right test.",
    category: "Basics",
    date: "July 2026",
    readMins: 7,
    keywords: [
      "ielts academic",
      "ielts general",
      "test ielts",
      "ielts exam",
      "band ielts",
      "ielts writing",
      "ielts speaking",
      "ielts price",
      "ielts general training",
      "what is ielts",
    ],
    sections: [
      { paragraphs: ["IELTS comes in two versions — Academic and General Training — and picking the wrong one can invalidate your application. They share the same Listening and Speaking tests, but the Reading and Writing sections differ significantly. Here's how to choose confidently."] },
      { heading: "Who each test is for", bullets: ["IELTS Academic — university and college admission, and professional registration (e.g. medical, engineering and accountancy bodies).", "IELTS General Training — work experience, employment, migration to countries like Australia, Canada, the UK and New Zealand, and secondary education.", "Always confirm which version your university, employer or visa route requires before booking."] },
      { heading: "What's identical", paragraphs: ["Listening and Speaking are exactly the same in both versions — same format, same timing, same scoring. So a huge part of your preparation (and everything you practise for those two skills) applies regardless of which test you take."] },
      { heading: "How Reading differs", paragraphs: ["Academic Reading uses three long texts from books, journals and newspapers, written for a general but educated audience — the language is more formal and the topics more academic. General Training Reading uses everyday materials: notices, advertisements, workplace documents and a longer general-interest passage. The question types are the same; the texts are the difference."] },
      { heading: "How Writing differs", bullets: ["Academic Task 1 — describe a graph, chart, table, map or process in at least 150 words.", "General Training Task 1 — write a letter (formal, semi-formal or informal) in response to a situation, at least 150 words.", "Task 2 — both versions write an essay of at least 250 words, but General Training essay topics are usually a little more everyday than Academic ones."] },
      { heading: "Is one easier than the other?", paragraphs: ["General Training Reading and Writing are often perceived as more approachable because the texts and topics are more familiar. However, the band requirements for migration can be high, and the scoring is calibrated so that a given band means the same level of English in both versions. Choose based on what your application requires, not on which seems easier."] },
      { heading: "Prepare for the right version", paragraphs: ["On IELTSAce you can practise for both Academic and General Training — including Academic Task 1 charts and General Training letters — with instant AI band scoring on Writing and Speaking. Set your target module when you start, and every practice set and mock test is tailored to the version you'll actually sit."] },
    ],
    faqs: [
      { q: "Can I switch between IELTS Academic and General Training?", a: "You choose the version when you book, and you should pick the one your university, employer or visa requires. If you booked the wrong version you'd generally need to register again for the correct one, so confirm before paying." },
      { q: "Is IELTS General Training easier than Academic?", a: "Its Reading and Writing use more everyday materials, which many find more familiar, but the scoring is calibrated so a given band means the same level of English in both. Choose based on what your application needs, not perceived difficulty." },
      { q: "Is IELTS Speaking the same in Academic and General Training?", a: "Yes. Listening and Speaking are identical in both versions — same format, timing and scoring. Only the Reading and Writing sections differ." },
    ],
  },
  {
    slug: "ielts-vs-toefl",
    title: "IELTS vs TOEFL: key differences and which test is right for you",
    excerpt:
      "A clear comparison of IELTS and TOEFL — format, scoring, Speaking style, acceptance and difficulty — to help you choose the test that plays to your strengths.",
    category: "Basics",
    date: "July 2026",
    readMins: 8,
    keywords: [
      "ielts vs toefl",
      "toefl",
      "test ielts",
      "ielts exam",
      "ielts academic",
      "ielts score",
      "ielts online",
      "band ielts",
      "ielts speaking",
      "which english test",
    ],
    sections: [
      { paragraphs: ["IELTS and TOEFL are the two most widely accepted English tests for study and migration. Both assess Listening, Reading, Writing and Speaking, and both are accepted by most universities — so the right choice usually comes down to test format and which one suits your strengths. Here's an honest comparison."] },
      { heading: "The headline differences", bullets: ["Speaking: IELTS is a face-to-face (or live video) interview with a real examiner; TOEFL is spoken into a microphone and recorded for later marking.", "Scoring: IELTS uses the 9-band scale (per skill and overall); TOEFL iBT is scored 0–120 (0–30 per section).", "Style: IELTS mixes British and international English and handwriting is an option on paper; TOEFL is fully computer-based and American in style.", "Question format: TOEFL leans heavily on multiple choice; IELTS uses a wider variety of question types, including short written answers."] },
      { heading: "Which suits your strengths?", paragraphs: ["If you're more comfortable talking to a person and prefer varied question types, IELTS often feels more natural. If you prefer typing all answers, speaking to a computer without an examiner watching, and multiple-choice formats, TOEFL may suit you. Neither is universally 'easier' — they reward slightly different skills."] },
      { heading: "Acceptance and cost", paragraphs: ["Both are accepted by the vast majority of universities and many immigration systems, but a few specific programmes or visa routes prefer or require one over the other — check your destination's requirement first. Costs are broadly comparable and vary by country; always verify the current local fee before booking."] },
      { heading: "Timing and results", paragraphs: ["Both tests run around 2–3 hours. Computer-delivered IELTS and TOEFL iBT typically return results within a few days; paper-based IELTS takes longer. If you need a fast turnaround, a computer-delivered option is usually best."] },
      { heading: "How to decide", bullets: ["Check whether your university or visa specifies a test — that decides it instantly.", "If both are accepted, pick the format that matches your strengths (live Speaking vs recorded, varied questions vs multiple choice).", "Take a full practice test of your chosen format to confirm before you commit."] },
      { heading: "If you choose IELTS, practise smart", paragraphs: ["Once you've decided on IELTS, focused practice on the exact format is what raises your score. IELTSAce covers every IELTS question type for Academic and General Training, gives instant AI band scoring on Writing and Speaking, and lets you sit full mock tests on real timing — so there are no surprises on test day."] },
    ],
    faqs: [
      { q: "Is IELTS easier than TOEFL?", a: "Neither is universally easier — they reward different strengths. IELTS has a live Speaking interview and varied question types; TOEFL is fully computer-based with recorded Speaking and more multiple choice. Choose the format that suits you." },
      { q: "Do universities prefer IELTS or TOEFL?", a: "The large majority of universities accept both equally. A few specific programmes or visa routes prefer one, so always check your destination's stated requirement before deciding." },
      { q: "Can I use IELTS for a US university?", a: "Yes. IELTS is widely accepted by universities in the United States as well as the UK, Canada, Australia and elsewhere. Confirm the minimum band your chosen course requires." },
    ],
  },
  {
    slug: "ielts-online-vs-paper-based",
    title: "IELTS online vs paper-based: which should you choose?",
    excerpt:
      "Computer-delivered IELTS vs paper-based IELTS — the real differences in speed, comfort and results, and how to decide which format suits you best.",
    category: "Basics",
    date: "July 2026",
    readMins: 6,
    keywords: [
      "ielts online",
      "test ielts",
      "ielts exam",
      "computer based ielts",
      "ielts academic",
      "ielts general",
      "ielts score",
      "book ielts",
      "band ielts",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["IELTS is available in two delivery formats: computer-delivered (often called 'IELTS online' or 'IELTS on computer') and paper-based. The test content, difficulty and 9-band scoring are identical — only the way you take it changes. Here's how to choose."] },
      { heading: "What's the same", paragraphs: ["Both formats test the same four skills with the same questions, timing and marking. Speaking is a live interview with an examiner in both cases (in person or by video call). A Band 7 means exactly the same thing whichever format you pick — no version is easier."] },
      { heading: "Where computer-delivered wins", bullets: ["Faster results — often within 3–5 days, versus up to 13 days for paper.", "More test dates and locations, sometimes several per day.", "Typed Writing — easier to edit, no handwriting legibility worries, and a live word count.", "Listening/Reading tools like highlighting and note-taking on screen."] },
      { heading: "Where paper-based can suit you better", bullets: ["You can annotate the question paper freely and see the whole Reading passage on one page.", "Some people concentrate better reading on paper than on screen.", "You have 10 minutes at the end of Listening to transfer answers (computer tests give 2 minutes to check)."] },
      { heading: "Which should you choose?", paragraphs: ["If you type faster than you write, want results quickly, and are comfortable reading on screen, choose computer-delivered. If you prefer writing by hand and reading on paper, choose paper-based. Whatever you pick, practise in that format so the interface feels familiar on test day."] },
      { heading: "Practise the way you'll test", paragraphs: ["If you're taking the computer-delivered test, prepare on a computer. IELTSAce runs entirely in your browser with a typed Writing editor, on-screen Listening and Reading tools, and full timed mock tests — so your practice mirrors the real computer-delivered experience, and you get instant AI band scores to track your progress."] },
    ],
  },
  {
    slug: "how-to-book-ielts-test",
    title: "How to book your IELTS test with IDP or the British Council",
    excerpt:
      "A step-by-step guide to registering for IELTS — choosing Academic or General, picking a date and format, what you need, and how to be ready before test day.",
    category: "Basics",
    date: "July 2026",
    readMins: 6,
    keywords: [
      "book ielts",
      "idp ielts",
      "british council",
      "ielts british council",
      "test ielts",
      "ielts price",
      "ielts online",
      "ielts exam",
      "ielts academic",
      "ielts general",
    ],
    sections: [
      { paragraphs: ["Booking IELTS is straightforward once you know which version and format you need. The test is delivered by the British Council and IDP: IELTS, and you register through their official booking sites. Here's the full process, step by step."] },
      { heading: "Step 1 — Confirm which test you need", paragraphs: ["Check your university, employer or visa requirement for two things: the IELTS version (Academic or General Training) and the minimum band score, including any per-skill minimums. Booking the wrong version is the most common — and most costly — mistake, so confirm this first."] },
      { heading: "Step 2 — Choose your format and date", bullets: ["Decide between computer-delivered (faster results, more dates) and paper-based.", "Pick a test date that leaves you enough preparation time — and, if results feed an application deadline, enough buffer afterwards.", "Note whether Speaking is on the same day or scheduled separately."] },
      { heading: "Step 3 — Register and pay", paragraphs: ["Create an account on the official British Council or IDP booking site for your country, select your test type, date and location, and complete payment. The fee varies by country, so check the current local price during booking. You'll need a valid passport or accepted national ID — and the exact same ID must be presented on test day."] },
      { heading: "Step 4 — Prepare for test day", bullets: ["Bring the same identity document you registered with — no exceptions.", "Arrive early; latecomers are usually refused entry.", "Know your test centre's rules on what you can bring into the room.", "For computer-delivered tests, arrive familiar with the on-screen interface."] },
      { heading: "Step 5 — Get results and plan a retake if needed", paragraphs: ["Results (the Test Report Form) arrive within a few days for computer-delivered tests, or up to about two weeks for paper. If you fall short in one skill, you can now retake a single section with 'One Skill Retake' in many locations, rather than sitting the whole test again — check availability in your country."] },
      { heading: "Be ready before you book", paragraphs: ["The best time to book is when your practice scores are consistently at or above your target band. On IELTSAce you can benchmark yourself with full mock tests on real timing and get AI band scoring on Writing and Speaking — so you book your test date with confidence, not hope."] },
    ],
  },
  {
    slug: "ielts-speaking-band-descriptors",
    title: "IELTS Speaking band descriptors explained: Band 6 vs 7 vs 8",
    excerpt:
      "What examiners actually look for in IELTS Speaking — the four criteria decoded, and the concrete differences between Band 6, 7 and 8 with fixes for each.",
    category: "Speaking",
    date: "July 2026",
    readMins: 9,
    keywords: [
      "ielts speaking band descriptors",
      "ielts speaking",
      "band ielts",
      "ielts speaking test",
      "ielts pronunciation",
      "ielts practice",
      "ielts speaking part 2",
      "ielts speaking part 3",
      "ielts score",
      "ielts exam",
    ],
    sections: [
      { paragraphs: ["IELTS Speaking is scored on four equally-weighted criteria, and your band is the average of them. Understanding what each band actually means — and the specific gap between Band 6 and Band 7 — is the fastest way to stop losing marks. Here's each criterion decoded, with the concrete difference between the bands."] },
      { heading: "The four criteria", bullets: ["Fluency & Coherence — how smoothly and logically you speak.", "Lexical Resource — the range and precision of your vocabulary.", "Grammatical Range & Accuracy — the variety and correctness of your structures.", "Pronunciation — how clearly and naturally you're understood."] },
      { heading: "Fluency & Coherence: 6 vs 7 vs 8", paragraphs: ["Band 6 — willing to speak at length, but with noticeable hesitation, repetition and self-correction that sometimes breaks the flow. Band 7 — speaks at length without much effort, and uses a range of connectives and discourse markers flexibly (though not perfectly). Band 8 — fluent with only occasional repetition; hesitation is to find ideas, not language.", "The fix from 6 to 7: stop searching for perfect words. Keep talking, use natural fillers to buy time, and link ideas with varied connectives rather than repeating 'and' and 'because'."] },
      { heading: "Lexical Resource: 6 vs 7 vs 8", paragraphs: ["Band 6 — enough vocabulary to discuss topics, with some inaccurate or repeated word choices. Band 7 — uses less common and idiomatic vocabulary, shows awareness of style, and paraphrases effectively. Band 8 — a wide resource used fluently and precisely, with skilful paraphrase.", "The fix: build topic-based collocations (not random 'big words'), and practise paraphrasing so you never repeat the question's exact wording."] },
      { heading: "Grammatical Range & Accuracy: 6 vs 7 vs 8", paragraphs: ["Band 6 — a mix of simple and complex sentences, but with frequent errors in the complex ones. Band 7 — a range of complex structures with frequent error-free sentences. Band 8 — a wide range used flexibly, with only occasional slips.", "The fix: don't play it safe with only simple sentences (that caps you at 6). Deliberately use conditionals, relative clauses and a range of tenses — accuracy under a little risk is what earns Band 7."] },
      { heading: "Pronunciation: 6 vs 7 vs 8", paragraphs: ["Band 6 — generally understood, though mispronunciation occasionally reduces clarity. Band 7 — uses a range of pronunciation features (stress, rhythm, intonation) with control, and is easy to understand. Band 8 — a wide range of features, sustained and flexible, with first-language accent having minimal effect.", "The fix: accent is not marked — clarity is. Work on word and sentence stress and natural intonation rather than trying to erase your accent."] },
      { heading: "The mindset shift from 6.5 to 7.5", paragraphs: ["Most candidates stuck at 6.5 are playing it safe: short answers, simple grammar, and cautious vocabulary. The higher bands reward controlled risk — extended answers, complex structures, precise idiomatic language, and expressive intonation. Practise stretching every answer just beyond your comfort zone."] },
      { heading: "Track your bands as you practise", paragraphs: ["You improve fastest when you can see which criterion is holding you back. On IELTSAce, every Speaking answer you record is AI-scored against all four descriptors — Fluency, Lexical Resource, Grammar and Pronunciation — so you know precisely where your Band 6 is really a 7, and which one to push next."] },
    ],
  },
  /* ---------------------------------------------------------------- *
   * Earlier posts
   * ---------------------------------------------------------------- */
  {
    slug: "how-ielts-band-score-is-calculated",
    title: "How the IELTS band score is calculated — and how to raise it",
    excerpt: "The 9-band scale, how each section is scored, how the overall band is rounded, and where the easiest half-bands hide.",
    category: "Scoring",
    date: "July 2026",
    readMins: 6,
    keywords: ["band ielts", "ielts score", "ielts band score", "ielts writing", "ielts speaking", "reading ielts", "listening ielts", "ielts academic", "ielts general", "test ielts"],
    sections: [
      { paragraphs: ["IELTS reports scores on a 9-band scale, from Band 1 (non-user) to Band 9 (expert). You receive a band for each of the four skills — Listening, Reading, Writing and Speaking — plus an overall band. Understanding exactly how those numbers are produced is the fastest way to stop losing marks you don't need to."] },
      { heading: "Listening and Reading: raw score → band", paragraphs: ["Both are marked out of 40. Your raw score (the number of correct answers) is converted to a band using a fixed conversion table. As a rough guide, around 30/40 maps to Band 7 and 35/40 to Band 8, though the exact table varies slightly by test. Every mark counts, and spelling and grammar must be correct."] },
      { heading: "Writing and Speaking: four criteria", paragraphs: ["These are marked by criteria, each weighted equally:"], bullets: ["Task Achievement / Task Response", "Coherence & Cohesion (Fluency & Coherence in Speaking)", "Lexical Resource", "Grammatical Range & Accuracy (plus Pronunciation in Speaking)"] },
      { heading: "How the overall band is rounded", paragraphs: ["Your overall band is the average of the four skill bands, rounded to the nearest half-band. A .25 average rounds up to the next half-band, and .75 rounds up to the next whole band. So a 6.75 average becomes 7.0 — meaning a single half-band in your weakest skill can lift your overall score.", "Within Writing, Task 2 counts twice as much as Task 1, so protect your Task 2 time."] },
      { heading: "Where the easiest half-bands hide", bullets: ["Listening/Reading: fix careless spelling and word-limit errors — pure lost marks.", "Writing: add a clear overview (Task 1) and a consistent position (Task 2).", "Speaking: extend every answer with a reason and an example.", "Target your weakest skill — rounding rewards lifting the lowest number."] },
    ],
    faqs: [
      { q: "Is Band 6.5 a good IELTS score?", a: "Band 6.5 shows a competent user and is enough for many undergraduate courses and some visa routes. However, competitive universities and professional registrations often ask for 7.0 or higher, so check your specific requirement." },
      { q: "How is the overall IELTS band calculated?", a: "It's the average of your four skill bands (Listening, Reading, Writing, Speaking), rounded to the nearest half-band. An average ending in .25 rounds up to the next half-band and .75 rounds up to the next whole band." },
      { q: "Can I raise my IELTS band quickly?", a: "Yes — because the overall band is an average, lifting your single weakest skill by half a band is often the fastest route. Fixing careless Listening/Reading errors and adding a clear Writing structure are the quickest wins." },
    ],
  },
  {
    slug: "writing-mistakes-stuck-at-6-5",
    title: "7 mistakes that keep you stuck at Band 6.5 in Writing",
    excerpt: "The recurring habits that cap fluent writers at 6.5 — and the specific fixes that move you to 7 and beyond.",
    category: "Writing",
    date: "July 2026",
    readMins: 7,
    keywords: ["ielts writing", "band ielts", "ielts writing task 2", "ielts writing task 1", "ielts score", "ielts academic", "ielts practice", "ielts exam", "lexical resource", "test ielts"],
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
    keywords: ["ielts practice", "ielts study plan", "test ielts", "ielts exam", "band ielts", "ielts online", "ielts writing", "ielts speaking", "reading ielts", "listening ielts"],
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
