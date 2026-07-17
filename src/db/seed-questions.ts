/**
 * Seed IELTS practice content — one set per (section, question type), covering
 * all 23 task types for Academic & General.
 *
 * Run: npm run db:seed:questions   (idempotent — clears source='seed' first)
 *
 * STRUCTURE — one blueprint per TYPE, not per family. An earlier version
 * switched on `meta.family`, so all seven completion types (sentence, summary,
 * note, table, flow-chart, form, short answer) emitted the same `{blanks: 1}`
 * shape and table completion never had a table. A type's real shape is its
 * defining feature, so each one declares its own layout here.
 *
 * NUMBERING — gaps are written `[[n]]` with the question's *exam* number, and
 * `startNumber` says where a set begins (passage 2 opens at 14, as on the
 * paper). checkGapNumbering() below asserts the two agree, so a mis-numbered
 * gap fails the seed instead of rendering as "unbound gap".
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { questionSets, questions } from "./schema";
import {
  SECTION_ORDER,
  SECTION_TYPES,
  QUESTION_TYPES,
  type SectionKey,
  type QuestionTypeKey,
} from "../lib/ielts";
import { gapsInLayout, type SetLayout } from "../lib/question-content";
import {
  parseSetLayout,
  parseQuestionContent,
  parseCorrectAnswer,
} from "../lib/question-schemas";

const IMAGE_URL =
  "https://ptelistening.s3.eu-north-1.amazonaws.com/Describe%20Image/4164168ebed0700c366e2231051560cd.jpg";
const AUDIO_URL =
  "https://ptelistening.s3.eu-north-1.amazonaws.com/Summarize+Group+Discussion/2fd4d117-824a-4b83-b14a-ae7cab0060f9_combined_unknown.mp3";

/** Paragraph-labelled like a real Academic passage, so matching types work. */
const SAMPLE_PASSAGE = `Urban green spaces have become central to how modern cities plan for wellbeing. Parks, community gardens and tree-lined streets do more than improve the view: researchers link them to lower stress, cleaner air and stronger neighbourhood ties.

A. Researchers in several countries have measured cooling effects of up to four degrees in densely planted districts during summer heatwaves. The effect is strongest where tree canopy is continuous rather than scattered.

B. Yet access is uneven. Wealthier areas often enjoy mature trees and maintained lawns, while newer suburbs wait years for planting to establish. A 2019 survey found residents of the greenest districts lived closer to a park than those in the least green areas.

C. Maintenance is the hidden cost. A park that is planted but not tended quickly loses the qualities that made it valuable, and councils that fund planting without funding upkeep often see usage fall within a decade.

D. Community involvement changes outcomes. Where residents help design and care for a space, vandalism drops and reported satisfaction rises — an effect Dr Alvarez attributes to a sense of ownership rather than to the planting itself.

E. City planners increasingly argue that green infrastructure should be treated like roads or water — essential, funded and maintained, not optional. The debate is no longer whether green space matters, but who pays to keep it.`;

const LISTENING_TRANSCRIPT =
  "A short discussion about urban green spaces, park maintenance budgets and how councils schedule planting.";

/* ------------------------------------------------------------------ *
 * Blueprints
 * ------------------------------------------------------------------ */

type QuestionSeed = {
  prompt?: string;
  content?: unknown;
  correctAnswer?: unknown;
  explanation?: string;
  wordLimitMin?: number;
  prepSeconds?: number;
  speakSeconds?: number;
};

/** Speaking Part 1 prompts — short personal answers, ~45s each. */
const q45 = (prompts: string[]): QuestionSeed[] =>
  prompts.map((prompt) => ({ prompt, speakSeconds: 45 }));

/** Speaking Part 3 prompts — longer, more abstract answers, ~60s each. */
const q60 = (prompts: string[]): QuestionSeed[] =>
  prompts.map((prompt) => ({ prompt, speakSeconds: 60 }));

type Blueprint = {
  /** Set title. Defaults to the type's label; Speaking uses the topic name. */
  title?: string;
  /** Exam number of the set's first question. */
  startNumber: number;
  /** The shared structure the gaps live in. Omit for self-contained questions. */
  layout?: SetLayout;
  questions: QuestionSeed[];
};

/**
 * A type may declare one set or several. Speaking Part 1 is organised by topic
 * — colours, flowers, holidays… — so it needs a set per topic; most types just
 * need one. Practice paginates across whatever a type declares.
 */
