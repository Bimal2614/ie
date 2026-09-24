/**
 * Blog content. Real, useful IELTS articles as data — add entries here and both
 * the index and the article page pick them up (and the sitemap). Newest first.
 *
 * `keywords` drives the per-article <meta keywords> and BlogPosting JSON-LD, and
 * is the SEO target list for each post — write the body to serve those queries.
 * Every call-to-action points at IELTSVega; we never link to other platforms.
 */

import type { BlogPost } from "./blog-types";
import { TOPIC_POSTS_2026 } from "./blog-2026-topics";
import { PRACTICE_POSTS } from "./blog-practice";
import { PARTNER_POSTS } from "./blog-partners";

/** Re-exported so `import type { BlogPost } from "@/lib/blog"` keeps working. */
export type { BlogPost, BlogSection } from "./blog-types";

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
    title: "Recent IELTS Speaking questions: July 2026 (Part 1, 2 & 3)",
    excerpt:
      "The IELTS Speaking topics most reported in the July 2026 cycle: real-style Part 1, 2 and 3 questions, cue cards, and model answers you can practise today.",
    category: "Speaking",
    date: "July 2026",
    publishedAt: "2026-07-05",
    updatedAt: "2026-09-14",
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
      { paragraphs: ["IELTS Speaking topics rotate on a roughly three-to-four-month cycle, and the same themes are reported by test takers around the world during each window. Below are the topics most commonly reported in the July 2026 cycle, grouped by Part 1, 2 and 3, with sample questions and model approaches. These are representative topic round-ups compiled from candidate reports, not official exam content, so treat them as high-value practice material, not a script."] },
      { heading: "Part 1: familiar topics reported this month", paragraphs: ["Part 1 asks short questions about you and your life. Commonly reported July 2026 topic areas:"], bullets: ["Hometown & home: where do you live? What do you like about it? Would you move?", "Work or study: what do you do? Why did you choose it? What's the hardest part?", "Daily routine & mornings: are you a morning person? Has your routine changed?", "Technology & phones: how often do you use your phone? What apps do you use most?", "Weather & seasons: What's your favourite season? Does weather affect your mood?", "Music: what music do you like? Has your taste changed since childhood?"] },
      { heading: "Part 1 model answer", paragraphs: ["Q: Do you prefer texting or calling your friends?", "Model: \"I'm definitely a texter. It's quicker and I can reply whenever suits me, whereas a call sometimes comes at a bad moment. That said, if something's important or emotional, I'll always call. You just can't read someone's tone in a message.\""] },
      { heading: "Part 2: cue cards reported this cycle", paragraphs: ["Part 2 gives you a card, one minute to prepare, and 1-2 minutes to speak. Cue cards commonly reported in July 2026:"], bullets: ["Describe a skill you would like to learn.", "Describe a person who has influenced you.", "Describe a time you helped someone.", "Describe a place you visited that was full of history.", "Describe an app or website you find useful.", "Describe a decision that took you a long time to make."] },
      { heading: "Part 2 model approach: 'a skill you would like to learn'", paragraphs: ["Use your prep minute to note one keyword per bullet, then tell it as a small story so you never run dry: \"The skill I'd most like to learn is public speaking. I first realised I needed it during a university presentation when my nerves got the better of me… I'd learn it by joining a local speaking club and recording myself… and honestly it would change my life, because confidence in front of people opens doors in almost every career.\" Spend the most time on the final 'explain how it would change your life' prompt. That's where the higher bands are won."] },
      { heading: "Part 3: discussion questions reported this cycle", paragraphs: ["Part 3 broadens your Part 2 topic into abstract discussion. Commonly reported follow-ups:"], bullets: ["Skills & learning: Should schools teach practical skills? Do people learn better from teachers or on their own?", "Influence & role models. Who influences young people most today? Is celebrity influence a good thing?", "Technology: Has technology made us more or less social? Will it replace human jobs?", "History & places: why is it important to preserve old buildings? Should governments fund museums?"] },
      { heading: "Part 3 model answer", paragraphs: ["Q: Do you think people rely too much on technology today?", "Model: \"In some ways, yes. We reach for our phones for things our parents did from memory. Directions, arithmetic, even remembering birthdays. On the other hand, I'd argue it's less 'over-reliance' and more a sensible shift: if a tool does something faster and frees your mind for harder problems, that's progress. The real risk is losing skills entirely, so a balance matters.\""] },
      { heading: "How to use these questions", bullets: ["Record yourself answering: don't just read. Fluency comes from speaking, not planning.", "Time Part 2 strictly: one minute prep, then two minutes talking without stopping.", "For every Part 3 answer, give an opinion, a reason, and a 'that said…' counterpoint.", "Review against the four criteria: Fluency, Vocabulary, Grammar, Pronunciation."] },
      { heading: "Practise this month's topics with instant feedback", paragraphs: ["Reading questions isn't practice: speaking them is. On IELTSVega you can record answers to real Part 1, 2 and 3 questions (with the built-in Part 2 prep timer), then get instant AI band scoring against all four Speaking criteria. Run through this month's topics a few at a time and your confidence builds fast before test day."] },
    ],
    faqs: [
      { q: "Are these the real IELTS Speaking questions for July 2026?", a: "No, and you should be wary of any site that claims otherwise. Live IELTS questions are confidential. These are the topic areas most commonly reported by candidates after their tests, which is a different and more useful thing: the themes recur even though the exact wording changes. Practise the topic, not the sentence." },
      { q: "Do IELTS Speaking topics repeat?", a: "Topic areas repeat constantly. Work, study, hometown, technology, travel and free time come up in almost every cycle, and Part 2 cue cards are drawn from a fairly stable pool of people, places, objects, events and experiences. What changes is the precise phrasing, which is why preparing ideas around a theme works and memorising a script does not." },
      { q: "How long should a Part 1 answer be?", a: "Two to three sentences. Answer the question, then add one reason, example or contrast. One-word answers cost you marks under Fluency and Coherence because you give the examiner nothing to assess, and a ninety-second monologue in Part 1 is equally wrong for the format." },
      { q: "Can I memorise answers for IELTS Speaking?", a: "No. Examiners are trained to identify memorised language, and it is explicitly penalised under Fluency and Coherence. Memorised answers also tend to stop matching the question, which is obvious to a listener. Prepare ideas and vocabulary for a topic, then build the sentences live." },
    ],
  },
  {
    slug: "recent-ielts-speaking-questions-june-2026",
    title: "Recent IELTS Speaking questions: June 2026 (Part 1, 2 & 3)",
    excerpt:
      "The IELTS Speaking topics reported in the June 2026 cycle: Part 1 questions, Part 2 cue cards and Part 3 discussion prompts, with tips for answering each.",
    category: "Speaking",
    date: "June 2026",
    publishedAt: "2026-06-05",
    updatedAt: "2026-09-14",
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
      { paragraphs: ["Here are the IELTS Speaking topics most commonly reported by candidates during the June 2026 cycle, across all three parts. As always, exact wording varies by examiner and test centre, and these are candidate-reported topic round-ups rather than official questions, so use them to build fluency on likely themes, not to memorise scripts (which examiners penalise)."] },
      { heading: "Part 1: reported topics", bullets: ["Hometown, neighbours and where you live.", "Studies or job, and future plans.", "Hobbies and free time: reading, sports, cooking.", "Food and cooking: do you cook? favourite meals?", "Travel and holidays: do you prefer city or nature trips?", "Photos: do you take many? do you prefer taking or being in them?"] },
      { heading: "Part 2: cue cards reported this cycle", bullets: ["Describe a book you enjoyed reading.", "Describe a place you like to relax.", "Describe an important journey you took.", "Describe a piece of good news you received.", "Describe a person who is a good leader.", "Describe something you bought that you were happy with."] },
      { heading: "Part 2 model approach: 'a place you like to relax'", paragraphs: ["Anchor it in the senses and a story: \"The place I go to relax is a small park near my flat. What makes it special is how quiet it is early in the morning, just birdsong and a bit of mist over the pond. I usually go there when work has been stressful… and it resets me completely.\" Cover all four bullets, but let the 'why it's special / how you feel there' part run longest."] },
      { heading: "Part 3: discussion prompts", bullets: ["Reading & books: are people reading less than before? Should children be encouraged to read more?", "Leadership: what makes a good leader? Are leaders born or made?", "Travel: does tourism help or harm local communities? Will people travel more in the future?", "News & media: how do people get news today? Can we trust online news?"] },
      { heading: "Answering Part 3 well", paragraphs: ["Part 3 is where Band 7+ is decided. Don't give one-line answers. Take a position, justify it with a reason and example, then acknowledge another view. Useful frames: \"It depends on…\", \"On the one hand… on the other hand…\", \"I'd argue that…\". Speculating about the future (\"I imagine that…\", \"it's likely that…\") shows grammatical range examiners reward."] },
      { heading: "Turn topics into real practice", paragraphs: ["Pick three cue cards above and record a full two-minute answer for each. On IELTSVega you can do exactly that with real IELTS Speaking questions and instant AI band feedback on fluency, vocabulary, grammar and pronunciation, so you find and fix your weak criterion before the exam."] },
    ],
    faqs: [
      { q: "How often do IELTS Speaking questions change?", a: "Part 1 topics are stable across months. Part 2 cue cards rotate on a broad cycle, so a card reported in one month can reappear later in the year with different wording. Treat any monthly list as a guide to the themes in circulation rather than a set of questions to learn." },
      { q: "How long do I get for the Part 2 cue card?", a: "One minute to make notes, then one to two minutes to speak. The examiner will stop you at two minutes. Use the preparation minute to note a sequence of points rather than full sentences, because reading aloud from notes breaks your fluency." },
      { q: "Does the examiner mark my ideas or my English?", a: "Your English. There are no right or wrong opinions in IELTS Speaking, and an unusual or even implausible answer costs you nothing as long as it is expressed well. You are marked on fluency, vocabulary, grammar and pronunciation, never on the quality of your argument." },
      { q: "What happens if I do not understand the question?", a: "Ask. In Parts 1 and 3 you can ask the examiner to repeat a question, and asking for clarification in natural English is not penalised. What is penalised is answering a different question because you guessed. In Part 2 the cue card stays in front of you, so you can re-read it." },
    ],
  },
  {
    slug: "recent-ielts-writing-task-2-topics-july-2026",
    seoTitle: "Recent IELTS Writing Task 2 Topics: July 2026",
    title: "Recent IELTS Writing Task 2 topics: July 2026 (with essay plans)",
    excerpt:
      "The IELTS Writing Task 2 essay questions and themes commonly reported this July 2026 cycle. Grouped by type, with quick plans and a Band 8 opening for each.",
    category: "Writing",
    date: "July 2026",
    publishedAt: "2026-07-10",
    updatedAt: "2026-09-14",
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
      { paragraphs: ["IELTS Writing Task 2 asks you to write a 250-word essay responding to a prompt, and the same themes recur every cycle. Below are the Task 2 topic areas and question types most commonly reported in July 2026, grouped so you can prepare ideas in advance, then a quick plan and a strong opening line for each. These are representative themes from candidate reports, not official questions."] },
      { heading: "The five recurring theme areas", bullets: ["Education: online vs classroom learning, subjects schools should teach, exams vs continuous assessment.", "Technology: social media's effect on relationships, AI replacing jobs, screen time for children.", "Environment: individual vs government responsibility, plastic and consumption, city planning.", "Work: work-life balance, remote working, changing jobs frequently.", "Society & culture: globalisation and local culture, ageing populations, crime and punishment."] },
      { heading: "Know your four question types", paragraphs: ["Whatever the theme, Task 2 comes in a few fixed formats. Identify yours before you write. The structure depends on it:"], bullets: ["Opinion (agree/disagree): state a clear position and defend it throughout.", "Discussion (discuss both views + your opinion): one body paragraph per view, then your stance.", "Problem/solution (or cause/solution): one paragraph on causes/problems, one on solutions.", "Two-part (direct questions): answer each question in its own paragraph."] },
      { heading: "Reported question 1: Technology (opinion)", paragraphs: ["\"Some people believe that social media has done more harm than good to personal relationships. To what extent do you agree or disagree?\"", "Plan: State a clear position (e.g. mostly agree). Body 1, harms: shallow interactions, comparison and anxiety. Body 2, the genuine upside: staying connected across distance. Conclusion, restate, with a balanced qualifier.", "Band 8 opening: \"While social media has undeniably made staying in touch effortless, I largely agree that it has weakened the depth of our personal relationships rather than strengthened them.\""] },
      { heading: "Reported question 2: Education (discussion)", paragraphs: ["\"Some think children should study a wide range of subjects; others believe they should focus only on subjects useful for their future career. Discuss both views and give your opinion.\"", "Plan: Body 1, the case for breadth (well-rounded thinking, keeping options open). Body 2, the case for focus (depth, employability). Conclusion. Your view (e.g. breadth first, specialisation later).", "Band 8 opening: \"Whether young people benefit more from a broad education or an early focus on career-relevant subjects is a genuine dilemma, and while both have merit, I believe breadth should come first.\""] },
      { heading: "Reported question 3: Environment (problem/solution)", paragraphs: ["\"Many cities are becoming increasingly polluted. What are the causes of this, and what measures can be taken to solve the problem?\"", "Plan: Body 1, causes: traffic, industry, poor planning. Body 2, solutions: public transport investment, emissions rules, green urban design. Keep causes and solutions in separate paragraphs.", "Band 8 opening: \"Urban pollution has worsened sharply in recent decades, driven largely by traffic and unchecked industrial growth; addressing it will require decisive action from both governments and individuals.\""] },
      { heading: "How to prepare Task 2 efficiently", bullets: ["Prepare ideas by theme, not by memorising essays. You can't predict the exact prompt.", "Always write a clear thesis in the introduction and hold it to the conclusion.", "Develop each idea fully: point → explain → example → link. Two developed ideas beat five listed ones.", "Practise under 40 minutes so timing is automatic on test day."] },
      { heading: "Get your essays scored instantly", paragraphs: ["Writing a plan is easy; hitting the band descriptors under time is the hard part. On IELTSVega you can write real Task 2 essays on prompts like these and get instant AI band scoring on all four criteria, Task Response, Coherence, Lexical Resource and Grammar, with feedback on exactly what's holding your band down. Fix the pattern, not just one essay."] },
    ],
    faqs: [
      { q: "Do IELTS Writing Task 2 topics repeat?", a: "The theme areas repeat far more than the questions do. Education, technology, environment, work and society account for the large majority of Task 2 prompts, so building a bank of arguments and examples in those areas transfers directly to whatever question you are given. The specific statement will be new." },
      { q: "How many words should IELTS Writing Task 2 be?", a: "At least 250. Aim for 260 to 290. Writing under the minimum is penalised directly, but writing 400 words is not rewarded and usually costs you accuracy and time. Task 2 is worth twice Task 1, so give it 40 of your 60 minutes." },
      { q: "Is it better to agree or disagree in an opinion essay?", a: "Neither. Examiners mark how clearly you hold and support a position, not which position you take. Pick whichever side you can argue with more specific examples, state it in the introduction, and keep it consistent to the conclusion. A partial agreement is fine if it is stated clearly rather than used to avoid committing." },
      { q: "Do I need real facts and statistics in Task 2?", a: "No, and inventing statistics is a common way to sound less credible rather than more. Hypothetical and general examples are entirely acceptable. What earns marks is developing an idea to its consequence, not the citation attached to it." },
    ],
  },
  /* ---------------------------------------------------------------- *
   * Rising-query cluster (Aug 2026) — test-centre, booking, fee, format
   * and requirement intent: "ielts centres near me", "ielts slot booking",
   * "one skill retake", "ielts vs pte vs duolingo". Lives in
   * blog-2026-topics.ts.
   * ---------------------------------------------------------------- */
  ...TOPIC_POSTS_2026,

  /* ---------------------------------------------------------------- *
   * Practice / platform cluster (Aug-Sep 2026) — "best ielts practice
   * platform", "free ielts mock test", "ielts writing checker" and the
   * per-skill practice queries. Lives in blog-practice.ts.
   * ---------------------------------------------------------------- */
  ...PRACTICE_POSTS,

  /* ---------------------------------------------------------------- *
   * B2B cluster (Sep 2026) — the only posts on the site written for
   * someone who BUYS for candidates rather than for a candidate:
   * "ielts software for coaching institutes", "white label ielts
   * platform", "ielts franchise cost". Every one converts to
   * /partners, not to a free account. Lives in blog-partners.ts.
   * ---------------------------------------------------------------- */
  ...PARTNER_POSTS,

  /* ---------------------------------------------------------------- *
   * SEO pillar posts (2026) — targeting the highest-volume and rising
   * IELTS queries. Each is written to genuinely answer the query, then
   * points the reader into IELTSVega practice.
   * ---------------------------------------------------------------- */
  {
    slug: "what-is-ielts-complete-guide",
    seoTitle: "What is IELTS? A Complete Beginner's Guide",
    title: "What is IELTS? A complete beginner's guide to the exam (2026)",
    excerpt:
      "What IELTS is, who accepts it, Academic vs General Training, the four sections, how band scores work, and how to start practising as a first-time test taker.",
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
      { paragraphs: ["IELTS, the International English Language Testing System, is the world's most widely accepted English test for study, work and migration. If you're planning to study abroad, apply for a skilled visa, or register with a professional body in an English-speaking country, IELTS is very likely the test you'll sit. This guide explains exactly what the IELTS exam is, how it's structured, how it's scored, and how to start preparing efficiently."] },
      { heading: "What does the IELTS test actually measure?", paragraphs: ["IELTS measures your real-world English across four skills, Listening, Reading, Writing and Speaking, rather than testing grammar rules in isolation. It's jointly run by the British Council, IDP: IELTS Australia, and Cambridge University Press & Assessment, and results are recognised by more than 12,000 organisations worldwide, including universities, employers and immigration authorities."] },
      { heading: "IELTS Academic vs IELTS General Training", paragraphs: ["There are two versions of the test, and choosing the right one matters:"], bullets: ["IELTS Academic: for university/college admission and professional registration. The Reading and Writing tasks use academic language and data (graphs, processes, diagrams).", "IELTS General Training: for work, migration, and secondary education. Reading and Writing focus on everyday and workplace English (including a letter task).", "Listening and Speaking are identical in both versions."] },
      { heading: "The four sections at a glance", bullets: ["Listening: 30 minutes, 40 questions, four recordings. The audio plays once only.", "Reading: 60 minutes, 40 questions, three passages (academic texts, or general/workplace texts).", "Writing: 60 minutes, two tasks. Task 2 (an essay) is worth twice Task 1.", "Speaking: an 11-14 minute face-to-face (or video-call) interview in three parts."] },
      { heading: "How long is the test and what's the format?", paragraphs: ["Listening, Reading and Writing are completed back-to-back in about 2 hours 45 minutes with no breaks. Speaking may be on the same day or up to a week before or after. You can take IELTS on paper or on a computer. The content and scoring are identical; only the interface differs (computer tests usually return results faster)."] },
      { heading: "How is IELTS scored?", paragraphs: ["Every skill is reported on a 9-band scale, from Band 1 (non-user) to Band 9 (expert user), in half-band steps. Listening and Reading are marked out of 40 and converted to a band. Writing and Speaking are marked by trained examiners against four equally-weighted criteria. Your overall band is the average of the four skills, rounded to the nearest half-band, so lifting your weakest skill by half a band is often the fastest way to raise your overall score.", "Most universities ask for an overall Band 6.0-7.0 with no skill below a set minimum; many visa routes specify an exact band. Always check the exact requirement for your course or visa before you book."] },
      { heading: "Is IELTS hard? What most people underestimate", paragraphs: ["The English itself is rarely the problem: it's the format and timing. Listening plays only once. Reading punishes slow readers. Writing rewards a very specific structure (a clear Task 1 overview and a consistent Task 2 position). Speaking rewards extended, developed answers. Learning these patterns is what separates a 6.5 from a 7.5, and it's exactly what focused practice fixes."] },
      { heading: "How to start preparing", paragraphs: ["A simple, effective sequence: (1) take a timed practice test in each skill to find your baseline, (2) learn the marking criteria so you know what examiners reward, (3) drill your weakest question types with instant feedback, and (4) sit full mock tests to build stamina and pacing.", "On IELTSVega you can do all four in one place: practise every question type for both Academic and General Training, get instant AI band scoring on Writing and Speaking, and sit full-length mock tests on real exam timing. It's free to start, so you can find your baseline today."] },
    ],
    faqs: [
      { q: "Is IELTS hard?", a: "For most people the English itself isn't the hardest part: the format and timing are. Listening plays only once, Reading is time-pressured, and Writing and Speaking reward a specific structure. Learning those patterns with focused practice is what raises your score." },
      { q: "How long is an IELTS score valid?", a: "An IELTS Test Report Form is normally valid for two years from the test date. Check the specific requirement of your university or visa route, as some accept a shorter window." },
      { q: "What is a good IELTS score?", a: "It depends on your goal. Many universities ask for an overall Band 6.0-7.0 with no skill below a set minimum, while some competitive courses and visas require 7.0+. Always confirm the exact band your programme needs." },
      { q: "Should I take IELTS Academic or General Training?", a: "Take Academic for university admission or professional registration, and General Training for work, migration or secondary education. Listening and Speaking are identical in both; only Reading and Writing differ." },
    ],
  },
  {
    slug: "ielts-speaking-parts-questions-answers",
    seoTitle: "IELTS Speaking Parts 1, 2 & 3: Questions & Answers",
    title: "IELTS Speaking Parts 1, 2 & 3: sample questions and model answers",
    excerpt:
      "How the IELTS Speaking test is structured, real sample questions for Parts 1-3, model answers, and the exact techniques that move you from Band 6 to Band 8.",
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
      { paragraphs: ["The IELTS Speaking test is an 11-14 minute conversation with a real examiner, scored on four criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation. It's the same in Academic and General Training. This guide walks through all three parts with sample questions and model answers, and shows the techniques examiners reward."] },
      { heading: "Part 1: Introduction and interview (4-5 minutes)", paragraphs: ["The examiner asks familiar questions about you: home, work or study, hobbies, and everyday topics. The trap is answering too briefly. Aim for two to three sentences: a direct answer, a reason, and a small detail or example."] },
      { heading: "Part 1 sample question + model answer", paragraphs: ["Q: Do you prefer to study in the morning or the evening?", "Model: \"Definitely the morning. My mind is freshest just after breakfast, so I get through difficult material much faster than I would at night. By the evening I'm usually too tired to concentrate, so I save that time for lighter tasks like reviewing vocabulary.\""] },
      { heading: "Part 2: the long turn (3-4 minutes)", paragraphs: ["You get a cue card with a topic and prompts, one minute to prepare with notes, then you speak for 1-2 minutes uninterrupted. Use your prep minute to jot keywords for each bullet, and structure your talk with a beginning, middle and a reflective ending."] },
      { heading: "Part 2 sample cue card + how to answer", paragraphs: ["Cue card: Describe a skill you would like to learn. You should say: what the skill is, why you want to learn it, how you would learn it, and explain how it would change your life.", "Cover every bullet, but spend most time on the 'explain' prompt. That's where you show range. Tell a small story rather than listing facts: \"The skill I'd most like to learn is coding… I first became interested when…\" Narrative keeps you fluent and fills the two minutes naturally."] },
      { heading: "Part 3: two-way discussion (4-5 minutes)", paragraphs: ["The examiner asks broader, more abstract questions linked to your Part 2 topic. This is where you earn the higher bands, so give opinions, compare, speculate and justify. Use phrases like \"It depends on…\", \"On the one hand… on the other…\", and \"I'd argue that…\"."] },
      { heading: "Part 3 sample question + model answer", paragraphs: ["Q: Do you think schools should teach practical skills as well as academic subjects?", "Model: \"Absolutely, and I'd argue they're just as important. Academic knowledge matters, but many graduates leave school unable to manage money or communicate well in an interview. If schools built in practical skills, basic finance, public speaking, even simple coding, students would be far better prepared for real life. That said, the challenge is fitting it into an already crowded timetable.\""] },
      { heading: "The four things examiners actually reward", bullets: ["Fluency: keep going. A little hesitation is fine; long silences are not. Fillers like \"that's an interesting question\" buy thinking time.", "Vocabulary: precise collocations and idiomatic phrases beat rare 'big words' used incorrectly.", "Grammar: mix simple and complex sentences, and use a range of tenses accurately.", "Pronunciation: clarity and natural sentence stress matter far more than accent. You do not need to sound British or American."] },
      { heading: "Common mistakes that cap your score", bullets: ["One-word or one-line answers in Part 1.", "Memorised speeches: examiners spot them instantly and mark them down.", "Running out of things to say in Part 2 (fix this by telling a story, not listing).", "Giving yes/no answers in Part 3 instead of developing a position."] },
      { heading: "How to practise Speaking effectively", paragraphs: ["Speaking improves fastest with recorded practice and honest feedback. On IELTSVega you can practise real Part 1, 2 and 3 questions, record your answers with the built-in timer (including the Part 2 preparation minute), and get instant AI scoring against all four Speaking criteria, including pronunciation. Do a few every day and your fluency compounds quickly."] },
    ],
    faqs: [
      { q: "How long is the IELTS Speaking test?", a: "The Speaking test lasts 11-14 minutes in total: Part 1 is 4-5 minutes, Part 2 is 3-4 minutes (including one minute of preparation), and Part 3 is 4-5 minutes of discussion." },
      { q: "Does my accent affect my IELTS Speaking score?", a: "No: accent is not marked. Pronunciation is scored on how clearly you're understood, using features like word stress, rhythm and intonation. You don't need a British or American accent to reach Band 8." },
      { q: "Can I ask the examiner to repeat a question?", a: "Yes, in Part 1 and Part 3 you can politely ask the examiner to repeat or rephrase a question. In Part 2 you speak from the cue card, so use your one-minute preparation time to plan." },
    ],
  },
  {
    slug: "ielts-writing-task-1-guide-band-9",
    seoTitle: "IELTS Writing Task 1: Step-by-Step Band 9 Guide",
    title: "IELTS Writing Task 1: a step-by-step guide with Band 9 examples",
    excerpt:
      "How to structure IELTS Academic Writing Task 1: how to write a high-scoring overview, describe data accurately, and reach Band 9, with a full model answer.",
    category: "Writing",
    date: "July 2026",
    updatedAt: "2026-09-14",
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
      { paragraphs: ["In IELTS Academic Writing Task 1 you describe a visual, a line graph, bar chart, pie chart, table, map or process diagram, in at least 150 words in about 20 minutes. In General Training, Task 1 is a letter instead. This guide focuses on the Academic data task and gives you a repeatable structure that reaches Band 7+ every time, plus a Band 9 model answer."] },
      { heading: "What Task 1 is really testing", paragraphs: ["You're marked on four criteria: Task Achievement (did you select and report the key features with accurate data?), Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. You are NOT asked for opinions or reasons, just an accurate, well-organised description of what the data shows."] },
      { heading: "A four-paragraph structure that works", bullets: ["Introduction: paraphrase the question (say what the visual shows). One sentence.", "Overview. The single most important paragraph: 2-3 sentences naming the biggest trends or differences, with NO specific numbers.", "Body 1: describe the first group of key features with data.", "Body 2: describe the remaining key features with data."] },
      { heading: "The overview is where marks are won or lost", paragraphs: ["Without a clear overview you are capped at Band 5 for Task Achievement, no matter how accurate your figures are. The overview zooms out: what's the highest, the lowest, the overall direction, the biggest gap? Signal it with \"Overall, …\" so the examiner can't miss it."] },
      { heading: "Language for describing data", bullets: ["Increase: rose, climbed, surged, grew, went up.", "Decrease: fell, declined, dropped, plummeted, decreased.", "Stability: remained stable, held steady, plateaued, levelled off.", "Degree + speed: a sharp rise, a gradual decline, a slight increase, a dramatic fall.", "Vary your grammar: \"Sales rose sharply\" (verb + adverb) and \"There was a sharp rise in sales\" (adjective + noun)."] },
      { heading: "Band 9 model answer (line graph: coffee vs tea consumption)", paragraphs: ["Introduction: \"The line graph illustrates how much coffee and tea were consumed per person in a European country between 2000 and 2020.\"", "Overview: \"Overall, coffee consumption rose steadily across the period and overtook tea, which had been the more popular drink at the start but declined consistently by the end.\"", "Body 1: \"In 2000, tea was clearly dominant at around 4 kg per person, compared with just 2 kg for coffee. Tea then fell gradually, dipping below 3 kg by 2010 and reaching roughly 2 kg by 2020.\"", "Body 2: \"Coffee, meanwhile, climbed steadily throughout, passing tea at approximately 3 kg around 2012 before peaking at about 4.5 kg in 2020. More than double its starting figure.\""] },
      { heading: "Timing and word count", paragraphs: ["Spend no more than 20 minutes on Task 1 and leave 40 for Task 2 (it's worth twice the marks). Write at least 150 words, under-length answers are penalised, but don't pad; examiners reward selection of key features, not every tiny detail."] },
      { heading: "Task 1 vs Task 2: don't confuse them", paragraphs: ["Task 1 is a factual description (150+ words, 20 minutes); Task 2 is an argumentative essay (250+ words, 40 minutes) worth double. If you're short on time, protect Task 2. A strong essay lifts your Writing band more than a perfect Task 1."] },
      { heading: "Practise with instant band feedback", paragraphs: ["Task 1 improves fastest when you write under time and get specific feedback on your overview and data accuracy. On IELTSVega you can practise real Academic Task 1 charts (and General Training letters), then get instant AI band scoring against all four criteria, so you know exactly which paragraph is costing you marks before test day."] },
    ],
    faqs: [
      { q: "How many words should IELTS Writing Task 1 be?", a: "At least 150 words, with 160 to 190 being a comfortable target. Spend about 20 minutes on it, leaving 40 for Task 2. Under-length answers are penalised under Task Achievement, and there is no benefit to a 250-word Task 1 beyond the extra chances it gives you to make errors." },
      { q: "Do I need a conclusion in Academic Writing Task 1?", a: "No. Task 1 needs an overview, which is not the same thing. An overview states the main trends or the most striking features of the data and belongs near the start, immediately after the introduction, or at the end if you prefer. A conclusion that draws inferences beyond the data is not required and can hurt you." },
      { q: "Should I give my opinion in Academic Task 1?", a: "No. Academic Task 1 asks you to report and compare what the data shows. Explaining why a trend happened, or saying whether it is good, goes outside the task and is penalised under Task Achievement. Save opinion for Task 2." },
      { q: "What is the most common reason for losing marks in Task 1?", a: "Missing or burying the overview. It is the single feature most directly tied to the Task Achievement band, and a Task 1 answer with no clear overview is capped regardless of how accurate the rest of the description is. Signpost it explicitly with a phrase such as overall." },
    ],
  },
  {
    slug: "ielts-reading-tips-improve-score",
    title: "IELTS Reading tips: how to improve your score fast",
    excerpt:
      "Timing, skimming and scanning, the toughest question types (True/False/Not Given, matching headings), and the habits that quickly raise your IELTS Reading band.",
    category: "Reading",
    date: "July 2026",
    updatedAt: "2026-09-14",
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
      { paragraphs: ["IELTS Reading gives you 60 minutes to answer 40 questions across three passages, with no extra transfer time. Most people lose marks not because the texts are too hard, but because they run out of time or misread the question type. Here's how to fix both, fast."] },
      { heading: "Master the clock first", paragraphs: ["That's roughly 20 minutes per passage, including transferring answers. Don't read every word: you don't have time. The skill IELTS actually tests is finding information quickly, so build your strategy around skimming and scanning, not deep reading."] },
      { heading: "Skim, then scan", bullets: ["Skim first: read the title, first line of each paragraph, and any headings to grasp the overall structure, about 2 minutes.", "Scan for answers: go to the questions, identify keywords, then hunt the passage for those words or their synonyms.", "Answers usually appear in passage order for most question types, so you rarely need to search the whole text again."] },
      { heading: "The hardest type: True / False / Not Given", paragraphs: ["This trips up more candidates than any other. The distinction:"], bullets: ["True: the passage confirms the statement.", "False: the passage contradicts the statement.", "Not Given: the passage neither confirms nor contradicts it. There's simply no information.", "The rule: never use outside knowledge or assumptions. If you can't find it stated or contradicted in the text, it's Not Given, even if it feels obviously true."] },
      { heading: "Matching headings", paragraphs: ["Read the paragraph, then pick the heading that captures its main idea, not a heading that just repeats one word from the paragraph. Distractor headings deliberately reuse a keyword while missing the paragraph's actual point. Do these last, after easier questions have narrowed your options."] },
      { heading: "Watch the word limit", paragraphs: ["Completion questions specify a limit like \"NO MORE THAN TWO WORDS\". Exceeding it, even with a correct answer, scores zero. Copy words exactly from the passage, and check your spelling: a misspelt answer is marked wrong."] },
      { heading: "Habits that raise your band", bullets: ["Practise under strict timing from day one: accuracy without speed won't help on test day.", "Build synonym awareness: IELTS almost never uses the exact question word in the passage.", "Do the questions you can answer quickly first; flag hard ones and return to them.", "Never leave a blank: there's no negative marking, so always guess."] },
      { heading: "Practise the exact question types", paragraphs: ["The fastest way to improve is drilling the specific types that cost you marks, True/False/Not Given, matching headings, sentence completion, until the pattern is automatic. On IELTSVega you can practise every IELTS Reading question type for both Academic and General Training, with instant answers and explanations so you learn from each mistake, plus full timed mock tests to build your pace."] },
    ],
    faqs: [
      { q: "How do I finish IELTS Reading in time?", a: "Give each of the three passages 20 minutes and move on whether or not it is finished. The habit that costs most candidates the paper is reading the passage in full before looking at the questions. Read the questions first, then scan for the answer, and accept that you will never read every word." },
      { q: "What is the difference between False and Not Given?", a: "False means the passage states something that contradicts the statement. Not Given means the passage simply does not address it. The test is not whether the statement seems true in the real world, only whether this passage supports, contradicts or ignores it. If you find yourself reasoning from outside knowledge, the answer is almost always Not Given." },
      { q: "Do spelling mistakes count in IELTS Reading?", a: "Yes. A correct answer spelled incorrectly is marked wrong, and every answer you need is written somewhere in the passage, so there is no excuse for transcribing it inaccurately. Copy it exactly, and respect the word limit, because exceeding it also scores zero." },
      { q: "How many correct answers do I need for Band 7 in Reading?", a: "Roughly 30 out of 40 on Academic Reading, and higher on General Training, where the passages are easier and the conversion is stricter. The exact conversion varies slightly between test versions, so treat 30 as a working target rather than a guarantee." },
    ],
  },
  {
    slug: "ielts-listening-strategies",
    title: "IELTS Listening: strategies that actually work",
    excerpt:
      "Why the audio plays once, how to use the reading time, the spelling and number traps, and the section-by-section strategy that raises your Listening band.",
    category: "Listening",
    date: "July 2026",
    updatedAt: "2026-09-05",
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
      { paragraphs: ["IELTS Listening is 30 minutes, 40 questions, four recordings that get progressively harder, and the audio plays only once. That single-play rule is what makes it feel stressful, but with the right strategy it's one of the most improvable sections. Here's how to score higher."] },
      { heading: "The four sections", bullets: ["Section 1: an everyday conversation (e.g. booking something). The easiest; don't lose marks here.", "Section 2: a monologue on a general topic (e.g. a tour or facility).", "Section 3: a conversation in an academic/training context (e.g. students discussing an assignment).", "Section 4: an academic lecture. The hardest, with the fewest pauses."] },
      { heading: "Use the reading time: every second of it", paragraphs: ["Before each section you get time to read the questions. Use it to underline keywords and predict answers: is the gap a number, a name, a date, a noun? Knowing what you're listening for is half the battle, because you'll recognise the answer the moment it's spoken."] },
      { heading: "Listen for signposts and synonyms", paragraphs: ["The recording almost never uses the exact word from the question, it uses a synonym or paraphrase. Train your ear for meaning, not word-matching. Also listen for corrections: speakers often say a detail then change it (\"It's on Tuesday, sorry, Thursday\"), and the second version is the answer."] },
      { heading: "Spelling and numbers cost easy marks", bullets: ["Answers must be spelled correctly: a right word spelt wrong scores zero. Practise common spellings (accommodation, Wednesday, February).", "Learn how letters and numbers are dictated, and watch date and currency formats.", "Respect the word limit (e.g. \"ONE WORD AND/OR A NUMBER\")."] },
      { heading: "Don't get left behind", paragraphs: ["If you miss an answer, let it go immediately and focus on the next question: chasing a lost answer makes you miss two more. Leave it blank in your head, keep pace with the recording, and come back to guess at the end. Never leave any answer blank on the sheet; there's no penalty for wrong guesses."] },
      { heading: "Build the skill deliberately", paragraphs: ["Train under real conditions: single play, no pausing, no rewinding. On IELTSVega every Listening set plays once, just like the real exam, and covers all the question types: form completion, multiple choice, map labelling, matching. You get instant answers and can review the transcript afterwards to catch exactly where your ear slipped, then reinforce it with full mock tests."] },
    ],
    faqs: [
      { q: "What is 27 out of 40 in IELTS Listening?", a: "27 out of 40 is Band 6.5. Band 7 starts at 30, so three more correct answers moves you up a half band. Listening uses one conversion table for both Academic and General Training candidates." },
      { q: "How do I get 7.5 in IELTS Listening?", a: "You need 32 out of 40, which means you can afford eight mistakes. At that level the marks are almost never lost in Sections 1 and 2, so the work is in Sections 3 and 4: multiple speakers, academic vocabulary and fewer pauses. Practise those two sections disproportionately, and audit every lost mark to see whether it was comprehension or a spelling or word-limit error." },
      { q: "How do I get Band 9 in IELTS Listening?", a: "Band 9 requires 39 or 40 out of 40, so it is an accuracy problem rather than a comprehension one. Candidates at that level lose marks to spelling, plurals, and exceeding the stated word limit, not to missing the answer. Train with transcripts, check every answer against the exact wording required, and treat a right answer written wrongly as the serious error it is." },
      { q: "Does IELTS Listening play the recording twice?", a: "No. The recording plays once only, in both computer-delivered and paper-based tests. This is why practising with pause and rewind builds a false sense of readiness. Every practice set should run single-play from the start." },
      { q: "Do spelling mistakes matter in IELTS Listening?", a: "Yes, and they are the most expensive habit in the paper. An answer with the right meaning but the wrong spelling scores zero. Both British and American spellings are accepted, but the word has to be correctly spelt in one of them, so drill the words that recur in test recordings: accommodation, Wednesday, February, restaurant, receipt." },
    ],
  },
  {
    slug: "ielts-academic-vs-general-training",
    title: "IELTS Academic vs General Training: what's the difference?",
    excerpt:
      "The exact differences between IELTS Academic and General Training, who each is for, how Reading and Writing differ, and how to choose the right test.",
    category: "Basics",
    date: "July 2026",
    updatedAt: "2026-09-19",
    readMins: 9,
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
      { paragraphs: ["IELTS comes in two versions, Academic and General Training, and picking the wrong one can invalidate your application. They share the same Listening and Speaking tests, but the Reading and Writing sections differ significantly. Here's how to choose confidently."] },
      { heading: "The short answer", bullets: ["Choose IELTS Academic for university or college admission, and for professional registration with medical, engineering, nursing or accountancy bodies.", "Choose IELTS General Training for work, employment, migration, and secondary education.", "The thing most comparisons miss: the two Reading papers are converted to bands using different tables, and General Training is the stricter of the two. Same 40 questions, different score chart."] },
      { heading: "Who each test is for", bullets: ["IELTS Academic: university and college admission, and professional registration (e.g. medical, engineering and accountancy bodies).", "IELTS General Training: work experience, employment, migration to countries like Australia, Canada, the UK and New Zealand, and secondary education.", "Always confirm which version your university, employer or visa route requires before booking."] },
      { heading: "Which one do you need for…", table: { caption: "Test version by purpose", headers: ["Your purpose", "Version", "Check first"], rows: [["Undergraduate or masters admission", "Academic", "Whether the university requires UKVI"], ["PhD or research", "Academic", "Per-skill minimums, which are often higher"], ["Nursing, medical or engineering registration", "Academic", "The body's own minimum, often 7.0 per skill"], ["Permanent residency or migration", "General Training", "The points table for your visa class"], ["Work visa or employment", "General Training", "Whether your employer specifies otherwise"], ["Secondary school", "General Training", "The school's stated requirement"], ["UK student visa", "Usually Academic for UKVI", "That the centre is UKVI-approved"]] }, links: [{ label: "If you need IELTS for UKVI", href: "/blog/ielts-ukvi-vs-ielts-academic" }, { label: "Plan your preparation", href: "/blog/ielts-4-week-study-plan" }] },
      { heading: "What's identical", paragraphs: ["Listening and Speaking are exactly the same in both versions: same format, same timing, same scoring. So a huge part of your preparation (and everything you practise for those two skills) applies regardless of which test you take."] },
      { heading: "How Reading differs", paragraphs: ["Academic Reading uses three long texts from books, journals and newspapers, written for a general but educated audience. The language is more formal and the topics more academic. General Training Reading uses everyday materials: notices, advertisements, workplace documents and a longer general-interest passage. The question types are the same; the texts are the difference."] },
      { heading: "How Writing differs", bullets: ["Academic Task 1: describe a graph, chart, table, map or process in at least 150 words.", "General Training Task 1: write a letter (formal, semi-formal or informal) in response to a situation, at least 150 words.", "Task 2: both versions write an essay of at least 250 words, but General Training essay topics are usually a little more everyday than Academic ones."] },
      { heading: "Is one easier than the other?", paragraphs: ["General Training Reading and Writing are often perceived as more approachable because the texts and topics are more familiar. However, the band requirements for migration can be high, and the scoring is calibrated so that a given band means the same level of English in both versions. Choose based on what your application requires, not on which seems easier."] },
      { heading: "The Reading score chart is not the same, and that is the real difference", paragraphs: ["The point almost every comparison misses: Academic and General Training Reading are converted to bands with two different tables, and General Training is the stricter of the two. Same 40 questions, same question types, different conversion."], bullets: ["Band 6: 23 out of 40 in Academic Reading, 30 out of 40 in General Training.", "Band 6.5: 27 Academic, 32 General Training.", "Band 7: 30 Academic, 34 General Training.", "Band 8: 35 Academic, 37 General Training.", "Band 9: 39 Academic, all 40 in General Training."] },
      { heading: "What that means in practice", paragraphs: ["General Training Reading gives you an easier text and less room for error. Needing 34 out of 40 for Band 7 means you can afford six mistakes across the whole paper; in Academic Reading the same band allows ten. At the top the gap is starker still, because Band 9 in General Training requires a perfect score.", "So the honest answer to which is harder is that it depends where you look. The General Training texts are easier to read. The General Training marking is harder to satisfy. If your visa route asks for Band 7 in each skill, do not assume the General Training paper is the soft option, and do budget real time for accuracy work: spelling, word limits and transferring answers correctly are worth more marks to you than they would be to an Academic candidate.", "Listening is the exception and the relief. It uses a single conversion table for both modules, so a Listening band means the same raw score whichever version you sit."] },
      { heading: "Prepare for the right version", paragraphs: ["On IELTSVega you can practise for both Academic and General Training, including Academic Task 1 charts and General Training letters, with instant AI band scoring on Writing and Speaking. Set your target module when you start, and every practice set and mock test is tailored to the version you'll actually sit, including the correct Reading conversion table for your module."] },
    ],
    faqs: [
      { q: "Can I switch between IELTS Academic and General Training?", a: "You choose the version when you book, and you should pick the one your university, employer or visa requires. If you booked the wrong version you'd generally need to register again for the correct one, so confirm before paying." },
      { q: "Is IELTS General Training easier than Academic?", a: "Its Reading and Writing use more everyday materials, which many find more familiar, but the scoring is calibrated so a given band means the same level of English in both. Choose based on what your application needs, not perceived difficulty." },
      { q: "Is IELTS Speaking the same in Academic and General Training?", a: "Yes. Listening and Speaking are identical in both versions. Same format, timing and scoring. Only the Reading and Writing sections differ." },
      { q: "Which is harder, IELTS Academic or General Training?", a: "The General Training texts are easier to read, but General Training Reading is marked more strictly. Band 7 needs 30 out of 40 in Academic Reading and 34 out of 40 in General Training, and Band 9 in General Training requires all 40 correct. Easier texts, less margin for error, so neither is simply the soft option." },
      { q: "Is there a different score chart for General Training and Academic Reading?", a: "Yes. Reading uses two separate raw score to band tables, and General Training requires more correct answers for every band from 6 upwards. Listening uses a single table that covers both modules, so a Listening raw score converts identically whichever version you sit." },
      { q: "How long is IELTS General Training valid for?", a: "Two years from the test date, the same as Academic. Validity is a convention of the receiving institution rather than a property of the module, so both versions are treated identically, and some organisations will accept older results with evidence of continued English use." },
      { q: "Should I take IELTS Academic or General Training for a masters?", a: "Academic. Every postgraduate route, including taught masters and research degrees, expects IELTS Academic, and General Training is not normally accepted for university admission. Check the per-skill minimum as well as the overall band, because postgraduate requirements are frequently set per skill and that is where most applications fall short. If you are applying for a UK student visa, confirm whether the university requires the UKVI version." },
      { q: "Which IELTS do I need for permanent residency?", a: "General Training in almost all cases. The migration routes for Australia, Canada, the UK and New Zealand are built around General Training, and the points tables are written against it. Confirm against your own visa class before booking, since a small number of skilled routes tied to professional registration expect Academic instead." },
      { q: "Do universities accept IELTS General Training?", a: "Generally no. Universities ask for IELTS Academic, because the Reading and Writing papers are designed to test the kind of English that degree study requires. General Training is intended for work, migration and secondary education. Sitting the wrong version is one of the most common and most expensive IELTS mistakes, so confirm the requirement in writing before you book." },
    ],
  },
  {
    slug: "ielts-vs-toefl",
    seoTitle: "IELTS vs TOEFL: Key Differences & Which to Take",
    title: "IELTS vs TOEFL: key differences and which test is right for you",
    excerpt:
      "A clear comparison of IELTS and TOEFL, format, scoring, Speaking style, acceptance and difficulty, to help you choose the test that plays to your strengths.",
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
      { paragraphs: ["IELTS and TOEFL are the two most widely accepted English tests for study and migration. Both assess Listening, Reading, Writing and Speaking, and both are accepted by most universities, so the right choice usually comes down to test format and which one suits your strengths. Here's an honest comparison."] },
      { heading: "The headline differences", bullets: ["Speaking: IELTS is a face-to-face (or live video) interview with a real examiner; TOEFL is spoken into a microphone and recorded for later marking.", "Scoring: IELTS uses the 9-band scale (per skill and overall); TOEFL iBT is scored 0-120 (0-30 per section).", "Style: IELTS mixes British and international English and handwriting is an option on paper; TOEFL is fully computer-based and American in style.", "Question format: TOEFL leans heavily on multiple choice; IELTS uses a wider variety of question types, including short written answers."] },
      { heading: "Which suits your strengths?", paragraphs: ["If you're more comfortable talking to a person and prefer varied question types, IELTS often feels more natural. If you prefer typing all answers, speaking to a computer without an examiner watching, and multiple-choice formats, TOEFL may suit you. Neither is universally 'easier'. They reward slightly different skills."] },
      { heading: "Acceptance and cost", paragraphs: ["Both are accepted by the vast majority of universities and many immigration systems, but a few specific programmes or visa routes prefer or require one over the other. Check your destination's requirement first. Costs are broadly comparable and vary by country; always verify the current local fee before booking."], links: [{ label: "How long an F-1 visa lets you stay in 2026", href: "/blog/us-f1-duration-of-status-rule-blocked-2026" }] },
      { heading: "Timing and results", paragraphs: ["Both tests run around 2-3 hours. Computer-delivered IELTS and TOEFL iBT typically return results within a few days; paper-based IELTS takes longer. If you need a fast turnaround, a computer-delivered option is usually best."] },
      { heading: "How to decide", bullets: ["Check whether your university or visa specifies a test. That decides it instantly.", "If both are accepted, pick the format that matches your strengths (live Speaking vs recorded, varied questions vs multiple choice).", "Take a full practice test of your chosen format to confirm before you commit."] },
      { heading: "If you choose IELTS, practise smart", paragraphs: ["Once you've decided on IELTS, focused practice on the exact format is what raises your score. IELTSVega covers every IELTS question type for Academic and General Training, gives instant AI band scoring on Writing and Speaking, and lets you sit full mock tests on real timing, so there are no surprises on test day."] },
    ],
    faqs: [
      { q: "Is IELTS easier than TOEFL?", a: "Neither is universally easier: they reward different strengths. IELTS has a live Speaking interview and varied question types; TOEFL is fully computer-based with recorded Speaking and more multiple choice. Choose the format that suits you." },
      { q: "Do universities prefer IELTS or TOEFL?", a: "The large majority of universities accept both equally. A few specific programmes or visa routes prefer one, so always check your destination's stated requirement before deciding." },
      { q: "Can I use IELTS for a US university?", a: "Yes. IELTS is widely accepted by universities in the United States as well as the UK, Canada, Australia and elsewhere. Confirm the minimum band your chosen course requires." },
    ],
  },
  {
    slug: "ielts-online-vs-paper-based",
    seoTitle: "IELTS on Computer or Paper: Which Is Better?",
    title: "IELTS on computer vs paper-based: which should you choose?",
    excerpt:
      "Computer-delivered IELTS vs paper-based IELTS: the real differences in speed, comfort and results, and how to decide which format suits you best.",
    category: "Basics",
    date: "July 2026",
    updatedAt: "2026-09-19",
    readMins: 9,
    keywords: [
      "ielts on computer",
      "test ielts",
      "ielts exam",
      "computer based ielts",
      "ielts academic",
      "ielts general",
      "ielts score",
      "ielts online",
      "band ielts",
      "ielts practice",
    ],
    sections: [
      { paragraphs: ["At a test centre, IELTS is available in two delivery formats: computer-delivered (also called 'IELTS on computer') and paper-based. The test content, difficulty and 9-band scoring are identical. Only the way you take it changes.", "There is also a third, separate product called IELTS Online, which is sat at home under remote proctoring. It is not the same as taking IELTS on a computer at a test centre, and it is not accepted everywhere, so the next section deals with it before anything else."] },
      { heading: "IELTS Online is not the same as IELTS on computer", paragraphs: ["This is the most expensive mix-up in the whole decision, because the names sound interchangeable and the acceptance rules are not. There are three things you can book:"], table: { caption: "The three ways to sit IELTS", headers: ["What you book", "Where you sit it", "Who accepts it"], rows: [["IELTS on computer (computer-delivered)", "At an official test centre, on their computer", "Everywhere IELTS is accepted, including UKVI"], ["IELTS on paper", "At an official test centre, on paper", "Everywhere IELTS is accepted, including UKVI"], ["IELTS Online", "At home, under live remote proctoring", "Academic only, and a limited set of universities. Not accepted for UK visa purposes or where a UKVI-approved test is required"]] } },
      { paragraphs: ["If a visa application is anywhere in your plans, the safe answer is a test centre. At-home and remote-proctored tests are not accepted for Australian visas from any provider, and IELTS Online cannot be used where a UKVI-approved test is required. Confirm acceptance in writing with whoever receives your score before you book, because a cheaper test that is not accepted is the most expensive option there is.", "Everything below this point compares the two test-centre formats: computer-delivered and paper-based."], links: [{ label: "IELTS fees by country, including IELTS Online", href: "/blog/ielts-exam-fee-2026" }, { label: "What the 2026 Australia student visa changes mean for families", href: "/blog/australia-student-visa-dependants-ban-2026" }] },
      { heading: "What's the same", paragraphs: ["Both formats test the same four skills with the same questions, timing and marking. Speaking is a live interview with an examiner in both cases (in person or by video call). A Band 7 means exactly the same thing whichever format you pick, no version is easier."] },
      { heading: "Where computer-delivered wins", bullets: ["Faster results: often within 3-5 days, versus up to 13 days for paper.", "More test dates and locations, sometimes several per day.", "Typed Writing: easier to edit, no handwriting legibility worries, and a live word count.", "Listening/Reading tools like highlighting and note-taking on screen."] },
      { heading: "Where paper-based can suit you better", bullets: ["You can annotate the question paper freely and see the whole Reading passage on one page.", "Some people concentrate better reading on paper than on screen.", "You have 10 minutes at the end of Listening to transfer answers (computer tests give 2 minutes to check)."] },
      { heading: "Can you type fast enough?", paragraphs: ["This is the question that decides the format for more people than any other, and it is rarely asked directly. Task 2 is 250 words in 40 minutes and Task 1 is 150 words in 20. If you type at around 25 words per minute or better, the computer is comfortably faster than handwriting and you gain time for planning and checking. Below that, typing itself starts eating the time you need for the actual writing.", "The counter-argument is real too. On screen you can restructure a paragraph without rewriting the page, the word count is displayed for you, and no examiner ever has to decipher your handwriting. Many candidates with mediocre typing still do better on computer for those reasons alone.", "Test it rather than guessing. Write one full Task 2 answer by hand against the clock, then write another on a keyboard, and compare both the time and how much of it went on the writing rather than the mechanics."] },
      { heading: "What the test room is actually like", bullets: ["Computer-delivered: individual headphones for Listening, so the volume is yours and the room noise is not your problem.", "Paper-based: Listening is usually played through loudspeakers to the whole room, and you get one shot at the audio either way.", "Computer-delivered rooms are typically smaller, with fewer candidates in them.", "Timing is on screen and counts down for you on computer, against a wall clock and the invigilator's announcements on paper.", "Speaking is a face-to-face interview with a human examiner in both formats, and is booked separately in both."] },
      { heading: "Which one can you actually book?", paragraphs: ["Availability decides this more often than preference does. Computer-delivered sessions run several times a week at most centres, sometimes more than once a day, and seats tend to be there when you need them. Paper-based sittings are far less frequent, often monthly, and they fill up well in advance.", "If you are working backwards from an application deadline, check both calendars before you weigh anything else on this page. The format you can sit in time beats the format you would slightly prefer."] },
      { heading: "Is paper-based IELTS still available?", paragraphs: ["In many countries yes, but it is being withdrawn market by market as centres move to computer delivery, and in some places it is already gone. Your test centre's booking calendar is the only reliable answer for where you are.", "The results gap is the practical consequence of picking it: roughly 3 to 5 days for computer-delivered against about 13 days for paper. If your deadline is tight, that difference frequently settles the question on its own."] },
      { heading: "Which should you choose?", paragraphs: ["Neither format is marked more generously. Choose on how you work and what you can book."], table: { caption: "A straight comparison", headers: ["Choose computer-delivered if…", "Choose paper-based if…"], rows: [["You type faster than you write by hand", "You write faster and more accurately by hand"], ["You need results in days, not a fortnight", "Your deadline is comfortable"], ["You want more dates to choose from", "A paper sitting fits your timing and is available"], ["You read comfortably on a screen", "You concentrate better on a printed page"], ["You want to edit and restructure your essay freely", "You want to annotate the question paper as you read"], ["You would rather have your own headphones", "The 10 minutes to transfer Listening answers matters to you"]] } },
      { heading: "Practise the way you'll test", paragraphs: ["If you're taking the computer-delivered test, prepare on a computer. IELTSVega runs entirely in your browser with a typed Writing editor, on-screen Listening and Reading tools, and full timed mock tests, so your practice mirrors the real computer-delivered experience, and you get instant AI band scores to track your progress."], links: [{ label: "What the computer-delivered screen actually looks like", href: "/blog/computer-delivered-ielts-guide" }, { label: "When your results arrive and how long they stay valid", href: "/blog/ielts-results-trf-validity-remark" }] },
    ],
    faqs: [
      { q: "Is computer-delivered IELTS easier than paper-based?", a: "Neither is easier. The questions, the marking criteria and the band scales are identical, and the two results are treated as equivalent by every organisation that accepts IELTS. The differences are practical, not academic, and the right choice depends on how you work rather than on which is scored more generously." },
      { q: "How much faster are computer-delivered IELTS results?", a: "Typically one to five days, against about 13 days for paper-based. If you are working to an application deadline, that difference is usually the deciding factor on its own." },
      { q: "Is the Speaking test different on computer-delivered IELTS?", a: "No. Speaking is a face-to-face interview with a human examiner in both formats. The choice of format affects only Listening, Reading and Writing." },
      { q: "Can I handwrite my essay on computer-delivered IELTS?", a: "No, Writing is typed. You are given paper for notes and planning, but the answer itself must be typed, so if your typing is slow or inaccurate that is worth testing before you choose the format. On the other hand, editing a typed essay is far easier than rewriting a handwritten one." },
      { q: "Is IELTS Online the same as computer-delivered IELTS?", a: "No, and confusing them is expensive. Computer-delivered IELTS is sat on a computer at an official test centre and is accepted everywhere IELTS is accepted, including for UK visas. IELTS Online is sat at home under remote proctoring, is available for Academic only, is accepted by a limited set of universities, and cannot be used for UK visa purposes or anywhere a UKVI-approved test is required. Confirm acceptance with the organisation receiving your score before booking IELTS Online." },
      { q: "Does typing speed affect your IELTS Writing score?", a: "Not directly, since Writing is marked on task response, coherence, vocabulary and grammar rather than on speed. It affects it indirectly and substantially: at under roughly 25 words per minute, typing consumes time you needed for planning and checking, and rushed writing scores lower. Write one full Task 2 answer by hand and one on a keyboard against the clock before you choose." },
      { q: "Is computer-delivered IELTS accepted by universities?", a: "Yes. A computer-delivered result is treated as identical to a paper-based one by every organisation that accepts IELTS, including universities and immigration authorities, and the Test Report Form does not distinguish between them in a way that affects acceptance. The format that carries acceptance restrictions is IELTS Online, sat at home, which is a different product." },
      { q: "Do you get headphones in computer-delivered IELTS Listening?", a: "Yes. Computer-delivered Listening is played through individual headphones, so the volume is set for you rather than for the room. Paper-based sittings generally use loudspeakers for the whole hall. The audio still plays once either way, so single-play practice matters in both formats." },
      { q: "Is paper-based IELTS still available in 2026?", a: "In many countries yes, but centres are withdrawing it market by market as they move to computer delivery, and in some places it has already gone. Your test centre's booking calendar is the only reliable answer for your location. Where both run, computer-delivered sessions are far more frequent and return results in about 3 to 5 days against roughly 13 for paper." },
    ],
  },
  {
    slug: "how-to-book-ielts-test",
    title: "How to book the IELTS test: IDP, British Council and booking in India",
    seoTitle: "IELTS Booking 2026: How to Book with IDP or British Council",
    excerpt:
      "IELTS exam booking step by step: which official site to use, why India is IDP-only, the documents and fee, and booking IELTS for UKVI or at home.",
    category: "Basics",
    date: "July 2026",
    updatedAt: "2026-09-24",
    readMins: 9,
    /**
     * TARGETING: the booking cluster (`*book`, 255 impr @ 23.3, 28d to 21 Sep),
     * led by "british council ielts booking" and "ielts test/exam booking".
     * India is its #2 country, the only non-branded cluster with real Indian
     * demand. Slot availability and dates belong to
     * /blog/ielts-exam-dates-slot-booking-2026; fees to /blog/ielts-exam-fee-2026.
     */
    keywords: [
      "ielts booking",
      "ielts exam booking",
      "ielts test booking",
      "british council ielts booking",
      "how to book ielts exam",
      "book ielts idp",
      "ielts booking in india",
      "ielts registration documents",
      "ielts ukvi booking",
      "ielts online test booking",
    ],
    sections: [
      { paragraphs: ["Booking IELTS takes about fifteen minutes once you know which test you need. The exam is run by two organisations, the British Council and IDP, and you book through one of their official booking sites or at a test centre. Which one depends on your country, and in India the answer is only ever IDP. Here is the whole IELTS booking process, step by step."] },
      {
        heading: "Where to book IELTS: the official booking sites",
        paragraphs: ["Only book through an official channel. Agents can reserve a seat for you, but the booking itself is always made with the British Council or IDP, and the confirmation email comes from them."],
        table: {
          headers: ["Where you are", "Who runs IELTS", "How to book"],
          rows: [
            ["India", "IDP only (since 25 July 2021)", "IDP IELTS India website, or any IDP branch"],
            ["UK", "British Council and IDP", "Either organisation's booking site; both offer IELTS for UKVI"],
            ["Most other countries", "British Council, IDP, or both", "Search your city on ielts.org's test centre finder, then book with whichever runs that centre"],
          ],
        },
      },
      {
        heading: "Can you book IELTS with the British Council in India?",
        paragraphs: [
          "No. The British Council stopped delivering IELTS in India on 25 July 2021, when IDP bought its Indian IELTS business. Every IELTS test in India, on computer or on paper, Academic, General Training or UKVI, is now booked and taken through IDP. The British Council in India still runs IELTS preparation courses, which is why its name keeps appearing in search results, but it does not sell test seats.",
          "The test itself did not change. The same exam is marked to the same standard, and a result from an IDP centre is the same IELTS a British Council centre issues everywhere else. Universities and visa offices do not distinguish between them.",
        ],
      },
      { heading: "Step 1: Confirm which test you need", paragraphs: ["Check your university, employer or visa requirement for two things: the IELTS version (Academic or General Training) and the minimum band score, including any per-skill minimums. Booking the wrong version is the most common, and most costly, mistake, so confirm this first. If the score is for a UK visa, you need IELTS for UKVI, which is a separate product on the booking page."] },
      { heading: "Step 2: Choose your format and date", bullets: ["Decide between computer-delivered (faster results, more dates) and paper-based.", "Pick a test date that leaves you enough preparation time: and, if results feed an application deadline, enough buffer afterwards.", "Note whether Speaking is on the same day or scheduled separately."] },
      { heading: "Step 3: Register and pay", paragraphs: ["Create an account on the official booking site for your country, select your test type, date and location, and complete payment. The fee varies by country: in India it is about INR 19,000 from 1 April 2026, and cards, net banking and UPI are all accepted. Your name, date of birth and passport number must match your passport exactly, because the same document is checked on test day."] },
      {
        heading: "Documents you need to book IELTS",
        bullets: [
          "A valid passport. In India the passport is required; a national ID card is not accepted for IELTS.",
          "A clear scan or photo of the passport's photo page to upload during registration.",
          "The same passport on test day. It is checked at registration and again before Speaking.",
          "An email address you check, because your confirmation, test day details and results notice all go there.",
        ],
        paragraphs: ["If your passport is due to expire before test day, renew it first. Booking with one passport and arriving with a new one creates a mismatch the centre may refuse."],
      },
      {
        heading: "Booking IELTS for UKVI",
        paragraphs: ["IELTS for UKVI is booked the same way but is listed as its own test type, at centres approved by the UK Home Office. The paper is the same as regular IELTS Academic or General Training; the difference is the extra identity checks and the recording of the session. You cannot convert a regular IELTS booking into UKVI later, so choose it at the start if the result is for a UK visa application."],
      },
      {
        heading: "Booking IELTS Online (the at-home test)",
        paragraphs: ["IELTS Online is taken at home under a remote invigilator, and it is booked on the same sites. It must be booked at least 48 hours before the test. It is not the same as computer-delivered IELTS at a test centre, and it is not accepted for UK visa applications. Check that your university accepts it before you pay."],
      },
      {
        heading: "After you book: confirmation and your Speaking slot",
        paragraphs: ["You receive a confirmation email with your test date, venue and arrival time. Speaking is often on a different day from Listening, Reading and Writing. For IELTS on paper in India you can pick your Speaking slot during booking; if you do not, one is allocated about two days before the written test. Check that email carefully, because the Speaking time is the detail people miss."],
      },
      { heading: "Step 4: Prepare for test day", bullets: ["Bring the same identity document you registered with, no exceptions.", "Arrive early; latecomers are usually refused entry.", "Know your test centre's rules on what you can bring into the room.", "For computer-delivered tests, arrive familiar with the on-screen interface."] },
      { heading: "Step 5: Get results and plan a retake if needed", paragraphs: ["Results (the Test Report Form) arrive within a few days for computer-delivered tests, or up to about two weeks for paper. If you fall short in one skill, you can now retake a single section with 'One Skill Retake' in many locations, rather than sitting the whole test again, check availability in your country."] },
      {
        heading: "Before you pay: the decisions that change your booking",
        links: [
          { label: "IELTS exam fee 2026: what the test costs in each country", href: "/blog/ielts-exam-fee-2026" },
          { label: "IELTS slot booking: how to find an available date fast", href: "/blog/ielts-exam-dates-slot-booking-2026" },
          { label: "IELTS on computer or paper: which format to book", href: "/blog/ielts-online-vs-paper-based" },
          { label: "IELTS Academic vs General Training: which version you need", href: "/blog/ielts-academic-vs-general-training" },
          { label: "IELTS for UKVI vs IELTS Academic: when you need UKVI", href: "/blog/ielts-ukvi-vs-ielts-academic" },
        ],
      },
      { heading: "Be ready before you book", paragraphs: ["The best time to book is when your practice scores are consistently at or above your target band. On IELTSVega you can benchmark yourself with full mock tests on real timing and get AI band scoring on Writing and Speaking, so you book your test date with confidence, not hope."] },
    ],
    faqs: [
      { q: "How do I book the IELTS exam in India?", a: "Book through IDP, either on the IDP IELTS India website or at an IDP branch. Choose Academic, General Training or UKVI, pick computer or paper, select a city and date, upload your passport and pay the fee of about INR 19,000. The British Council no longer sells IELTS tests in India." },
      { q: "Can I book IELTS with the British Council in India?", a: "No. Since 25 July 2021 all IELTS tests in India are delivered by IDP, which bought the British Council's Indian IELTS business. The British Council still offers preparation courses in India, but test bookings go through IDP. The test and the result are exactly the same." },
      { q: "What documents are required for IELTS registration?", a: "A valid passport, plus a scan of its photo page to upload while booking. In India a passport is required. The same passport must be shown on test day, and the name and number on your booking must match it exactly." },
      { q: "How late can I book the IELTS test?", a: "It depends on seat availability at your centre. Computer-delivered sessions run often and can sometimes be booked within days of the test. IELTS Online must be booked at least 48 hours ahead. Paper-based dates are fewer and fill earlier, so leave more time for those." },
      { q: "How far in advance should I book IELTS?", a: "Four to six weeks is a sensible window in most cities. It gives you time to prepare to a target rather than to a date, and popular slots in large centres do fill. Book earlier if you need a specific date for an application deadline, and later only if you already know your mock scores are consistently at target." },
      { q: "What ID do I need for the IELTS test?", a: "Normally a valid passport, and the document you register with must be the same one you bring on the day, with matching details. Some centres accept a national identity card for local candidates. Your ID is checked at registration and again before Speaking, and a mismatch will stop you sitting the test." },
      { q: "Can I change or cancel my IELTS test date?", a: "Usually yes. Moving your date more than about five weeks before the test normally carries an administrative fee, and cancelling in that window typically returns a partial refund. Inside five weeks you will generally lose most or all of the fee. Documented medical cases are handled separately." },
      { q: "Should I book IELTS Academic or General Training?", a: "It depends entirely on what the organisation receiving your score requires, not on which you would find easier. Academic is the usual requirement for university study and professional registration, General Training for most work and migration routes. Confirm the requirement in writing before you pay, because the two are not interchangeable." },
    ],
  },
  {
    slug: "ielts-speaking-band-descriptors",
    title: "IELTS Speaking band descriptors explained: Band 6 vs 7 vs 8",
    excerpt:
      "What examiners actually look for in IELTS Speaking: the four criteria decoded, and the concrete differences between Band 6, 7 and 8 with fixes for each.",
    category: "Speaking",
    date: "July 2026",
    updatedAt: "2026-09-14",
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
      { paragraphs: ["IELTS Speaking is scored on four equally-weighted criteria, and your band is the average of them. Understanding what each band actually means, and the specific gap between Band 6 and Band 7, is the fastest way to stop losing marks. Here's each criterion decoded, with the concrete difference between the bands."] },
      { heading: "The four criteria", bullets: ["Fluency & Coherence: how smoothly and logically you speak.", "Lexical Resource: the range and precision of your vocabulary.", "Grammatical Range & Accuracy: the variety and correctness of your structures.", "Pronunciation: how clearly and naturally you're understood."] },
      { heading: "Fluency & Coherence: 6 vs 7 vs 8", paragraphs: ["Band 6: willing to speak at length, but with noticeable hesitation, repetition and self-correction that sometimes breaks the flow. Band 7: speaks at length without much effort, and uses a range of connectives and discourse markers flexibly (though not perfectly). Band 8: fluent with only occasional repetition; hesitation is to find ideas, not language.", "The fix from 6 to 7: stop searching for perfect words. Keep talking, use natural fillers to buy time, and link ideas with varied connectives rather than repeating 'and' and 'because'."] },
      { heading: "Lexical Resource: 6 vs 7 vs 8", paragraphs: ["Band 6: enough vocabulary to discuss topics, with some inaccurate or repeated word choices. Band 7: uses less common and idiomatic vocabulary, shows awareness of style, and paraphrases effectively. Band 8: a wide resource used fluently and precisely, with skilful paraphrase.", "The fix: build topic-based collocations (not random 'big words'), and practise paraphrasing so you never repeat the question's exact wording."] },
      { heading: "Grammatical Range & Accuracy: 6 vs 7 vs 8", paragraphs: ["Band 6: a mix of simple and complex sentences, but with frequent errors in the complex ones. Band 7: a range of complex structures with frequent error-free sentences. Band 8: a wide range used flexibly, with only occasional slips.", "The fix: don't play it safe with only simple sentences (that caps you at 6). Deliberately use conditionals, relative clauses and a range of tenses. Accuracy under a little risk is what earns Band 7."] },
      { heading: "Pronunciation: 6 vs 7 vs 8", paragraphs: ["Band 6: generally understood, though mispronunciation occasionally reduces clarity. Band 7: uses a range of pronunciation features (stress, rhythm, intonation) with control, and is easy to understand. Band 8: a wide range of features, sustained and flexible, with first-language accent having minimal effect.", "The fix: accent is not marked. Clarity is what counts. Work on word and sentence stress and natural intonation rather than trying to erase your accent."] },
      { heading: "The mindset shift from 6.5 to 7.5", paragraphs: ["Most candidates stuck at 6.5 are playing it safe: short answers, simple grammar, and cautious vocabulary. The higher bands reward controlled risk: extended answers, complex structures, precise idiomatic language, and expressive intonation. Practise stretching every answer just beyond your comfort zone."] },
      { heading: "Track your bands as you practise", paragraphs: ["You improve fastest when you can see which criterion is holding you back. On IELTSVega, every Speaking answer you record is AI-scored against all four descriptors, Fluency, Lexical Resource, Grammar and Pronunciation, so you know precisely where your Band 6 is really a 7, and which one to push next."] },
    ],
    faqs: [
      { q: "What are the four IELTS Speaking marking criteria?", a: "Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation. Each carries equal weight, and your Speaking band is the average of the four rounded to the nearest half band. Because they are equally weighted, one weak criterion drags the whole score down, which is why it pays to know which one is holding you back." },
      { q: "Does my accent affect my IELTS Speaking score?", a: "No. Accent is not marked and examiners are trained to assess speakers from every first-language background. What Pronunciation measures is whether you can be understood and whether you use stress, rhythm and intonation to carry meaning. Working on word and sentence stress raises your band; trying to erase your accent does not." },
      { q: "How is the IELTS Speaking band score calculated?", a: "The examiner awards a whole-number band from 0 to 9 on each of the four criteria, and those four are averaged. Averages ending in .25 are rounded up to the next half band, and averages ending in .75 are rounded up to the next whole band. So criteria of 7, 7, 6 and 6 average exactly 6.5 and give 6.5, while 7, 7, 7 and 6 average 6.75 and give 7." },
      { q: "Why am I stuck at Band 6.5 in IELTS Speaking?", a: "Almost always because you are playing it safe. Short answers, simple sentence structures and cautious everyday vocabulary are exactly what the Band 6 descriptors describe. Band 7 rewards controlled risk: extended answers, complex structures used with frequent accuracy, and less common vocabulary attempted even if occasionally imprecise." },
    ],
  },
  /* ---------------------------------------------------------------- *
   * Earlier posts
   * ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- *
   * The raw-score conversion charts. Written to serve the single most
   * recurrent unserved intent across every scoring SERP: "what band is
   * 32 out of 40". Google's People Also Ask blocks on
   * "how is ielts band score calculated", "ielts listening strategies"
   * and "ielts academic vs general" all surface a variant of it, and the
   * answer differs by paper — which is exactly what the competing charts
   * bury. Numbers here MUST stay in sync with BAND_TABLES in
   * src/lib/ielts.ts, which is what /ielts-band-score-calculator renders.
   * ---------------------------------------------------------------- */
  {
    slug: "ielts-band-score-chart",
    title: "IELTS band score chart: raw score to band for Listening and Reading",
    seoTitle: "IELTS Band Score Chart: Raw Score to Band Out of 40",
    excerpt:
      "What 32 out of 40 means in Listening, Academic Reading and General Training Reading, with the full conversion charts for all three papers and the rounding rule.",
    category: "Scoring",
    date: "September 2026",
    publishedAt: "2026-09-05",
    readMins: 7,
    keywords: [
      "ielts band score chart",
      "ielts raw score to band score",
      "ielts listening raw score to band score chart",
      "ielts band score chart for general reading and listening",
      "what band is 32 out of 40 in ielts",
      "ielts band score calculator academic reading",
      "ielts band score calculator general training reading",
      "ielts academic vs general reading band difference",
      "why is general training reading scored harder",
      "ielts half band scores how they work",
      "how is ielts overall band score rounded",
      "ielts score conversion table",
    ],
    sections: [
      {
        paragraphs: [
          "Listening and Reading are both marked out of 40, and both are converted to a band with a fixed table. What almost every chart online leaves out is that the three papers use three different tables. The same raw score is not the same band.",
          "Take 32 out of 40. In Listening that is Band 7.5. In Academic Reading it is Band 7. In General Training Reading it is Band 6.5. One raw score, three different results, and it is the single most common reason people miscalculate what they need.",
        ],
      },
      {
        heading: "IELTS Listening band score chart (Academic and General Training)",
        paragraphs: ["Listening uses one table for both modules, so this chart applies whichever version you sit."],
        bullets: [
          "39-40 correct = Band 9",
          "37-38 = Band 8.5",
          "35-36 = Band 8",
          "32-34 = Band 7.5",
          "30-31 = Band 7",
          "26-29 = Band 6.5",
          "23-25 = Band 6",
          "18-22 = Band 5.5",
          "16-17 = Band 5",
          "13-15 = Band 4.5",
          "10-12 = Band 4",
          "6-9 = Band 3.5",
          "4-5 = Band 3",
        ],
      },
      {
        heading: "IELTS Academic Reading band score chart",
        paragraphs: ["Academic Reading uses three long texts from books, journals and newspapers. The conversion is more forgiving than General Training because the texts are harder."],
        bullets: [
          "39-40 correct = Band 9",
          "37-38 = Band 8.5",
          "35-36 = Band 8",
          "33-34 = Band 7.5",
          "30-32 = Band 7",
          "27-29 = Band 6.5",
          "23-26 = Band 6",
          "19-22 = Band 5.5",
          "15-18 = Band 5",
          "13-14 = Band 4.5",
          "10-12 = Band 4",
          "8-9 = Band 3.5",
          "6-7 = Band 3",
        ],
      },
      {
        heading: "IELTS General Training Reading band score chart",
        paragraphs: ["General Training Reading is the strictest of the three. The texts are everyday materials, so more correct answers are required for the same band."],
        bullets: [
          "40 correct = Band 9",
          "39 = Band 8.5",
          "37-38 = Band 8",
          "36 = Band 7.5",
          "34-35 = Band 7",
          "32-33 = Band 6.5",
          "30-31 = Band 6",
          "27-29 = Band 5.5",
          "23-26 = Band 5",
          "19-22 = Band 4.5",
          "15-18 = Band 4",
          "12-14 = Band 3.5",
          "9-11 = Band 3",
        ],
      },
      {
        heading: "Why General Training Reading needs more marks",
        paragraphs: [
          "It looks unfair the first time you see it: Band 7 costs you 30 marks in Academic Reading and 34 in General Training. The reason is that a band is meant to describe a level of English, not a level of difficulty in one paper. General Training texts are notices, adverts and workplace documents, which are easier to read, so a higher proportion of correct answers is needed before the same band is justified.",
          "The practical consequence matters more than the principle. In General Training Reading you have almost no margin at the top: Band 8 starts at 37 and Band 9 requires all 40. Three careless spelling errors in a General Training paper can cost a full band where the same three errors in Academic Reading would cost half of one.",
        ],
      },
      {
        heading: "What each band actually costs you",
        paragraphs: ["The three most requested targets, side by side, so you can see what your paper demands:"],
        bullets: [
          "Band 6: 23 in Listening, 23 in Academic Reading, 30 in General Training Reading.",
          "Band 6.5: 26 Listening, 27 Academic Reading, 32 General Training Reading.",
          "Band 7: 30 Listening, 30 Academic Reading, 34 General Training Reading.",
          "Band 7.5: 32 Listening, 33 Academic Reading, 36 General Training Reading.",
          "Band 8: 35 Listening, 35 Academic Reading, 37 General Training Reading.",
        ],
      },
      {
        heading: "How the overall band is rounded",
        paragraphs: [
          "Your overall band is the average of the four skill bands, reported to the nearest half band. An average ending in .25 rounds up to the next half band, and .75 rounds up to the next whole band. So 6.25 becomes 6.5, and 6.75 becomes 7.0.",
          "This is why the cheapest half band is almost always in your weakest skill. Lifting a 5.5 to a 6 moves the average by 0.125, which is often exactly enough to cross a rounding boundary that lifting an already-strong skill would not.",
        ],
      },
      {
        heading: "Treat these tables as a close guide, not a guarantee",
        paragraphs: [
          "Every version of the test is statistically equated, which means the exact raw score needed for a band can shift by a mark or two between papers to keep the standard constant. The tables above are the widely published Cambridge averages and they are what any calculator, including ours, is built on. Use them to track progress and set targets, not to argue with a result.",
          "One thing they do not flex on: spelling and grammar. A correct answer spelt wrong scores zero in both Listening and Reading, and exceeding the stated word limit scores zero however right the content is. Those are the marks people lose without ever knowing.",
        ],
      },
      {
        heading: "Find your band after every practice set",
        paragraphs: [
          "Converting scores by hand gets old fast. On IELTSVega every Listening and Reading set is marked instantly against these tables, for whichever module you are sitting, so you see the band rather than the raw number. Full mock tests report a band per skill and your rounded overall, and the Writing and Speaking papers are AI-scored against all four criteria, so the overall band you see is calculated exactly the way the real one will be.",
        ],
      },
    ],
    faqs: [
      { q: "What band is 32 out of 40 in IELTS?", a: "It depends which paper. 32 out of 40 is Band 7.5 in Listening, Band 7 in Academic Reading and Band 6.5 in General Training Reading. The three papers use separate conversion tables, so the same raw score gives three different bands." },
      { q: "What is 27 out of 40 in IELTS Listening?", a: "27 out of 40 in Listening is Band 6.5. You need 30 for Band 7, so three more correct answers would move you up a half band." },
      { q: "Is 6.25 rounded to 6.5 in IELTS?", a: "Yes. An overall average ending in .25 rounds up to the next half band, and .75 rounds up to the next whole band. So a 6.25 average is reported as 6.5 and a 6.75 average is reported as 7.0." },
      { q: "Why is General Training Reading scored harder than Academic Reading?", a: "Because a band describes a level of English rather than a score in one paper. General Training texts are everyday materials and easier to read, so a higher proportion of correct answers is required for the same band. Band 7 needs 30 out of 40 in Academic Reading but 34 out of 40 in General Training." },
      { q: "Do Listening and Reading use the same band score chart?", a: "No. Listening has one table that covers both Academic and General Training candidates. Reading has two separate tables, one for Academic and a stricter one for General Training." },
      { q: "Can you get half bands in IELTS Listening and Reading?", a: "Yes. Both are awarded in half band steps straight from the raw score table, exactly like Writing and Speaking. There is no rounding applied to an individual skill, only to the overall average of the four." },
    ],
  },
  {
    slug: "how-ielts-band-score-is-calculated",
    title: "How the IELTS band score is calculated, and how to raise it",
    excerpt: "The 9-band scale, how each section is marked, how the overall band is averaged and rounded, and where the rounding rule quietly costs people half a band.",
    category: "Scoring",
    date: "July 2026",
    updatedAt: "2026-09-14",
    readMins: 6,
    /**
     * TARGETING: the METHOD — criteria, weighting, rounding.
     *
     * These used to be ten vague head terms ("ielts score", "test ielts") that
     * competed with /ielts-band-scores while describing nothing specific. This
     * post now owns the scoring cluster; /ielts-band-scores owns band meanings
     * and /blog/ielts-band-score-chart owns the raw-score conversion tables.
     * See the targeting note in src/app/ielts-band-scores/page.tsx.
     */
    keywords: [
      "how is ielts band score calculated",
      "ielts scoring system",
      "ielts overall band score calculator all four skills",
      "how is ielts overall band score rounded",
      "ielts 6.25 rounds to which band",
      "ielts 6.75 rounds up or down",
      "ielts writing task 1 and task 2 weighting",
      "ielts writing score calculation task 2 counts double",
      "ielts speaking four criteria equal weighting",
      "ielts half band scores how they work",
      "ielts band descriptors writing task 2 explained",
      "ielts grading explained",
    ],
    sections: [
      { paragraphs: ["IELTS reports scores on a 9-band scale, from Band 1 (non-user) to Band 9 (expert). You receive a band for each of the four skills, Listening, Reading, Writing and Speaking, plus an overall band. Understanding exactly how those numbers are produced is the fastest way to stop losing marks you don't need to."] },
      { heading: "Listening and Reading: raw score → band", paragraphs: ["Both are marked out of 40. Your raw score (the number of correct answers) is converted to a band using a fixed conversion table. As a rough guide, around 30/40 maps to Band 7 and 35/40 to Band 8, though the exact table varies slightly by test. Every mark counts, and spelling and grammar must be correct."] },
      { heading: "Writing and Speaking: four criteria", paragraphs: ["These are marked by criteria, each weighted equally:"], bullets: ["Task Achievement / Task Response", "Coherence & Cohesion (Fluency & Coherence in Speaking)", "Lexical Resource", "Grammatical Range & Accuracy (plus Pronunciation in Speaking)"] },
      { heading: "How the overall band is rounded", paragraphs: ["Your overall band is the average of the four skill bands, rounded to the nearest half-band. A .25 average rounds up to the next half-band, and .75 rounds up to the next whole band. So a 6.75 average becomes 7.0. Meaning a single half-band in your weakest skill can lift your overall score."] },
      {
        heading: "The rounding rule worked through",
        paragraphs: ["This is where people lose half a band without understanding why. The two rules that matter are that .25 rounds up to the next half-band and .75 rounds up to the next whole band; everything else goes to whichever half-band is nearer. Five real profiles:"],
        table: {
          caption: "L = Listening, R = Reading, W = Writing, S = Speaking.",
          headers: ["L", "R", "W", "S", "Average", "Overall band"],
          rows: [
            ["6.5", "6.5", "6.0", "6.0", "6.25", "6.5 — .25 rounds up"],
            ["7.0", "7.0", "7.0", "6.0", "6.75", "7.0 — .75 rounds up a whole band"],
            ["7.0", "7.0", "6.5", "6.0", "6.625", "6.5 — nearer 6.5 than 7.0"],
            ["6.0", "6.0", "5.5", "6.0", "5.875", "6.0 — nearer 6.0 than 5.5"],
            ["8.0", "7.5", "6.5", "7.0", "7.25", "7.5 — .25 rounds up"],
          ],
        },
      },
      {
        heading: "Why one weak skill is worth fixing first",
        paragraphs: ["Because the overall band is a mean, half a band anywhere moves the average by 0.125, and the rounding boundaries sit close together. Take the third row above: 7.0, 7.0, 6.5, 6.0 gives an overall 6.5. Lifting Speaking alone from 6.0 to 6.5 makes the average 6.75, which rounds up to a 7.0 overall. The same half-band added to Listening instead, taking it from 7.0 to 7.5, produces an average of 6.75 as well — so either works, but the weak skill is almost always the cheaper place to find it.", "This is also why chasing your strongest skill is a poor strategy. Going from 7.0 to 8.0 in Reading, which is hard, moves the overall by the same amount as going from 6.0 to 7.0 in Speaking, which for most candidates is considerably easier."],
      },
      {
        heading: "Writing: why Task 2 counts double",
        paragraphs: ["Your single reported Writing band is weighted, with Task 2 counting roughly twice Task 1. The practical effect is larger than most candidates expect, and it is the strongest argument for the standard 20/40 minute split.", "Take the same two task scores in each order. The figures below are illustrative — centres report one Writing band rather than publishing the internal arithmetic — but the direction is exactly right:"],
        table: {
          headers: ["Task 1 band", "Task 2 band", "Weighted average", "Reported Writing band"],
          rows: [
            ["8.0", "6.0", "(8 + 12) ÷ 3 = 6.67", "≈ 6.5"],
            ["6.0", "8.0", "(6 + 16) ÷ 3 = 7.33", "≈ 7.5"],
            ["7.0", "7.0", "(7 + 14) ÷ 3 = 7.00", "7.0"],
          ],
        },
      },
      { heading: "A strong Task 1 cannot rescue a weak Task 2", paragraphs: ["The two rows above use the same pair of numbers and land a full band apart. That is the whole case for protecting Task 2 time: 20 minutes on Task 1 and 40 on Task 2, and if you are running out of time, an under-developed Task 1 costs you far less than an unfinished Task 2."] },
      { heading: "Where the easiest half-bands hide", bullets: ["Listening/Reading: fix careless spelling and word-limit errors, pure lost marks.", "Writing: add a clear overview (Task 1) and a consistent position (Task 2).", "Speaking: extend every answer with a reason and an example.", "Target your weakest skill: rounding rewards lifting the lowest number."] },
      {
        heading: "Where to go next",
        paragraphs: ["This guide covers the method. Two companion pages cover the numbers themselves:"],
        links: [
          { label: "IELTS band score chart: raw score to band conversion for Listening and Reading", href: "/blog/ielts-band-score-chart" },
          { label: "IELTS band scores explained: what each band means to a university or visa route", href: "/ielts-band-scores" },
          { label: "IELTS band score calculator: work out your overall band from four skill scores", href: "/ielts-band-score-calculator" },
        ],
      },
    ],
    faqs: [
      { q: "Is Band 6.5 a good IELTS score?", a: "Band 6.5 shows a competent user and is enough for many undergraduate courses and some visa routes. However, competitive universities and professional registrations often ask for 7.0 or higher, so check your specific requirement." },
      { q: "How is the overall IELTS band calculated?", a: "It's the average of your four skill bands (Listening, Reading, Writing, Speaking), rounded to the nearest half-band. An average ending in .25 rounds up to the next half-band and .75 rounds up to the next whole band." },
      { q: "Can I raise my IELTS band quickly?", a: "Yes, because the overall band is an average, lifting your single weakest skill by half a band is often the fastest route. Fixing careless Listening/Reading errors and adding a clear Writing structure are the quickest wins." },
      { q: "What does an IELTS average of 6.25 round to?", a: "6.5. An average ending in .25 is rounded up to the next half-band. So skill bands of 6.5, 6.5, 6.0 and 6.0 average 6.25 and are reported as an overall 6.5." },
      { q: "Does 6.75 round up or down in IELTS?", a: "Up, and to a whole band rather than a half. An average ending in .75 is rounded up to the next whole band, so 6.75 is reported as 7.0. Skill bands of 7.0, 7.0, 7.0 and 6.0 average 6.75 and give an overall 7.0." },
      { q: "Does Task 2 really count more than Task 1 in IELTS Writing?", a: "Yes, roughly twice as much. The practical effect is large: the same two task scores swapped over can land a full band apart, because a strong Task 1 cannot compensate for a weak Task 2. This is why the standard advice is 20 minutes on Task 1 and 40 on Task 2, and why an unfinished Task 2 is far more costly than a thin Task 1." },
      { q: "Which skill should I improve to raise my overall IELTS band?", a: "Your weakest one, almost always. Every skill contributes equally to the average, so half a band gained in Speaking counts exactly as much as half a band gained in Reading. Since the last half-band of a strong skill is much harder to win than the first half-band of a weak one, the lowest number on your Test Report Form is where the cheapest improvement lives." },
    ],
  },
  {
    slug: "writing-mistakes-stuck-at-6-5",
    title: "7 mistakes that keep you stuck at Band 6.5 in Writing",
    excerpt: "The recurring habits that cap fluent writers at Band 6.5 in IELTS Writing, why examiners penalise each one, and the specific fixes that move you to Band 7.",
    category: "Writing",
    date: "July 2026",
    updatedAt: "2026-09-14",
    readMins: 7,
    keywords: ["ielts writing", "band ielts", "ielts writing task 2", "ielts writing task 1", "ielts score", "ielts academic", "ielts practice", "ielts exam", "lexical resource", "test ielts"],
    sections: [
      { paragraphs: ["Most people stuck at 6.5 in Writing are not weak at English. They're making a handful of predictable, fixable errors against the band descriptors. Here are the seven that matter most."] },
      { heading: "1. No clear position (Task 2)", paragraphs: ["If the question asks your opinion, state it in the introduction and hold it to the conclusion. Sitting on the fence caps Task Response."] },
      { heading: "2. No overview (Task 1)", paragraphs: ["A data-free sentence naming the main trends is the single most important line in Task 1. Without it, you're capped at Band 6 no matter how accurate your figures are."] },
      { heading: "3. Under-developed ideas", paragraphs: ["A reason with no explanation or example is a listed idea, not a developed one. Follow topic sentence → explain → example → link back."] },
      { heading: "4. Memorised phrases and templates", paragraphs: ["Examiners spot 'It is a well-known fact that…' openers instantly and penalise memorised, off-topic language. Write to the specific question."] },
      { heading: "5. Mechanical linking", paragraphs: ["'Firstly, Secondly, Moreover, In conclusion' on every sentence signals weak cohesion, not strong. Link ideas naturally and vary connectors."] },
      { heading: "6. Repetitive vocabulary", paragraphs: ["Reusing the same words (especially the topic's keywords) limits Lexical Resource. Paraphrase and use precise collocations, not rare 'big words' used wrongly."] },
      { heading: "7. Ignoring proofreading", paragraphs: ["Articles, subject-verb agreement, plurals and tense slips add up. Leave three minutes to check, it's the cheapest half-band available."] },
    ],
    faqs: [
      { q: "Why is my IELTS Writing stuck at 6.5?", a: "Usually because fluent writing and high-band writing are not the same thing. Most candidates at 6.5 write clearly but lose marks on a small set of recurring habits: no clear position, no overview in Task 1, ideas that stop at the assertion, and mechanical linking. These are structural faults rather than vocabulary faults, which is why more practice at the same habits does not move the band." },
      { q: "Do linking words improve my IELTS Writing score?", a: "Only when they reflect the actual logic of your argument. Examiners penalise mechanical or over-used cohesion explicitly, so opening every paragraph with Firstly, Moreover and In conclusion signals a template rather than coherence. Use a linker when the relationship between two ideas genuinely needs marking, and not otherwise." },
      { q: "Are memorised phrases penalised in IELTS Writing?", a: "Yes. Learned sentences that could be attached to any question carry no credit and are visible to examiners, who mark them down under Lexical Resource. They also crowd out your word count with language that does not address the specific task, which costs you under Task Response as well." },
      { q: "Does writing more words raise my IELTS Writing band?", a: "No. Beyond the minimum of 250 for Task 2 and 150 for Task 1, length is not rewarded. Longer answers generally contain more errors and are written under more time pressure, so they tend to score lower. Depth of development raises the band; volume does not." },
    ],
  },
  {
    slug: "ielts-4-week-study-plan",
    seoTitle: "IELTS Study Plan: 1, 4, 8 and 12-Week Schedules",
    title: "IELTS study plan: how long you need, and a schedule for each timeframe",
    excerpt: "Pick the IELTS study plan that matches your band gap: one week, four, eight or twelve. With a weekly timetable, a UKVI section and what to settle first.",
    category: "Study plan",
    date: "July 2026",
    updatedAt: "2026-09-19",
    readMins: 12,
    keywords: ["ielts study plan", "ielts practice", "ielts study timetable", "ielts ukvi study plan", "ielts exam", "band ielts", "ielts preparation schedule", "ielts writing", "ielts speaking", "listening ielts"],
    sections: [
      { paragraphs: ["Most IELTS study plans assume you have exactly the amount of time they happen to be selling. The useful question is the other way round: how far are you from your target band, and how long does closing that gap actually take? Work that out first, then pick the schedule that fits.", "Below are four plans — one week, four weeks, eight weeks and twelve — plus a weekly timetable you can adapt, and what to settle before day one."] },
      { heading: "How long do you actually need?", paragraphs: ["Take one full timed mock before you plan anything. Planning around a guess wastes the first week, and the gap between your diagnostic and your target is the only input that matters here."], table: { caption: "Preparation time by band gap", headers: ["Gap to your target band", "Realistic preparation", "What the time goes on"], rows: [["Already at target, need familiarity", "1 week", "Format, timing, two full mocks"], ["Up to 0.5 band", "4 weeks", "Technique and question types, not English"], ["Around 1 band", "6 to 8 weeks", "Technique plus targeted vocabulary and grammar"], ["1.5 bands or more", "12 weeks or longer", "Underlying proficiency first, test technique second"], ["Starting below 5.5 overall", "12 weeks minimum", "General English foundations before any test practice"]] } },
      { paragraphs: ["The distinction that matters: technique gains come fast and proficiency gains do not. Four weeks can reliably fix pacing, question-type errors and Task 1 structure. It cannot move your English a full band, and a plan that promises otherwise is selling you the wrong month."] },
      { heading: "Before week 1: what to settle first", bullets: ["Confirm which test you need — Academic, General Training, or IELTS for UKVI — before you study a single question type.", "Book the test date. Everything below counts backwards from it, and availability may decide your format.", "Check the requirement per skill, not just the overall band. Most visa and admission rules set a minimum in each of the four.", "Run one full timed mock and record a band per skill. That is your baseline.", "Decide your two weakest skills from the mock, not from how you feel about them."] },
      { heading: "The one-week plan, if the test is already booked", paragraphs: ["This is triage, not preparation, and it is aimed at candidates already close to their target. Days one and two: learn the format of every section and the marking criteria for Writing and Speaking. Days three and four: one timed section per skill, reviewing every error. Day five: one full mock. Day six: light work on the single weakest question type, plus a Speaking run-through out loud. Day seven: rest.", "Do not attempt to learn new vocabulary in this week. Spend the time on pacing and on the instructions, which is where the avoidable marks are."] },
      { heading: "The 4-week plan, for a half-band gap", paragraphs: ["This is the plan most candidates need, and the one the rest of this page builds on. It assumes your diagnostic mock is within about half a band of your target and that the problem is technique rather than English."] },
      { heading: "Week 1: Diagnose and learn the format", paragraphs: ["Take one timed practice test per skill to find your baseline and weakest areas. Learn the exact question types and marking criteria. You can't fix what you don't understand. End the week knowing your target band and your two weakest skills."] },
      { heading: "Week 2: Drill weak question types", paragraphs: ["Focus daily practice on the specific types costing you marks (e.g. True/False/Not Given, matching headings, Task 1 overviews). Use instant feedback to correct patterns, not just to see a score."] },
      { heading: "Week 3: Productive skills under time", paragraphs: ["Write and speak daily under timed conditions with AI band feedback. Build templates you can adapt (not memorise), and log your recurring errors so you stop repeating them."] },
      { heading: "Week 4: Full mocks and exam stamina", paragraphs: ["Sit full-length mock tests on real timing to build endurance and iron out pacing. Review every mistake, do light targeted practice on your weakest type, and rest before test day."] },
      { heading: "The 8-week plan, for a full band gap", paragraphs: ["Eight weeks is the four-week plan with the two things it has no room for: consolidation, and a second diagnostic. Weeks 1 and 2 go on format and a full baseline mock, then the vocabulary and grammar your Writing errors keep pointing at. Weeks 3 and 4 drill weak question types, one skill per day. Week 5 is a mid-point mock and a re-diagnosis — the weaknesses you started with are usually not the ones you still have.", "Weeks 6 and 7 move to Writing and Speaking under time, daily, with feedback against all four criteria. Week 8 is two full mocks on real timing, a final review of your error log, and rest before test day."] },
      { heading: "The 12-week plan, when the gap is 1.5 bands or more", paragraphs: ["The mistake at this range is starting with test technique. If your English is a band and a half below target, technique polishes a number that is not there yet. Weeks 1 to 4 go on general English: daily reading and listening for range and speed, systematic vocabulary, and the grammar structures that Writing Task 2 actually needs.", "Weeks 5 to 8 introduce the test: format, question types, and one timed section per skill per week. Weeks 9 to 12 are the four-week plan run properly — drilling, productive skills under time, then full mocks.", "Re-test with a full mock at week 4 and week 8. If the gap has not narrowed by week 8, extend rather than compress; sitting the test early to 'see how it goes' costs a fee and tells you what the mock already told you."] },
      { heading: "Your weekly timetable", paragraphs: ["Adapt this rather than following it exactly. The light column is a realistic weekday load alongside work or study; the intensive column is for candidates preparing full time."], table: { caption: "A week of IELTS preparation", headers: ["Day", "Focus", "Light", "Intensive"], rows: [["Monday", "Listening", "30 min", "60 min"], ["Tuesday", "Reading", "45 min", "90 min"], ["Wednesday", "Writing Task 2", "60 min", "2 hours"], ["Thursday", "Speaking", "30 min", "60 min"], ["Friday", "Writing Task 1 and error log", "45 min", "90 min"], ["Saturday", "One full timed section", "60 min", "Full mock"], ["Sunday", "Review, vocabulary, rest", "30 min", "60 min"]] } },
      { paragraphs: ["Ninety minutes of focused work beats four hours of unfocused reading, and consistency beats volume. Protect the Saturday block whatever else slips: stamina under exam conditions is a separate skill from accuracy on individual questions, and it is the one that collapses first on test day."] },
      { heading: "If you are taking IELTS for UKVI", paragraphs: ["The preparation is identical. IELTS for UKVI tests the same content under the same band descriptors, and your study plan does not change because of it. What changes is administrative, and it is worth settling in week 0 rather than week 4.", "You must book at a centre approved to deliver UKVI tests, the identity and security requirements are stricter, and the Test Report Form is marked as a UKVI test. Check whether your route needs Academic or General Training, and confirm the per-skill minimum, which is where most UKVI applications actually fail. An at-home test does not qualify: IELTS Online cannot be used where a UKVI-approved test is required."], links: [{ label: "Which UKVI test you need, and the scores the UK asks for", href: "/blog/ielts-ukvi-vs-ielts-academic" }] },
      { heading: "Daily habits that compound", bullets: ["Practise Listening with a single play, never replaying.", "Keep an error log and review it before each session.", "Read/listen to English daily for range and speed.", "Sit at least two full mock tests before the real exam."], links: [{ label: "Question-type reading practice", href: "/resources/reading" }, { label: "Sit a full timed mock", href: "/mock-tests" }] },
    ],
    faqs: [
      { q: "Is four weeks enough to prepare for IELTS?", a: "Four weeks is enough to learn the format, fix technique and build exam stamina, which is often worth half a band on its own. It is usually not enough to raise underlying English proficiency by a full band. If your diagnostic mock is within about 0.5 of your target, four weeks is realistic; if the gap is 1.5 bands or more, plan for longer." },
      { q: "What is a good timetable for preparing for IELTS?", a: "One skill per day across the week, with a full timed section at the weekend: Listening Monday, Reading Tuesday, Writing Task 2 Wednesday, Speaking Thursday, Task 1 and your error log Friday, a timed section Saturday, review and rest Sunday. Ninety minutes a day is a realistic load alongside work, and consistency matters more than length. Protect the weekend block, because exam stamina is a separate skill from accuracy." },
      { q: "How many weeks do I need to prepare for IELTS UKVI?", a: "The same as for Academic or General Training, because the content and band descriptors are identical: about four weeks if you are within half a band of your target, six to eight for a full band, and twelve or more beyond that. Add time at the start for the administrative side — booking at a UKVI-approved centre and confirming the per-skill minimum your visa route requires." },
      { q: "Can I get 7.5 in IELTS in one month?", a: "It depends entirely on where you start. If your diagnostic mock is 7.0, a month of technique work and timed practice can realistically reach 7.5. If it is 6.0, one month is not enough, because the gap is proficiency rather than technique and proficiency moves slowly. Take a full timed mock before deciding, and plan against that number rather than against the one you want." },
      { q: "How do I create an IELTS study plan?", a: "Start with a full timed mock to find out where you actually are, because planning around a guess wastes the first week. Then spend week one on format, week two drilling your weakest question types, week three on Writing and Speaking under time, and week four on full mocks. Fix the diagnosis first and the schedule follows from it." },
      { q: "Does the study plan change for IELTS UKVI?", a: "The preparation is the same. IELTS for UKVI tests identical content under the same band descriptors, and differs only in the administrative and identity requirements imposed by the UK Home Office and in where you can sit it. Prepare exactly as you would for Academic or General Training, and put the extra effort into booking at an approved centre." },
      { q: "How many hours a day should I study for IELTS?", a: "Ninety minutes to two hours of focused work beats four hours of unfocused reading, and consistency matters more than volume. Protect at least one longer block each week for a full timed section, because stamina under exam conditions is a separate skill from accuracy on individual questions." },
    ],
  },
];

export const POST_BY_SLUG = Object.fromEntries(POSTS.map((p) => [p.slug, p])) as Record<string, BlogPost>;
