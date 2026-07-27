/**
 * IELTS Writing — deep 2026 study guides for Task 1 and Task 2. Each task has
 * its own page with every question type: what it is, how to answer, a plan, the
 * structure, useful language, common mistakes, and a full sample question with
 * an annotated Band 9 model answer. Content is data so the pages stay DRY.
 */

export type WritingQuestionType = {
  slug: string;
  name: string;
  what: string;
  howToAnswer: string[];
  plan: string;
  structure: string[];
  usefulLanguage: string[];
  mistakes: string[];
  sample: {
    question: string;
    band: string;
    modelAnswer: string;
    whyItScores: string[];
  };
};

export type WritingReference = { label: string; note: string; href: string };

export type WritingGuide = {
  task: "task-1" | "task-2";
  title: string;
  tagline: string;
  intro: string;
  format: { label: string; value: string }[];
  criteria: { name: string; detail: string }[];
  generalStrategy: string[];
  types: WritingQuestionType[];
  references: WritingReference[];
};

const REFERENCES: WritingReference[] = [
  { label: "IELTS.org — official band descriptors", note: "The public Writing Task 1 & Task 2 band descriptors — the exact rubric examiners use.", href: "https://www.ielts.org/for-test-takers/how-ielts-is-scored" },
  { label: "British Council — Take IELTS", note: "Official preparation, sample questions and free practice materials.", href: "https://takeielts.britishcouncil.org/take-ielts/prepare" },
  { label: "IDP IELTS — preparation", note: "Co-owner of IELTS; free samples, webinars and the on-screen test familiarisation.", href: "https://ielts.idp.com/prepare" },
  { label: "Cambridge IELTS 1–19", note: "The authentic past-paper series (Cambridge University Press) — the gold standard for real questions.", href: "https://www.cambridge.org/gb/cambridgeenglish/catalog/cambridge-english-exams-ielts" },
  { label: "IELTS Liz", note: "Widely-used free lessons, model answers and band descriptors explained.", href: "https://ieltsliz.com" },
  { label: "IELTS Simon (ex-examiner)", note: "Method and model answers from a former IELTS examiner.", href: "https://ielts-simon.com" },
];

/* ─────────────────────────────── TASK 1 ─────────────────────────────── */