const BLUEPRINTS: Record<QuestionTypeKey, Blueprint | Blueprint[]> = {
  /* ---- Selection ---- */
  multiple_choice_single: {
    startNumber: 1,
    questions: [
      {
        prompt: "What is the main idea of the passage?",
        content: {
          options: [
            "Green space is purely decorative",
            "Green space supports wellbeing and needs sustained funding",
            "Trees make cities hotter in summer",
            "Parks should be privatised",
          ],
        },
        correctAnswer: { index: 1 },
        explanation:
          "Paragraph E frames green space as essential infrastructure that must be funded and maintained.",
      },
      {
        prompt: "According to the passage, cooling effects were measured at up to:",
        content: { options: ["two degrees", "four degrees", "ten degrees", "no measurable change"] },
        correctAnswer: { index: 1 },
        explanation: "Paragraph A gives up to four degrees in densely planted districts.",
      },
      {
        prompt: "Dr Alvarez attributes higher satisfaction mainly to:",
        content: {
          options: [
            "the number of trees planted",
            "a sense of ownership among residents",
            "increased council funding",
            "reduced traffic noise",
          ],
        },
        correctAnswer: { index: 1 },
        explanation: "Paragraph D credits a sense of ownership rather than the planting itself.",
      },
    ],
  },

  multiple_choice_multiple: {
    startNumber: 4,
    questions: [
      {
        prompt: "Which TWO benefits of green space are mentioned in the passage?",
        content: {
          options: ["Lower stress", "Higher rents", "Cleaner air", "Faster traffic", "More parking"],
          selectCount: 2,
        },
        correctAnswer: { indices: [0, 2] },
        explanation: "The opening paragraph lists lower stress, cleaner air and stronger ties.",
      },
    ],
  },

  /* ---- Matching: one shared option box, a dropdown per question ---- */
  matching_information: {
    startNumber: 1,
    layout: {
      kind: "options",
      title: "List of paragraphs",
      options: [
        { key: "A", text: "Paragraph A" },
        { key: "B", text: "Paragraph B" },
        { key: "C", text: "Paragraph C" },
        { key: "D", text: "Paragraph D" },
        { key: "E", text: "Paragraph E" },
      ],
    },
    questions: [
      {
        prompt: "a measurement of temperature reduction",
        correctAnswer: { key: "A" },
        explanation: "Paragraph A reports cooling of up to four degrees.",
      },
      {
        prompt: "a comparison of how far residents live from a park",
        correctAnswer: { key: "B" },
        explanation: "Paragraph B cites the 2019 survey on distance to a park.",
      },
      {
        prompt: "a consequence of funding planting but not upkeep",
        correctAnswer: { key: "C" },
        explanation: "Paragraph C describes usage falling within a decade.",
      },
      {
        prompt: "an explanation of reduced vandalism",
        correctAnswer: { key: "D" },
        explanation: "Paragraph D links resident involvement to lower vandalism.",
      },
    ],
  },

  matching_headings: {
    startNumber: 1,
    layout: {
      kind: "options",
      title: "List of headings",
      options: [
        { key: "i", text: "The cost of keeping a park alive" },
        { key: "ii", text: "Measuring the cooling effect" },
        { key: "iii", text: "Who lives near green space" },
        { key: "iv", text: "Ownership changes behaviour" },
        { key: "v", text: "Green space as essential infrastructure" },
        { key: "vi", text: "The history of public parks" },
        { key: "vii", text: "Privatising urban land" },
      ],
    },
    questions: [
      { prompt: "Paragraph A", correctAnswer: { key: "ii" } },
      { prompt: "Paragraph B", correctAnswer: { key: "iii" } },
      { prompt: "Paragraph C", correctAnswer: { key: "i" } },
      { prompt: "Paragraph D", correctAnswer: { key: "iv" } },
      { prompt: "Paragraph E", correctAnswer: { key: "v" } },
    ],
  },

  matching_features: {
    startNumber: 6,
    layout: {
      kind: "options",
      title: "List of findings",
      options: [
        { key: "A", text: "A 2019 survey" },
        { key: "B", text: "Dr Alvarez" },
        { key: "C", text: "City planners" },
      ],
    },
    questions: [
      { prompt: "linked resident involvement to a sense of ownership", correctAnswer: { key: "B" } },
      { prompt: "compared distance to a park across districts", correctAnswer: { key: "A" } },
      { prompt: "argue green space should be funded like roads", correctAnswer: { key: "C" } },
    ],
  },

  matching_sentence_endings: {
    startNumber: 9,
    layout: {
      kind: "options",
      title: "List of endings",
      options: [
        { key: "A", text: "when tree canopy is continuous rather than scattered." },
        { key: "B", text: "because councils rarely fund upkeep." },
        { key: "C", text: "unless residents help care for the space." },
        { key: "D", text: "as green space is now treated like roads or water." },
        { key: "E", text: "within a decade of planting." },
      ],
    },
    questions: [
      { prompt: "The cooling effect is strongest", correctAnswer: { key: "A" } },
      { prompt: "Usage of an untended park can fall", correctAnswer: { key: "E" } },
    ],
  },

  /* ---- Completion: gaps live in the shared layout ---- */
  sentence_completion: {
    startNumber: 11,
    layout: {
      kind: "inline_blanks",
      heading: "Complete the sentences below",
      blocks: [
        "Researchers measured cooling of up to [[11]] degrees during summer heatwaves.",
        "The cooling effect is strongest where the tree [[12]] is continuous.",
        "Planners argue green infrastructure should be funded like roads or [[13]].",
      ],
    },
    questions: [
      { correctAnswer: { any: ["four", "4"] }, explanation: "Paragraph A: 'up to four degrees'." },
      { correctAnswer: { any: ["canopy"] }, explanation: "Paragraph A: 'where tree canopy is continuous'." },
      { correctAnswer: { any: ["water"] }, explanation: "Paragraph E: 'like roads or water'." },
    ],
  },

  summary_completion: {
    startNumber: 14,
    layout: {
      kind: "inline_blanks",
      heading: "Complete the summary below",
      blocks: [
        "Cities increasingly treat green space as essential rather than decorative. Densely planted districts can be up to [[14]] degrees cooler during a heatwave, though the benefit depends on continuous canopy. Access is [[15]], with wealthier areas enjoying mature planting while newer suburbs wait. The hidden cost is [[16]]: a park that is planted but not tended loses its value, and usage can fall within a [[17]]. Where residents share in the care of a space, [[18]] falls and satisfaction rises.",
      ],
    },
    questions: [
      { correctAnswer: { any: ["four", "4"] } },
      { correctAnswer: { any: ["uneven"] } },
      { correctAnswer: { any: ["maintenance", "upkeep"] } },
      { correctAnswer: { any: ["decade"] } },
      { correctAnswer: { any: ["vandalism"] } },
    ],
  },

  note_completion: {
    startNumber: 19,
    layout: {
      kind: "notes",
      heading: "Complete the notes below",
      groups: [
        {
          title: "Benefits of urban green space",
          items: [
            "Cooling of up to [[19]] degrees in planted districts",
            "Cleaner air and lower [[20]]",
          ],
        },
        {
          title: "Problems",
          items: [
            "Access is [[21]] across districts",
            "Councils fund planting but not [[22]]",
          ],
        },
      ],
    },
    questions: [
      { correctAnswer: { any: ["four", "4"] } },
      { correctAnswer: { any: ["stress"] } },
      { correctAnswer: { any: ["uneven"] } },
      { correctAnswer: { any: ["maintenance", "upkeep"] } },
    ],
  },

  table_completion: {
    startNumber: 23,
    layout: {
      kind: "table",
      heading: "Complete the table below",
      columns: ["District", "Tree canopy", "Cooling effect", "Main issue"],
      rows: [
        [
          { text: "Central", header: true },
          { text: "Continuous" },
          { text: "Up to [[23]] degrees" },
          { text: "Cost of [[24]]" },
        ],
        [
          { text: "Older suburbs", header: true },
          { text: "Mature" },
          { text: "Moderate" },
          { text: "None reported" },
        ],
        [
          { text: "New suburbs", header: true },
          { text: "[[25]]" },
          { text: "Minimal" },
          { text: "Planting takes [[26]] to establish" },
        ],
      ],
    },
    questions: [
      { correctAnswer: { any: ["four", "4"] } },
      { correctAnswer: { any: ["maintenance", "upkeep"] } },
      { correctAnswer: { any: ["scattered", "sparse"] } },
      { correctAnswer: { any: ["years"] } },
    ],
  },

  flowchart_completion: {
    startNumber: 27,
    layout: {
      kind: "flowchart",
      heading: "Complete the flow-chart below",
      steps: [
        "Council approves a planting [[27]]",
        "Trees are planted across the district",
        "Canopy takes several [[28]] to establish",
        "Ongoing [[29]] keeps the space usable",
      ],
    },
    questions: [
      { correctAnswer: { any: ["budget", "programme", "program"] } },
      { correctAnswer: { any: ["years"] } },
      { correctAnswer: { any: ["maintenance", "upkeep"] } },
    ],
  },

  form_completion: {
    startNumber: 30,
    layout: {
      kind: "form",
      heading: "Community garden — membership form",
      rows: [
        { label: "Name", value: "Maria [[30]]" },
        { label: "Plot number", value: "[[31]]" },
        { label: "Preferred day", value: "[[32]]" },
        { label: "Monthly fee", value: "£[[33]]" },
      ],
    },
    questions: [
      { correctAnswer: { any: ["alvarez"] } },
      { correctAnswer: { any: ["14", "fourteen"] } },
      { correctAnswer: { any: ["saturday"] } },
      { correctAnswer: { any: ["12", "twelve"] } },
    ],
  },

  diagram_label_completion: {
    startNumber: 34,
    layout: {
      kind: "diagram",
      heading: "Label the diagram below",
      pins: [
        { gap: 34, x: 22, y: 30 },
        { gap: 35, x: 52, y: 55 },
        { gap: 36, x: 78, y: 38 },
      ],
    },
    questions: [
      { correctAnswer: { any: ["river"] } },
      { correctAnswer: { any: ["park", "lawn"] } },
      { correctAnswer: { any: ["path", "walkway"] } },
    ],
  },

  plan_map_diagram_labelling: {
    startNumber: 37,
    layout: {
      kind: "diagram",
      heading: "Label the map below",
      // Answered by letter — the classic Listening map task.
      choices: [
        { key: "A", text: "Car park" },
        { key: "B", text: "Playground" },
        { key: "C", text: "Café" },
        { key: "D", text: "Lake" },
      ],
      pins: [
        { gap: 37, x: 30, y: 40 },
        { gap: 38, x: 60, y: 62 },
      ],
    },
    questions: [{ correctAnswer: { any: ["D"] } }, { correctAnswer: { any: ["B"] } }],
  },

  short_answer: {
    startNumber: 39,
    questions: [
      {
        prompt: "What should be continuous for the strongest cooling effect?",
        correctAnswer: { any: ["tree canopy", "canopy", "the canopy"] },
      },
      {
        prompt: "In which year was the survey on park distance carried out?",
        correctAnswer: { any: ["2019"] },
      },
    ],
  },

  /* ---- Judgement ---- */
  true_false_notgiven: {
    startNumber: 1,
    questions: [
      {
        prompt: "Access to mature green space is evenly distributed across all areas.",
        correctAnswer: { value: "False" },
        explanation: "Paragraph B states access is uneven.",
      },
      {
        prompt: "Green infrastructure can reduce summer temperatures.",
        correctAnswer: { value: "True" },
        explanation: "Paragraph A reports cooling of up to four degrees.",
      },
      {
        prompt: "The author has personally planted trees in a suburb.",
        correctAnswer: { value: "Not Given" },
        explanation: "The passage never mentions the author's own actions.",
      },
    ],
  },

  yes_no_notgiven: {
    startNumber: 4,
    questions: [
      {
        prompt: "The writer believes green space should be funded like roads.",
        correctAnswer: { value: "Yes" },
        explanation: "Paragraph E endorses treating it as essential infrastructure.",
      },
      {
        prompt: "The writer thinks parks are an optional luxury.",
        correctAnswer: { value: "No" },
        explanation: "The passage argues the opposite.",
      },
      {
        prompt: "The writer considers community gardens better value than parks.",
        correctAnswer: { value: "Not Given" },
        explanation: "No such comparison is made.",
      },
    ],
  },

  /* ---- Writing ---- */
  writing_task1_academic: {
    startNumber: 1,
    questions: [
      {
        prompt:
          "The image below shows information about a location. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        wordLimitMin: 150,
      },
    ],
  },
  writing_task1_general: {
    startNumber: 1,
    questions: [
      {
        prompt:
          "You recently visited a public park that needs improvement. Write a letter to the local council. In your letter: explain which park you visited, describe the problems you saw, and suggest improvements.",
        wordLimitMin: 150,
      },
    ],
  },
  writing_task2: {
    startNumber: 1,
    questions: [
      {
        prompt:
          "Some people believe cities should prioritise green spaces over new housing. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples from your own knowledge or experience.",
        wordLimitMin: 250,
      },
    ],
  },

  /* ---- Speaking ----
   * Part 1 is a topic-by-topic interview: the examiner picks a familiar topic
   * and works through it before moving on. One set per topic, asked one at a
   * time (see `presentation: "sequential"`).
   */
  speaking_part1: [
    {
      title: "Where you live",
      startNumber: 1,
      questions: q45([
        "Where do you live at the moment?",
        "Do you live in a house or an apartment?",
        "What do you like most about the place you live in?",
        "Is there anything you would like to change about your home?",
        "Would you like to move somewhere else in the future?",
        "What kind of area would you most like to live in?",
        "Do you think your neighbourhood is a good place for children?",
      ]),
    },
    {
      title: "Colours",
      startNumber: 1,
      questions: q45([
        "What is your favourite colour?",
        "Have you liked the same colour since you were a child?",
        "Are there any colours you dislike? Why?",
        "Do you think colours affect people's moods?",
        "What colours are most common in your home?",
        "Would you ever wear brightly coloured clothes to work?",
      ]),
    },
    {
      title: "Flowers",
      startNumber: 1,
      questions: q45([
        "Do you like flowers?",
        "What is your favourite flower, and why?",
        "Are flowers important in your culture?",
        "Do people in your country give flowers as gifts?",
        "Have you ever grown flowers yourself?",
        "Would you like to have a garden in the future?",
      ]),
    },
    {
      title: "Holidays",
      startNumber: 1,
      questions: q45([
        "Do you enjoy going on holiday?",
        "Where did you go on your last holiday?",
        "Do you prefer short breaks or long holidays?",
        "Who do you usually go on holiday with?",
        "What do you like to do when you are on holiday?",
        "Is there anywhere you would really like to visit?",
        "Do people in your country travel abroad often?",
      ]),
    },
    {
      title: "Work or study",
      startNumber: 1,
      questions: q45([
        "Do you work or are you a student?",
        "Why did you choose that job or subject?",
        "What is the most interesting part of it?",
        "Is there anything you find difficult about it?",
        "Do you prefer working in the morning or the evening?",
        "What would you like to be doing in five years?",
      ]),
    },
    {
      title: "Food and cooking",
      startNumber: 1,
      questions: q45([
        "What kind of food do you like most?",
        "Do you enjoy cooking?",
        "Who does most of the cooking in your home?",
        "Do you prefer eating at home or in restaurants?",
        "Has your diet changed in the last few years?",
        "Are traditional dishes still popular among young people?",
      ]),
    },
  ],

  speaking_part2: [
    {
      title: "A park or green space",
      startNumber: 1,
      questions: [
        {
          prompt: "Describe a park or green space you like to visit.",
          content: {
            cueCard: {
              topic: "Describe a park or green space you like to visit.",
              bullets: [
                "where it is",
                "how often you go there",
                "what you do there",
                "and explain why you like it",
              ],
            },
          },
          prepSeconds: 60,
          speakSeconds: 120,
        },
      ],
    },
    {
      title: "A holiday you remember",
      startNumber: 1,
      questions: [
        {
          prompt: "Describe a holiday that you remember well.",
          content: {
            cueCard: {
              topic: "Describe a holiday that you remember well.",
              bullets: [
                "where you went",
                "who you went with",
                "what you did there",
                "and explain why you remember it well",
              ],
            },
          },
          prepSeconds: 60,
          speakSeconds: 120,
        },
      ],
    },
  ],

  // Part 3 widens the Part 2 topic into abstract discussion — also one at a time.
  speaking_part3: [
    {
      title: "Public spaces and community",
      startNumber: 1,
      questions: q60([
        "Why do you think green spaces are important for people living in big cities?",
        "Who should pay to maintain public parks — councils or residents?",
        "Do you think cities are becoming better or worse places to live?",
        "How might public spaces change in the next fifty years?",
        "Should governments limit new building to protect open land?",
      ]),
    },
    {
      title: "Travel and tourism",
      startNumber: 1,
      questions: q60([
        "Why do people enjoy travelling to other countries?",
        "Does tourism benefit local communities, or harm them?",
        "How has cheap air travel changed the way people take holidays?",
        "Should tourists be expected to learn about local customs?",
        "Do you think virtual travel could ever replace real travel?",
      ]),
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Consistency check
 * ------------------------------------------------------------------ */

/**
 * A gap-backed set is only coherent if its `[[n]]` markers are exactly the exam
 * numbers its questions occupy. Catching that here means the player never has
 * to render an orphaned gap or a question no gap points at.
 */
/** A type declares one set or many; normalise to a list. */
function setsOf(v: Blueprint | Blueprint[]): Blueprint[] {
  return Array.isArray(v) ? v : [v];
}

function checkGapNumbering(typeKey: QuestionTypeKey, bp: Blueprint) {
  if (!bp.layout || bp.layout.kind === "options") return;

  const expected = bp.questions.map((_, i) => bp.startNumber + i);
  const found = gapsInLayout(bp.layout);

  const missing = expected.filter((n) => !found.includes(n));
  const extra = found.filter((n) => !expected.includes(n));
  const dupes = found.filter((n, i) => found.indexOf(n) !== i);

  if (missing.length || extra.length || dupes.length) {
    throw new Error(
      `[${typeKey}] gap/question mismatch — expected ${JSON.stringify(expected)}, found ${JSON.stringify(found)}` +
        (missing.length ? `; no gap for ${JSON.stringify(missing)}` : "") +
        (extra.length ? `; no question for ${JSON.stringify(extra)}` : "") +
        (dupes.length ? `; duplicated ${JSON.stringify(dupes)}` : ""),
    );
  }
}

/* ------------------------------------------------------------------ *
 * Seed
 * ------------------------------------------------------------------ */

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env.local)");

  // Validate everything before touching the database — a bad blueprint should
  // never half-seed.
  for (const [typeKey, value] of Object.entries(BLUEPRINTS) as [
    QuestionTypeKey,
    Blueprint | Blueprint[],
  ][]) {
    for (const bp of setsOf(value)) {
      const label = bp.title ? `${typeKey}/${bp.title}` : typeKey;
      checkGapNumbering(typeKey, bp);
      parseSetLayout(bp.layout ?? null, label);
      bp.questions.forEach((q, i) => {
        parseQuestionContent(q.content ?? null, `${label}#${i + 1}`);
        parseCorrectAnswer(q.correctAnswer ?? null, `${label}#${i + 1}`);
      });
    }
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema: { questionSets, questions }, casing: "snake_case" });

  // Idempotent: clear previously-seeded content (cascade drops questions).
  await db.delete(questionSets).where(sql`source = 'seed'`);

  let setCount = 0;
  let qCount = 0;

  for (const section of SECTION_ORDER) {
    for (const typeKey of SECTION_TYPES[section as SectionKey]) {
      const meta = QUESTION_TYPES[typeKey];
      const isListening = section === "listening";
      const isReading = section === "reading";
      const needsImage = !!meta.layoutKind?.includes("diagram") || typeKey === "writing_task1_academic";

      for (const bp of setsOf(BLUEPRINTS[typeKey])) {
        const [set] = await db
          .insert(questionSets)
          .values({
            module: meta.modules,
            section,
            questionType: typeKey,
            // Speaking sets are topics ("Colours"); everything else is the label.
            title: bp.title ?? meta.label,
            instructions: meta.instruction,
            difficulty: "medium",
            passageText: isReading ? SAMPLE_PASSAGE : null,
            audioUrl: isListening ? AUDIO_URL : null,
            transcript: isListening ? LISTENING_TRANSCRIPT : null,
            imageUrl: needsImage ? IMAGE_URL : null,
            layout: bp.layout ?? null,
            startNumber: bp.startNumber,
            partNumber: 1,
            estimatedMinutes:
              section === "writing" ? (typeKey === "writing_task2" ? 40 : 20) : 5,
            tags: bp.title ? ["seed", section, bp.title] : ["seed", section],
            source: "seed",
            isActive: true,
          })
          .returning({ id: questionSets.id });
        setCount++;

        for (let j = 0; j < bp.questions.length; j++) {
          const it = bp.questions[j];
          await db.insert(questions).values({
            setId: set.id,
            section,
            questionType: typeKey,
            orderIndex: j,
            prompt: it.prompt ?? null,
            content: (it.content as object) ?? null,
            correctAnswer: (it.correctAnswer as object) ?? null,
            explanation: it.explanation ?? null,
            marks: 1,
            wordLimitMin: it.wordLimitMin ?? null,
            prepSeconds: it.prepSeconds ?? null,
            speakSeconds: it.speakSeconds ?? null,
          });
          qCount++;
        }
      }
    }
  }

  console.log(`✓ Seeded ${setCount} question sets and ${qCount} questions across all types.`);
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
