/**
 * Template / "sentence bank" content — natural, examiner-friendly patterns
 * students can adapt to almost any topic. Data-driven like the blog and study
 * content so the /templates page and any future tabs pick it up automatically.
 *
 * Each set links back to the matching resources guide (the "how/why + full model
 * answers") so the templates are the quick reference and resources are the depth.
 */

export type TemplateItem = { pattern: string; example?: string };
export type TemplateGroup = { heading: string; note?: string; items: TemplateItem[] };
export type TemplateFormula = {
  title: string;
  steps: { label: string; text: string }[];
  note?: string;
};
export type TemplateSet = {
  id: string; // anchor, e.g. "task-1"
  label: string; // short tab label, e.g. "Task 1"
  title: string;
  blurb: string;
  /** Link to the deeper guide with worked examples. */
  resource: { href: string; label: string };
  groups: TemplateGroup[];
  formula?: TemplateFormula;
};
export type TemplateSection = {
  key: string; // "writing"
  label: string;
  title: string;
  blurb: string;
  resourceHref: string;
  sets: TemplateSet[];
};

/* ------------------------------------------------------------------ *
 * Writing — Task 1 (Academic, describing data) + Task 2 (essay)
 * ------------------------------------------------------------------ */

const WRITING_TASK_1: TemplateSet = {
  id: "task-1",
  label: "Task 1",
  title: "Writing Task 1 — describing data (Academic)",
  blurb:
    "Sentence patterns for describing graphs, charts, tables, maps and processes. Paraphrase the prompt, give a clear overview, then report the key features with accurate data — no opinions.",
  resource: { href: "/resources/writing/task-1", label: "Task 1 guide + Band 9 examples" },
  groups: [
    {
      heading: "Introduction — paraphrase the visual",
      note: "Never copy the prompt word-for-word; reword it in one sentence.",
      items: [
        { pattern: "The [line graph / bar chart / table / pie chart] illustrates…", example: "The line graph illustrates coffee and tea consumption per person between 2000 and 2020." },
        { pattern: "The [chart] compares… over the period from … to …" },
        { pattern: "The diagram depicts the process by which…" },
        { pattern: "The map shows how [place] changed between … and …" },
      ],
    },
    {
      heading: "Overview — the single most important line",
      note: "Start with 'Overall,' and give the big picture with NO specific numbers. Without it you're capped at Band 5.",
      items: [
        { pattern: "Overall, it is clear that…", example: "Overall, it is clear that coffee overtook tea to become the more popular drink." },
        { pattern: "Overall, the most striking feature is that…" },
        { pattern: "In general, [X] rose steadily while [Y] showed the opposite trend." },
        { pattern: "It is noticeable that [X] remained the highest throughout the period." },
      ],
    },
    {
      heading: "Describing an increase",
      items: [
        { pattern: "… rose / climbed / increased / grew / went up…", example: "Sales of electric cars rose sharply after 2015." },
        { pattern: "There was a [sharp / gradual / steady] rise in…" },
        { pattern: "… surged / soared (for a dramatic increase)." },
        { pattern: "… experienced steady growth over the period." },
      ],
    },
    {
      heading: "Describing a decrease",
      items: [
        { pattern: "… fell / declined / dropped / decreased / went down…", example: "The number of visitors fell steadily between 2010 and 2015." },
        { pattern: "There was a [sharp / gradual] decline in…" },
        { pattern: "… plummeted / plunged (for a dramatic fall)." },
        { pattern: "… halved / dropped to a low of…" },
      ],
    },
    {
      heading: "Stability & fluctuation",
      items: [
        { pattern: "… remained stable / held steady / levelled off at…" },
        { pattern: "… plateaued at around…" },
        { pattern: "… fluctuated (wildly) between … and …" },
        { pattern: "… stayed roughly the same throughout the period." },
      ],
    },
    {
      heading: "Degree & speed (adjectives / adverbs)",
      note: "Vary how strong and how fast the change is.",
      items: [
        { pattern: "Speed: rapidly, sharply, steeply, dramatically vs gradually, steadily, slowly." },
        { pattern: "Degree: a slight / marginal / significant / substantial / dramatic change." },
      ],
    },
    {
      heading: "Grammar variation (impress the examiner)",
      note: "Show range by switching between two structures for the same idea.",
      items: [
        { pattern: "Verb + adverb: 'Prices rose sharply.'" },
        { pattern: "There was + adjective + noun: 'There was a sharp rise in prices.'" },
      ],
    },
    {
      heading: "Comparisons & superlatives",
      items: [
        { pattern: "[X] was significantly / slightly higher than [Y]." },
        { pattern: "[X] was more than twice as high as [Y]." },
        { pattern: "The highest / lowest figure was recorded by…" },
        { pattern: "[X] accounted for the largest proportion, at …%." },
      ],
    },
    {
      heading: "Proportions & percentages (pie charts / tables)",
      items: [
        { pattern: "… accounted for / made up / represented …% of the total." },
        { pattern: "A [quarter / third / majority] of… " },
        { pattern: "The largest / smallest share belonged to…" },
      ],
    },
    {
      heading: "Predictions & future data",
      note: "Use when the visual includes projected years.",
      items: [
        { pattern: "… is expected / projected / forecast to reach… by [year]." },
        { pattern: "… is likely to continue to rise over the coming decades." },
      ],
    },
    {
      heading: "Process diagrams",
      note: "Use the passive voice and clear sequencers.",
      items: [
        { pattern: "The process consists of [number] main stages." },
        { pattern: "First / Initially, … Then / Subsequently, … Following this, … Finally, …" },
        { pattern: "At this stage, the [material] is [heated / collected / transported]…" },
      ],
    },
    {
      heading: "Maps (changes over time)",
      items: [
        { pattern: "The area underwent significant changes / was transformed between … and …" },
        { pattern: "The [woodland] was cleared to make way for…" },
        { pattern: "A [new road] was constructed / built, while the [X] was demolished / relocated." },
      ],
    },
  ],
  formula: {
    title: "Task 1 four-paragraph formula",
    steps: [
      { label: "Introduction", text: "Paraphrase what the visual shows (1 sentence)." },
      { label: "Overview", text: "'Overall, …' — the 2–3 biggest trends, no numbers." },
      { label: "Body 1", text: "Describe the first group of key features with data." },
      { label: "Body 2", text: "Describe the remaining key features with data." },
    ],
    note: "Spend ~20 minutes and write 150+ words. For General Training, Task 1 is a letter instead — see the guide.",
  },
};