export const WRITING_TASK1: WritingGuide = {
  task: "task-1",
  title: "Writing Task 1",
  tagline: "Report the data — accurately, and in your own structure.",
  intro:
    "Academic Task 1 asks you to describe visual information (a graph, chart, table, process, or map) in your own words in at least 150 words, in about 20 minutes. General Training Task 1 is a letter instead. You are NOT asked for opinions or reasons — only an accurate, well-organised description. The single biggest lever from Band 6 to Band 7+ is a clear OVERVIEW: one or two sentences naming the main trends or differences, with no data.",
  format: [
    { label: "Time", value: "~20 minutes" },
    { label: "Length", value: "150+ words (aim 160–190)" },
    { label: "Weight", value: "≈ 1/3 of your Writing band" },
    { label: "No", value: "opinions, reasons, or a conclusion" },
  ],
  criteria: [
    { name: "Task Achievement", detail: "Covers the key features with an accurate overview and appropriate data; meets 150 words." },
    { name: "Coherence & Cohesion", detail: "Logical grouping (intro → overview → detail), clear paragraphing and linking." },
    { name: "Lexical Resource", detail: "Precise data language (trends, comparisons, proportions) without repetition." },
    { name: "Grammatical Range & Accuracy", detail: "Varied structures — comparatives, passive (for processes), time clauses — with few errors." },
  ],
  generalStrategy: [
    "Spend 2–3 minutes reading and planning: identify the chart type, units, and time frame.",
    "Pick the 2–4 most significant features (biggest, smallest, fastest change, clear groups).",
    "Write an intro (paraphrase the prompt) → an overview (main trends, no numbers) → 2 detail paragraphs (grouped data with figures).",
    "Compare and group data rather than listing every number in sequence.",
    "Leave 2 minutes to check tenses, articles, singular/plural and word count.",
  ],
  types: [
    {
      slug: "line-graph",
      name: "Line graph (trends over time)",
      what: "One or more lines showing how values change over a period. Tests trend language and comparison across time.",
      howToAnswer: [
        "State what the graph shows, the units, and the time span in the introduction.",
        "In the overview, name the overall trends (rose overall, most volatile, highest throughout).",
        "Group lines that behave similarly; describe movement with figures at key points.",
        "Use the right tense — past for past dates, future forms for projections.",
      ],
      plan: "Underline start value, end value, peaks/troughs and any crossover points before writing.",
      structure: [
        "Intro — paraphrase: what, where, units, period.",
        "Overview — the 1–2 biggest trends across all lines (no data).",
        "Body 1 — the line(s) with the most notable movement, with figures.",
        "Body 2 — the remaining line(s) and any comparison/crossover.",
      ],
      usefulLanguage: [
        "rose/increased/climbed; fell/declined/dropped; fluctuated; levelled off; peaked at; bottomed out at",
        "a sharp/steady/gradual/marginal + increase (noun) · increased sharply/steadily (adverb)",
        "roughly, just under/over, approximately; over the following decade; by the end of the period",
        "whereas, while, in contrast, compared with; overtook, surpassed",
      ],
      mistakes: [
        "No overview, or an overview stuffed with numbers.",
        "Describing every single data point instead of selecting key features.",
        "Wrong preposition/tense: 'increased of 20%', 'in 1990 it will rise'.",
      ],
      sample: {
        question:
          "The line graph below shows the number of visitors (in millions) to three London museums between 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        band: "Band 9",
        modelAnswer:
          "The line graph illustrates how many people, in millions, visited three museums in London — the British Museum, the National Gallery and the Tate Modern — over a ten-year period from 2010 to 2020.\n\nOverall, visitor numbers rose at all three museums across the decade, with the British Museum remaining the most popular throughout. The Tate Modern, however, saw the steepest growth and closed the gap on its rivals by 2020.\n\nIn 2010, the British Museum attracted around 5.8 million visitors, comfortably ahead of the National Gallery at approximately 4.9 million. Both figures climbed steadily, and by 2020 the British Museum had reached roughly 6.6 million while the National Gallery stood at about 5.8 million.\n\nThe Tate Modern began the period as the least visited of the three, with just 4.7 million visitors in 2010. Its numbers then increased far more rapidly than the others, overtaking the National Gallery briefly around 2018 before finishing at approximately 5.9 million — almost level with the two long-established galleries.",
        whyItScores: [
          "A clear, data-free overview names the two main trends (all rose; Tate grew fastest).",
          "Data is grouped and compared, not listed; figures are hedged ('around', 'approximately').",
          "Range of trend language and comparatives; accurate past tense throughout.",
        ],
      },
    },
    {
      slug: "bar-chart",
      name: "Bar chart (comparisons)",
      what: "Bars comparing quantities across categories (and sometimes across time). Tests comparison and grouping.",
      howToAnswer: [
        "Identify whether it compares categories, time, or both.",
        "Overview the biggest and smallest, and any clear pattern across groups.",
        "Group similar bars; use superlatives and comparatives with figures.",
      ],
      plan: "Rank the bars high-to-low and circle the extremes and any group that stands out.",
      structure: [
        "Intro — what is compared and the units.",
        "Overview — the highest/lowest and the overall pattern.",
        "Body 1 — the leading categories with figures.",
        "Body 2 — the lower categories and comparisons.",
      ],
      usefulLanguage: [
        "the highest/lowest; by far the most/least; more than twice as many as; a fraction of",
        "accounted for; represented; stood at; was followed by",
        "significantly, considerably, slightly higher/lower than",
      ],
      mistakes: [
        "Confusing a bar chart's categories with a time trend.",
        "Repeating 'higher than' instead of varying comparison language.",
      ],
      sample: {
        question:
          "The bar chart shows the percentage of households with internet access in four countries in 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        band: "Band 9",
        modelAnswer:
          "The bar chart compares the proportion of households with internet access in four countries — the UK, Japan, Brazil and Kenya — in the years 2005 and 2020.\n\nOverall, access increased markedly in every country over the fifteen-year period. The UK and Japan led throughout, whereas Kenya, despite the largest relative gain, remained the least connected.\n\nIn 2005, around 60% of British and Japanese households had internet access, roughly double the figure for Brazil (about 30%) and far ahead of Kenya, where only 8% were connected. By 2020, the UK and Japan had converged at approximately 95%, near-universal coverage.\n\nBrazil experienced strong growth to reach about 75% by 2020, narrowing the gap with the leaders. Kenya saw the most dramatic proportional rise — from 8% to roughly 40% — yet it still lagged well behind the other three nations by the end of the period.",
        whyItScores: [
          "Overview captures both the universal rise and the persistent ranking.",
          "Precise proportion and comparison language; no bar left unaddressed but data is grouped.",
        ],
      },
    },
    {
      slug: "pie-chart",
      name: "Pie chart (proportions)",
      what: "Segments of a whole (usually percentages). Often two or more pies to compare proportions or time.",
      howToAnswer: [
        "Describe the largest and smallest slices first.",
        "With multiple pies, focus on what changed most between them.",
        "Use proportion language and make sure percentages are handled precisely.",
      ],
      plan: "Note the biggest slice in each pie and the biggest change between pies.",
      structure: [
        "Intro — what the pie(s) divide up.",
        "Overview — the dominant category and the biggest change (if comparing).",
        "Body 1 — the largest segments.",
        "Body 2 — the smaller segments / the second pie's differences.",
      ],
      usefulLanguage: [
        "accounted for/made up/constituted; the largest share; a quarter/a third/half of",
        "the proportion of … rose/fell; the remainder; a negligible/tiny fraction",
      ],
      mistakes: ["Listing every slice equally instead of prioritising.", "Mixing up 'percentage' and 'number' when only proportions are shown."],
      sample: {
        question:
          "The two pie charts show the proportion of energy produced from five sources in a country in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        band: "Band 9",
        modelAnswer:
          "The two pie charts illustrate how a country's energy was generated across five sources — coal, gas, nuclear, hydro and renewables — in 2000 and 2020.\n\nOverall, the energy mix shifted substantially away from coal towards renewables over the two decades, although gas remained a significant contributor throughout.\n\nIn 2000, coal was the dominant source, accounting for almost half of all energy produced (48%), followed by gas at roughly a quarter (26%). Nuclear and hydro made up 14% and 8% respectively, while renewables were negligible at just 4%.\n\nBy 2020, the picture had changed markedly. Coal's share had more than halved to 20%, and renewables had surged to become the second-largest source at 28%, behind gas, which had grown slightly to 30%. Nuclear and hydro remained broadly stable, together representing under a fifth of the total.",
        whyItScores: [
          "Overview states the structural shift rather than reciting numbers.",
          "Fractions and proportions varied naturally; the two time points are compared, not described separately.",
        ],
      },
    },
    {
      slug: "table",
      name: "Table (multiple categories)",
      what: "Raw figures across rows and columns. Tests your ability to select — tables give more data than you should report.",
      howToAnswer: [
        "Do NOT describe every cell — find the highest, lowest and any striking pattern.",
        "Group rows or columns that behave similarly.",
        "Round and compare rather than reading numbers aloud.",
      ],
      plan: "Scan for the biggest and smallest figures overall and the clearest row/column trend.",
      structure: ["Intro — what the table records.", "Overview — the extremes and main pattern.", "Body 1 — the leading figures.", "Body 2 — the rest / comparisons."],
      usefulLanguage: ["the highest figure was recorded in/for; at the other end of the scale; broadly similar; a comparable figure"],
      mistakes: ["Cell-by-cell description with no selection.", "Forgetting the overview because 'there's too much data'."],
      sample: {
        question:
          "The table below shows the average monthly expenditure (in USD) on four items by households in three cities. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        band: "Band 9",
        modelAnswer:
          "The table compares average monthly household spending, in US dollars, on four categories — housing, food, transport and leisure — across three cities: Tokyo, Mumbai and Lagos.\n\nOverall, housing was the largest expense in every city, while spending was highest in Tokyo across almost all categories and lowest in Lagos.\n\nHouseholds in Tokyo spent by far the most on housing, at around $1,800 per month — roughly three times the figure in Mumbai ($600) and over four times that in Lagos ($420). Food followed a similar pattern, with Tokyo residents spending about $700 against $300 and $250 in the other two cities.\n\nTransport and leisure accounted for smaller and more comparable sums. Notably, leisure was the one category where Mumbai ($150) slightly exceeded Lagos ($90), though both remained far below Tokyo's $400.",
        whyItScores: ["Strong selection — extremes and patterns, not every cell.", "Ratios ('three times', 'four times') show comparison range."],
      },
    },
    {
      slug: "process-diagram",
      name: "Process / diagram (how something works)",
      what: "A sequence of stages (natural cycle or manufacturing) or how a device works. Tests sequencing and the passive voice.",
      howToAnswer: [
        "Count the stages and note where the process begins and ends (or if it's a cycle).",
        "Overview: state the number of stages and whether it's natural/man-made, linear/cyclical.",
        "Describe each stage in order using sequencers and mostly the passive voice.",
      ],
      plan: "Number the stages 1→n and note the input and output of each.",
      structure: ["Intro — what the process produces/shows.", "Overview — number of stages, start and end, linear or cyclical.", "Body 1 — the first half of the stages.", "Body 2 — the remaining stages."],
      usefulLanguage: [
        "first, initially; then, next, subsequently, after that; finally, at the final stage",
        "is/are + past participle (is collected, are transported, is heated); once … has been …; this results in",
      ],
      mistakes: ["Using active voice throughout ('they heat the water') instead of the passive.", "No overview of how many stages / where it starts and ends."],
      sample: {
        question:
          "The diagram below shows how glass bottles are recycled. Summarise the information by selecting and reporting the main features.",
        band: "Band 9",
        modelAnswer:
          "The diagram illustrates the process by which used glass bottles are recycled and returned to shops as new products.\n\nOverall, recycling glass is a linear process comprising seven main stages, beginning with the collection of used bottles and ending with the distribution of newly manufactured glassware to retailers.\n\nAt the first stage, used glass bottles are collected from households and deposited in recycling banks. They are then transported by lorry to a processing plant, where the glass is washed thoroughly to remove any impurities. Once cleaned, the bottles are sorted according to colour.\n\nIn the subsequent stages, the sorted glass is crushed into small fragments known as cullet. This cullet is then melted in a furnace at extremely high temperatures until it becomes molten. Finally, the molten glass is moulded into new bottles, which are packaged and delivered to shops, ready to be used once again.",
        whyItScores: ["Overview gives stage count, start, end and linear nature.", "Passive voice used accurately and consistently; strong sequencers connect the stages."],
      },
    },
    {
      slug: "map",
      name: "Map (changes over time / two locations)",
      what: "Usually two maps of the same place at different times, or two proposed sites. Tests location language and change verbs.",
      howToAnswer: [
        "Orient the reader (a town, north/south, a river, the coast).",
        "Overview the overall character of the change (more developed, more residential, greener).",
        "Describe what was added, removed, replaced, expanded or relocated, area by area.",
      ],
      plan: "Mark on each map what appeared, disappeared and changed; work through it geographically.",
      structure: ["Intro — the place and the two dates.", "Overview — the overall transformation.", "Body 1 — one part of the map (e.g. the north).", "Body 2 — the other part."],
      usefulLanguage: [
        "was demolished/removed; was replaced by; was converted into; was constructed/built; underwent expansion",
        "to the north/south of; on the outskirts; adjacent to; in the vicinity of; where the … had stood",
        "past passive for change over time (a car park was built)",
      ],
      mistakes: ["Describing each map separately instead of the change between them.", "Vague location language ('here', 'there')."],
      sample: {
        question:
          "The two maps below show a coastal village in 1990 and in the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        band: "Band 9",
        modelAnswer:
          "The two maps depict the changes that took place in a small coastal village between 1990 and the present day.\n\nOverall, the village was transformed from a quiet, largely rural settlement into a developed tourist destination, with agricultural land giving way to housing and leisure facilities.\n\nIn 1990, the village consisted of a small cluster of houses in the centre, surrounded by farmland to the west and woodland to the east. A single road ran north to south, connecting the village to the coast, where there was an undeveloped beach.\n\nBy the present day, the area had been substantially built up. The farmland to the west had been cleared to make way for a large housing estate, while a hotel and a car park had been constructed near the beach to accommodate visitors. The original road had been widened, and a new road was added to the east, although the woodland was preserved. The beach itself had been developed with a pier extending into the sea.",
        whyItScores: ["Overview captures the rural-to-tourist transformation.", "Consistent past passive for changes; precise, varied location language."],
      },
    },
    {
      slug: "mixed-charts",
      name: "Multiple / mixed charts",
      what: "Two different visuals together (e.g. a pie plus a table, or a line graph plus a bar chart). Tests selection and linking across sources.",
      howToAnswer: [
        "Introduce both visuals in the intro.",
        "Write ONE overview covering the main feature of each.",
        "Devote one body paragraph to each visual — don't try to merge everything.",
      ],
      plan: "Give each visual its own body paragraph; find one headline feature from each for the overview.",
      structure: ["Intro — both visuals.", "Overview — the key feature of each.", "Body 1 — visual A.", "Body 2 — visual B."],
      usefulLanguage: ["the first chart shows … while the second …; turning to the …; as for the …"],
      mistakes: ["Only describing one of the two visuals.", "A muddled overview that mixes both without clarity."],
      sample: {
        question:
          "The pie chart shows the reasons people gave for choosing a holiday destination, and the table shows the average spend per trip by age group. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        band: "Band 9",
        modelAnswer:
          "The pie chart illustrates the main reasons travellers gave for selecting a holiday destination, while the accompanying table sets out the average amount spent per trip by four age groups.\n\nOverall, cost was the single most influential factor in choosing a destination, and spending per trip rose consistently with age, peaking among the oldest travellers.\n\nAccording to the pie chart, price was decisive for 40% of respondents, well ahead of the weather (25%) and local attractions (20%); recommendations from friends and other reasons made up the remaining 15%.\n\nThe table reveals a clear upward pattern in expenditure by age. Travellers aged 18–29 spent the least, at an average of $600 per trip, rising to $900 for those aged 30–49 and $1,300 for the 50–64 group. Those aged 65 and over spent the most, averaging $1,600 — more than double the youngest group.",
        whyItScores: ["One combined overview, then a clean paragraph per visual.", "Both sources fully but selectively reported; comparison ('more than double') included."],
      },
    },
  ],
  references: REFERENCES,
};

/* ─────────────────────────────── TASK 2 ─────────────────────────────── */

export const WRITING_TASK2: WritingGuide = {
  task: "task-2",
  title: "Writing Task 2",
  tagline: "A clear position, developed logically, with real support.",
  intro:
    "Task 2 is a 250+ word essay in about 40 minutes, worth roughly two-thirds of your Writing band — so protect the time for it. You respond to a prompt by presenting and supporting a clear position across well-organised paragraphs. The examiner is not judging your opinion, but how fully you address the exact task and how well you develop and support your ideas. Identify the question type first: answering the wrong one is the fastest way to cap your band.",
  format: [
    { label: "Time", value: "~40 minutes" },
    { label: "Length", value: "250+ words (aim 270–300)" },
    { label: "Weight", value: "≈ 2/3 of your Writing band" },
    { label: "Structure", value: "Intro · 2 bodies · conclusion" },
  ],
  criteria: [
    { name: "Task Response", detail: "Fully addresses every part of the prompt with a clear, developed and consistent position." },
    { name: "Coherence & Cohesion", detail: "Logical paragraphing with one central idea each, and natural linking (not mechanical)." },
    { name: "Lexical Resource", detail: "Precise, topic-appropriate vocabulary and collocation; not memorised 'big words'." },
    { name: "Grammatical Range & Accuracy", detail: "A mix of complex structures with the majority error-free." },
  ],
  generalStrategy: [
    "Spend 5 minutes decoding the task and planning two body-paragraph ideas — this is where bands are won.",
    "State your position clearly in the introduction and keep it consistent to the conclusion.",
    "Each body paragraph: topic sentence → explanation → specific example → link back to the question.",
    "Develop fewer ideas deeply rather than many ideas thinly.",
    "Leave 3–4 minutes to proofread articles, tense, agreement and punctuation.",
  ],
  types: [
    {
      slug: "opinion",
      name: "Opinion (agree / disagree)",
      what: "'To what extent do you agree or disagree?' You must take and sustain a clear position — full, partial, or a balanced view — for the whole essay.",
      howToAnswer: [
        "Decide your position before writing and commit to it.",
        "Give it in the introduction as a clear thesis.",
        "Support it with two developed reasons, one per body paragraph.",
      ],
      plan: "Position + two reasons + one concrete example for each.",
      structure: [
        "Intro — paraphrase the topic + state your position + preview your reasons.",
        "Body 1 — reason 1 with explanation and example.",
        "Body 2 — reason 2 with explanation and example.",
        "Conclusion — restate your position and summarise the reasons.",
      ],
      usefulLanguage: ["I firmly believe that; in my view; there are compelling reasons to; a key argument in favour is; for this reason"],
      mistakes: ["Sitting on the fence when a clear opinion is required.", "Listing reasons without developing any.", "A conclusion that introduces a new idea."],
      sample: {
        question:
          "Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?",
        band: "Band 9",
        modelAnswer:
          "It is sometimes argued that teenagers should be required to carry out unpaid community work as a formal part of their schooling. I strongly agree with this view, as such schemes cultivate social responsibility and equip students with practical skills that classroom study alone cannot provide.\n\nThe most compelling reason to make community service mandatory is that it fosters a sense of civic duty from an early age. When young people spend time supporting the elderly, cleaning public spaces or assisting charities, they come to understand the challenges faced by others in their community. In my own country, for instance, schools that introduced compulsory volunteering reported that students became noticeably more empathetic and were far more likely to continue volunteering as adults, strengthening society as a whole.\n\nEqually important is the range of transferable skills that community work develops. Tasks such as organising a fundraising event or mentoring younger children teach teamwork, communication and problem-solving — competencies that are increasingly valued by employers yet rarely assessed in academic exams. A student who has coordinated a charity drive gains confidence and initiative that will serve them throughout their working life.\n\nIn conclusion, I firmly believe that unpaid community service should be compulsory in high schools, because it nurtures civic responsibility and builds essential real-world skills that benefit both the individual and the wider community.",
        whyItScores: [
          "Position is clear in the intro, sustained throughout, and restated in the conclusion.",
          "Two fully developed reasons, each with a specific example.",
          "Precise topic vocabulary ('civic duty', 'transferable skills') and varied complex sentences.",
        ],
      },
    },
    {
      slug: "discussion",
      name: "Discussion (discuss both views + your opinion)",
      what: "'Discuss both these views and give your own opinion.' You must fairly present two opposing views AND state which you favour — both are required.",
      howToAnswer: [
        "Give your opinion in the introduction (don't save it for the end).",
        "Devote one body paragraph to each view, presented fairly.",
        "Make clear throughout which side you lean towards.",
      ],
      plan: "View A (one paragraph) + View B (one paragraph, the one you favour) + your opinion woven in.",
      structure: [
        "Intro — introduce both views + state your own opinion.",
        "Body 1 — the first view, explained and supported.",
        "Body 2 — the second view (usually the one you favour), with your reasoning.",
        "Conclusion — restate which view you find more convincing and why.",
      ],
      usefulLanguage: ["on the one hand … on the other hand; proponents of this view argue; others contend that; while there is merit in …, I am more persuaded that"],
      mistakes: ["Forgetting to give your own opinion.", "Presenting only one side.", "Giving both sides equal weight but never revealing your position."],
      sample: {
        question:
          "Some people think that children should start formal education at a very early age, while others believe they should not begin school until they are at least seven. Discuss both views and give your own opinion.",
        band: "Band 9",
        modelAnswer:
          "Opinions differ as to when children should begin formal schooling: some advocate an early start, whereas others argue that childhood should be protected until at least the age of seven. While both positions have merit, I believe a later start is ultimately more beneficial for a child's development.\n\nThose in favour of early education point to the remarkable capacity of young children to absorb information. Introducing literacy and numeracy at four or five, they argue, gives children a head start and helps identify learning difficulties sooner. Countries with early-entry systems often cite strong performance in international assessments as evidence that this approach works.\n\nHowever, I find the case for a later start more convincing. Before the age of seven, children learn most effectively through unstructured play, which develops creativity, social skills and emotional resilience — foundations that formal instruction can inadvertently suppress. In Finland, for example, formal schooling begins at seven, yet the country consistently ranks among the highest performers globally, suggesting that a playful early childhood does not hinder later academic success and may in fact enhance it.\n\nIn conclusion, although early education offers certain cognitive advantages, I believe delaying formal schooling allows children to develop essential life skills through play, providing a stronger long-term foundation for learning.",
        whyItScores: [
          "Both views presented fairly, with the writer's opinion stated up front and sustained.",
          "The favoured view is developed more, with a real, well-known example (Finland).",
          "Sophisticated linking and a genuinely balanced, academic tone.",
        ],
      },
    },
    {
      slug: "advantages-disadvantages",
      name: "Advantages & disadvantages",
      what: "'Do the advantages outweigh the disadvantages?' (opinion needed) or 'discuss the advantages and disadvantages' (balanced). Read carefully which one it is.",
      howToAnswer: [
        "Check whether an opinion is required ('outweigh') or just a balanced discussion.",
        "Give one paragraph to advantages and one to disadvantages.",
        "If asked, state clearly which side outweighs the other.",
      ],
      plan: "Advantages paragraph + disadvantages paragraph + a verdict if 'outweigh'.",
      structure: ["Intro — paraphrase + (if needed) your verdict.", "Body 1 — the main advantage(s).", "Body 2 — the main disadvantage(s).", "Conclusion — the balance / your verdict."],
      usefulLanguage: ["a significant benefit of … is; on the downside; a major drawback; the benefits far outweigh; this is offset by"],
      mistakes: ["Ignoring the 'outweigh' instruction and giving no verdict.", "Listing many points thinly instead of developing a few."],
      sample: {
        question:
          "More and more people are working from home rather than in a traditional office. Do the advantages of this development outweigh the disadvantages?",
        band: "Band 9",
        modelAnswer:
          "The rise of remote working has transformed how millions of people carry out their jobs. Although this shift brings certain drawbacks, I believe its advantages clearly outweigh them.\n\nThe principal benefit of working from home is the flexibility and time it affords. Without a daily commute, employees reclaim hours that can be devoted to family, exercise or rest, which tends to improve both wellbeing and productivity. Businesses benefit too: companies that adopted remote work during recent years frequently reported lower overheads and access to talent regardless of location, since staff no longer need to live near an office.\n\nThat said, remote working is not without disadvantages. The blurring of boundaries between work and home life can lead to longer hours and burnout, and the lack of face-to-face contact may weaken collaboration and leave some workers feeling isolated. These are genuine concerns, particularly for younger employees who learn a great deal from in-person mentoring.\n\nOn balance, however, these disadvantages can largely be mitigated through clear routines and occasional office days, whereas the gains in flexibility, wellbeing and cost are substantial and lasting. I therefore consider the advantages of home working to significantly outweigh its drawbacks.",
        whyItScores: ["The 'outweigh' verdict is stated in the intro and justified in the conclusion.", "Both sides developed, then weighed — not just listed.", "Natural, precise workplace vocabulary."],
      },
    },
    {
      slug: "problem-solution",
      name: "Problem / solution (causes & solutions)",
      what: "'What are the causes and what solutions can you suggest?' Address BOTH parts — causes in one paragraph, solutions in another, clearly linked.",
      howToAnswer: [
        "Identify both parts: what does it ask you to explain, and what to propose?",
        "Body 1 = causes/problems; Body 2 = solutions that directly address those causes.",
        "Keep solutions realistic and tied to the causes you raised.",
      ],
      plan: "Two main causes → two matching solutions.",
      structure: ["Intro — paraphrase + outline that you'll cover causes and solutions.", "Body 1 — the main causes.", "Body 2 — solutions addressing them.", "Conclusion — brief summary."],
      usefulLanguage: ["stems from; is largely attributable to; a primary cause is; one effective solution would be to; this could be tackled by; governments should"],
      mistakes: ["Proposing solutions unrelated to the causes given.", "Answering only one part (causes OR solutions)."],
      sample: {
        question:
          "In many cities, traffic congestion is becoming increasingly serious. What are the causes of this problem, and what measures could be taken to solve it?",
        band: "Band 9",
        modelAnswer:
          "Traffic congestion has become a defining problem of urban life, clogging city centres and lengthening daily commutes. This essay will examine the principal causes of the issue and propose practical measures to address them.\n\nThe congestion afflicting modern cities stems largely from two factors. The first is the sheer growth in private car ownership: as incomes rise, more households buy vehicles, yet road capacity cannot expand at the same pace. The second is inadequate public transport, which pushes commuters towards cars by default. In many rapidly growing cities, bus and rail networks have simply failed to keep up with population growth, leaving driving as the only practical option.\n\nSeveral measures could ease this pressure. The most effective would be substantial investment in reliable, affordable public transport — extending metro lines and increasing bus frequency — so that commuters have a genuine alternative to driving. This could be reinforced by demand-management schemes such as congestion charging, which has markedly reduced traffic in central London by making drivers pay to enter the busiest zones. Encouraging cycling through dedicated lanes would further reduce car dependency.\n\nIn conclusion, urban congestion arises chiefly from rising car ownership and weak public transport, but it can be significantly reduced through investment in transit alternatives and well-designed deterrents to driving.",
        whyItScores: ["Both parts fully answered, with solutions mapped directly onto the causes.", "A concrete real-world example (London congestion charge).", "Cohesive, formal and precise throughout."],
      },
    },
    {
      slug: "two-part",
      name: "Two-part / direct questions",
      what: "Two direct questions in the prompt (e.g. 'Why is this the case? Is it a positive or negative development?'). You must answer BOTH, usually one per body paragraph.",
      howToAnswer: [
        "Underline both questions and make sure each gets a full paragraph.",
        "Answer directly — don't drift into a generic essay.",
        "If one part asks for your view, state it clearly.",
      ],
      plan: "Question 1 → paragraph 1; Question 2 → paragraph 2.",
      structure: ["Intro — paraphrase + signpost both answers.", "Body 1 — answer question 1.", "Body 2 — answer question 2.", "Conclusion — sum up both."],
      usefulLanguage: ["there are several reasons for this; as for whether …; I would argue that this is, on balance, a positive/negative development"],
      mistakes: ["Answering only one of the two questions.", "Being vague instead of directly addressing each question."],
      sample: {
        question:
          "Nowadays many people choose to live alone rather than with others. Why might this be the case? Do you think it is a positive or negative development?",
        band: "Band 9",
        modelAnswer:
          "It is increasingly common, particularly in wealthier societies, for people to live by themselves rather than with family or housemates. This essay will explore why this trend has emerged and argue that, despite some drawbacks, it is largely a positive development.\n\nThere are two main reasons behind the rise of solo living. The first is economic: greater financial independence, especially among young professionals, means more people can afford the cost of a home of their own. The second is social change — later marriage, higher divorce rates and a growing cultural emphasis on personal freedom have all made living alone both more feasible and more socially acceptable than in previous generations.\n\nIn my view, this shift is, on balance, positive. Living alone allows individuals to develop independence, self-reliance and a clear sense of identity, free from the compromises that shared living demands. It can also encourage stronger community ties, as those who live alone often invest more effort in friendships and social activities outside the home. While loneliness is a genuine risk for some, this can be managed through active social lives and, increasingly, technology that keeps people connected.\n\nIn conclusion, the trend towards living alone is driven by rising prosperity and changing social attitudes, and I believe it is a predominantly beneficial development that promotes personal growth.",
        whyItScores: ["Both questions answered in full, one per paragraph, with a clear stance on the second.", "Developed reasoning and a balanced acknowledgement of the downside.", "Fluent, natural academic register."],
      },
    },
  ],
  references: REFERENCES,
};

export const WRITING_GUIDES: Record<"task-1" | "task-2", WritingGuide> = {
  "task-1": WRITING_TASK1,
  "task-2": WRITING_TASK2,
};