const WRITING_TASK_2: TemplateSet = {
  id: "task-2",
  label: "Task 2",
  title: "Writing Task 2 — universal sentence bank (Band 7–9)",
  blurb:
    "Natural, examiner-friendly patterns you can adapt to almost any essay — Opinion, Discussion, Advantages/Disadvantages, Problem/Solution, Cause/Effect and Two-part questions.",
  resource: { href: "/resources/writing/task-2", label: "Task 2 guide + Band 9 model essays" },
  groups: [
    {
      heading: "Introduction — introduce the topic",
      items: [
        { pattern: "… has become increasingly common in many parts of the world.", example: "Online learning has become increasingly common in many parts of the world." },
        { pattern: "In recent years, there has been a growing trend towards…", example: "In recent years, there has been a growing trend towards remote working." },
        { pattern: "With the rapid development of modern society, … has become an important issue." },
        { pattern: "… is widely regarded as one of the most significant issues facing society today." },
        { pattern: "There is an ongoing debate about whether…" },
      ],
    },
    {
      heading: "Introduction — explain the reason behind the trend",
      items: [
        { pattern: "This change is mainly driven by…", example: "This change is mainly driven by technological advancement and changing lifestyles." },
        { pattern: "Several factors have contributed to this trend." },
        { pattern: "This development can largely be attributed to…" },
        { pattern: "One of the primary reasons for this trend is…" },
      ],
    },
    {
      heading: "Thesis — state your position",
      note: "Match the sentence to the question type.",
      items: [
        { pattern: "Opinion: I completely / largely agree with this view." },
        { pattern: "Opinion: I partly agree; however, I believe…" },
        { pattern: "Positive/Negative: Overall, I believe this is a positive development." },
        { pattern: "Advantages outweigh: Although this has certain disadvantages, I believe its advantages are far more significant." },
        { pattern: "Discussion: This essay will discuss both perspectives before presenting my own opinion." },
      ],
    },
    {
      heading: "Body paragraph openings",
      items: [
        { pattern: "First idea: The main reason is that… / One significant advantage is that… / One major problem is that…" },
        { pattern: "First idea: One possible solution is to… / The primary cause of this trend is…" },
        { pattern: "Second idea: Another important point is that… / Another contributing factor is…" },
        { pattern: "Second idea: Furthermore, … / Moreover, … / In addition, …" },
      ],
    },
    {
      heading: "Explanation",
      items: [
        { pattern: "This is because…" },
        { pattern: "The reason for this is that…" },
        { pattern: "This can be explained by the fact that…" },
        { pattern: "As a result, … / Consequently, … / Therefore, … / For this reason, …" },
      ],
    },
    {
      heading: "Effect",
      items: [
        { pattern: "This can have a significant impact on…" },
        { pattern: "This may lead to… / This often results in…" },
        { pattern: "As a consequence, …" },
        { pattern: "This contributes to… / This plays a crucial role in…" },
      ],
    },
    {
      heading: "Advantages",
      items: [
        { pattern: "One of the biggest advantages is that… / One notable benefit is…" },
        { pattern: "This enables people to… / This allows individuals to…" },
        { pattern: "This provides greater opportunities for…" },
        { pattern: "This can improve… / This helps to reduce…" },
      ],
    },
    {
      heading: "Disadvantages",
      items: [
        { pattern: "One significant drawback is that…" },
        { pattern: "However, this may also result in…" },
        { pattern: "Despite these benefits, there are several disadvantages." },
        { pattern: "This can create challenges for… / This may place additional pressure on…" },
      ],
    },
    {
      heading: "Causes",
      items: [
        { pattern: "This trend is largely caused by… / This change is mainly driven by…" },
        { pattern: "This can largely be attributed to…" },
        { pattern: "Several factors are responsible for this trend." },
        { pattern: "The primary cause is…" },
      ],
    },
    {
      heading: "Problems",
      items: [
        { pattern: "One serious problem is that…" },
        { pattern: "One major issue associated with this is…" },
        { pattern: "This creates a number of challenges." },
        { pattern: "One immediate consequence is…" },
      ],
    },
    {
      heading: "Solutions",
      items: [
        { pattern: "One effective solution would be to…" },
        { pattern: "Governments should… / Individuals can also play an important role by…" },
        { pattern: "This problem could be addressed by…" },
        { pattern: "One practical measure is to…" },
      ],
    },
    {
      heading: "Comparison / concession",
      items: [
        { pattern: "Although this can benefit X, it may also weaken Y." },
        { pattern: "While this approach offers several benefits, it also has certain limitations." },
        { pattern: "Despite its advantages, this development is not without drawbacks." },
        { pattern: "Although both views have merit, I believe…" },
      ],
    },
    {
      heading: "Examples",
      items: [
        { pattern: "For example, … / For instance, …" },
        { pattern: "A good example of this is…" },
        { pattern: "This can clearly be seen in…" },
        { pattern: "Many developed countries have demonstrated this by…" },
      ],
    },
    {
      heading: "Conclusion",
      items: [
        { pattern: "Restate: In conclusion, … / To conclude, … / Overall, …" },
        { pattern: "Restate opinion: For these reasons, I strongly believe that…" },
        { pattern: "Restate opinion: Considering both sides, I believe that…" },
        { pattern: "Summarise: While this issue is complex, its advantages clearly outweigh its disadvantages." },
        { pattern: "Summarise: Although the issue presents certain challenges, appropriate measures can minimise them." },
      ],
    },
    {
      heading: "High-band patterns to reuse in almost every essay",
      items: [
        { pattern: "… has become increasingly common in many parts of the world." },
        { pattern: "This change is mainly driven by… / This development can largely be attributed to…" },
        { pattern: "One of the primary reasons is… / The main reason is that…" },
        { pattern: "This is because… → As a result, … → Consequently, …" },
        { pattern: "One significant advantage is that… / One major drawback is that…" },
        { pattern: "Although it can benefit X, it may also weaken Y." },
        { pattern: "One practical solution would be to…" },
        { pattern: "In conclusion, while both sides have valid arguments, I believe that…" },
      ],
    },
  ],
  formula: {
    title: "Universal body-paragraph formula",
    steps: [
      { label: "Topic sentence", text: "One significant advantage / problem / reason is that…" },
      { label: "Explanation", text: "This is because…" },
      { label: "Effect", text: "As a result…" },
      { label: "Example", text: "For example…" },
      { label: "Mini conclusion", text: "Therefore, this demonstrates that…" },
    ],
    note: "Works for Opinion, Discussion, Advantages & Disadvantages, Problem & Solution, Cause & Effect, Positive/Negative and Two-part essays.",
  },
};

/* ------------------------------------------------------------------ *
 * Speaking — Part 1 (interview), Part 2 (long turn), Part 3 (discussion)
 * ------------------------------------------------------------------ */

const SPEAKING_PART_1: TemplateSet = {
  id: "speaking-part-1",
  label: "Part 1",
  title: "Speaking Part 1 — the interview",
  blurb:
    "Short questions about you. The trick is to never give one-word answers: give a direct answer, a reason, and a small detail. Adapt these frames to any topic.",
  resource: { href: "/resources/speaking", label: "Speaking guide + band descriptors" },
  groups: [
    {
      heading: "Answer fully (answer → reason → detail)",
      note: "Two to three sentences is the sweet spot.",
      items: [
        { pattern: "Yes, definitely. The main reason is that… In fact, …", example: "Yes, definitely. The main reason is that it helps me relax. In fact, I do it almost every evening." },
        { pattern: "Not really, to be honest. I tend to… because…" },
        { pattern: "It depends, really. On weekdays I…, but at weekends I…" },
      ],
    },
    {
      heading: "Talking about preferences",
      items: [
        { pattern: "I'm definitely more of a [X] person, mainly because…" },
        { pattern: "I'd much rather … than …, simply because…" },
        { pattern: "If I had to choose, I'd probably say…" },
      ],
    },
    {
      heading: "Frequency & habits",
      items: [
        { pattern: "I'd say I … a couple of times a week, usually when…" },
        { pattern: "I hardly ever …, but when I do, …" },
        { pattern: "It's become a bit of a daily routine for me." },
      ],
    },
    {
      heading: "Sounding natural (softeners & fillers)",
      note: "Natural speech isn't perfect speech — small fillers keep you fluent.",
      items: [
        { pattern: "To be honest, … / Actually, … / I suppose … / I'd say …" },
        { pattern: "That's a good question — let me think…" },
      ],
    },
    {
      heading: "Extending when you run short",
      items: [
        { pattern: "…, which is something I've enjoyed since I was young." },
        { pattern: "…, and that's probably why I…" },
        { pattern: "…, especially when I have some free time." },
      ],
    },
  ],
  formula: {
    title: "Part 1 answer formula",
    steps: [
      { label: "Answer", text: "Respond directly to the question." },
      { label: "Reason", text: "Add 'because…' / 'The main reason is…'." },
      { label: "Detail", text: "Give an example or small extra detail." },
    ],
    note: "Keep it to 2–3 sentences — enough to show range without rambling.",
  },
};

const SPEAKING_PART_2: TemplateSet = {
  id: "speaking-part-2",
  label: "Part 2",
  title: "Speaking Part 2 — the long turn (cue card)",
  blurb:
    "One minute to prepare, then 1–2 minutes to speak. Tell it as a small story so you never dry up — cover every bullet but let the reflective part run longest.",
  resource: { href: "/resources/speaking", label: "Speaking guide + Part 2 tips" },
  groups: [
    {
      heading: "Opening the long turn",
      items: [
        { pattern: "I'd like to talk about… / The [thing] I've chosen to describe is…" },
        { pattern: "There are a few things I could mention, but I'll focus on…" },
      ],
    },
    {
      heading: "Covering the prompts (sequencing)",
      items: [
        { pattern: "To give you some background, … / Let me start with…" },
        { pattern: "As for why…, the main reason was that…" },
        { pattern: "In terms of how…, what happened was…" },
      ],
    },
    {
      heading: "Adding colour (specifics & senses)",
      note: "Concrete detail is what fills the two minutes naturally.",
      items: [
        { pattern: "What made it special was…", example: "What made it special was how quiet it was early in the morning." },
        { pattern: "I still remember… / I can picture it clearly, even now." },
      ],
    },
    {
      heading: "Giving reasons & feelings",
      items: [
        { pattern: "The reason this matters to me is that…" },
        { pattern: "It made me feel… / Looking back, I realise that…" },
      ],
    },
    {
      heading: "Ending / reflecting",
      note: "A reflective close is where the higher bands are won.",
      items: [
        { pattern: "All in all, it's something I'll never forget, because…" },
        { pattern: "So that's the [thing] I wanted to describe, and it's had a lasting effect on me." },
      ],
    },
    {
      heading: "Fluency fillers (buy thinking time)",
      items: [
        { pattern: "Let me see… / Where should I start… / Now that I think about it…" },
      ],
    },
  ],
  formula: {
    title: "Part 2 story structure",
    steps: [
      { label: "Set up", text: "Introduce what you'll describe (1 line)." },
      { label: "Cover the bullets", text: "Move through the prompts with sequencers." },
      { label: "Develop the key bullet", text: "Spend most time on the 'explain/why' prompt." },
      { label: "Reflect", text: "End with how you feel / why it mattered." },
    ],
    note: "Use your 1-minute prep to note one keyword per bullet — don't write full sentences.",
  },
};

const SPEAKING_PART_3: TemplateSet = {
  id: "speaking-part-3",
  label: "Part 3",
  title: "Speaking Part 3 — the discussion",
  blurb:
    "Abstract questions linked to your Part 2 topic. This is where Band 7+ is decided: give an opinion, justify it, and acknowledge another view.",
  resource: { href: "/resources/speaking", label: "Speaking guide + Part 3 questions" },
  groups: [
    {
      heading: "Giving & justifying an opinion",
      items: [
        { pattern: "I'd argue that…, mainly because…" },
        { pattern: "Personally, I think…, and the reason is…" },
        { pattern: "In my view, …, although it does depend on…" },
      ],
    },
    {
      heading: "Balancing views (concession)",
      note: "Showing both sides lifts your Coherence and Grammar range.",
      items: [
        { pattern: "On the one hand, …; on the other hand, …" },
        { pattern: "While some people believe…, I'd say that…" },
        { pattern: "That said, there's a strong argument that…" },
      ],
    },
    {
      heading: "Comparing then and now",
      items: [
        { pattern: "Compared to the past, people nowadays tend to…" },
        { pattern: "A generation ago, …, whereas today…" },
      ],
    },
    {
      heading: "Speculating about the future",
      note: "Modal + future forms show grammatical range examiners reward.",
      items: [
        { pattern: "I imagine that in the future, … / It's likely that…" },
        { pattern: "If this trend continues, we might well see…" },
      ],
    },
    {
      heading: "Generalising",
      items: [
        { pattern: "By and large, … / On the whole, … / Generally speaking, …" },
        { pattern: "There's a tendency for people to…" },
      ],
    },
    {
      heading: "Examples & evidence",
      items: [
        { pattern: "Take … as an example. / A good case in point is…" },
        { pattern: "You often see this with… / Research seems to suggest that…" },
      ],
    },
  ],
};

export const TEMPLATE_SECTIONS: TemplateSection[] = [
  {
    key: "writing",
    label: "Writing",
    title: "Writing templates & sentence banks",
    blurb:
      "Ready-made, examiner-friendly sentences for Writing Task 1 and Task 2 that you can adapt to any topic. Learn a few from each group, then practise them until they're automatic.",
    resourceHref: "/resources/writing",
    sets: [WRITING_TASK_1, WRITING_TASK_2],
  },
  {
    key: "speaking",
    label: "Speaking",
    title: "Speaking templates & useful phrases",
    blurb:
      "Natural frames for all three Speaking parts — how to extend Part 1 answers, structure the Part 2 long turn, and sound fluent and balanced in Part 3. Adapt, don't memorise (examiners penalise scripted answers).",
    resourceHref: "/resources/speaking",
    sets: [SPEAKING_PART_1, SPEAKING_PART_2, SPEAKING_PART_3],
  },
];

export const TEMPLATE_SECTION_BY_KEY = Object.fromEntries(
  TEMPLATE_SECTIONS.map((s) => [s.key, s]),
) as Record<string, TemplateSection>;
