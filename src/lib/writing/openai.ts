import "server-only";
import { env, isWritingAiConfigured } from "@/lib/env";
import task1Descriptors from "@/app/utils/writing_band_descriptor_task_1.json";
import task2Descriptors from "@/app/utils/writing_band_descriptor_task_2.json";

/**
 * Writing band scoring with OpenAI.
 *
 * Grades IELTS Writing Task 1/2 on the four OFFICIAL band criteria and returns
 * a rich, examiner-style analysis: per-criterion band + strengths + fixes,
 * annotated corrections (quote → issue → fix), upgraded sentence rewrites, an
 * on-task check, and prioritised next steps. Returns a structured result rather
 * than throwing, so a scoring outage degrades to "unscored" — never a failed
 * submission. The band is computed server-side and never trusted from a client.
 *
 * The public IELTS band descriptors for the task being marked are sent verbatim
 * in the system prompt (see `src/app/utils/writing_band_descriptor_task_*.json`)
 * so the model marks against the real wording instead of a paraphrase. That
 * block is large but static per task type, which is the shape OpenAI's automatic
 * prompt caching rewards.
 */

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
/** Grading a long essay against the full descriptors is slow; don't hang forever. */
const REQUEST_TIMEOUT_MS = 120_000;
/** Official rule: a response of 20 words or fewer is Band 1 on every criterion. */
const MIN_RATEABLE_WORDS = 20;

export type WritingTaskType = "writing_task1_academic" | "writing_task1_general" | "writing_task2";

export type WritingCriterion = {
  /** 0–9, half-band. */
  band: number;
  /** One-line verdict on this criterion in this response. */
  summary: string;
  strengths: string[];
  improvements: string[];
};

/**
 * Why a response is not markable on the normal scale. Anything other than
 * `on_task` is a hard Band 1 in every criterion, applied server-side rather
 * than left to the model's arithmetic.
 */
export type TaskCompliance =
  | "on_task"
  | "off_topic"
  | "other_language"
  | "under_20_words"
  | "memorised";

export type WritingScore = {
  /** Overall band = mean of the four criteria, rounded to the nearest half. */
  overall: number;
  wordCount: number;
  /** Did the response actually address the task set? */
  onTask: boolean;
  /** The specific reason a response was capped, for feedback and for support. */
  taskCompliance: TaskCompliance;
  criteria: {
    taskResponse: WritingCriterion; // "Task Achievement" for Task 1
    coherenceCohesion: WritingCriterion;
    lexicalResource: WritingCriterion;
    grammaticalRange: WritingCriterion;
  };
  overallFeedback: string;
  /** Specific corrections lifted from the candidate's own text. Empty when the response is clean. */
  corrections: { quote: string; issue: string; fix: string }[];
  /** Band-raising rewrites of the candidate's sentences. Empty when none is needed. */
  improvedExamples: { original: string; improved: string }[];
  /** Prioritised, actionable steps to gain the next half-band. */
  nextSteps: string[];
  raw: unknown;
};

export type WritingScoreResult =
  | { ok: true; score: WritingScore }
  | { ok: false; reason: "not_configured" | "request_failed" | "bad_response"; detail?: string };

/** IELTS rounding: nearest half-band, clamped to 0–9. */
function toHalfBand(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ------------------------------------------------------------------ *
 * Official band descriptors → prompt text
 * ------------------------------------------------------------------ */

/** JSON shape: band ("9".."0") → criterion key → descriptor lines. Band 0 uses "criteria". */
type DescriptorTable = Record<string, Record<string, string[]>>;

const CRITERION_LABELS: Record<string, string> = {
  task_achievement: "Task Achievement",
  task_response: "Task Response",
  coherence_and_cohesion: "Coherence and Cohesion",
  lexical_resource: "Lexical Resource",
  grammatical_range_and_accuracy: "Grammatical Range and Accuracy",
  criteria: "When this band is used",
};

function renderDescriptors(table: DescriptorTable): string {
  return Object.keys(table)
    .map(Number)
    .sort((a, b) => b - a)
    .map((band) => {
      const body = Object.entries(table[String(band)])
        .map(([key, lines]) =>
          [`  ${CRITERION_LABELS[key] ?? key}:`, ...lines.map((l) => `    - ${l}`)].join("\n"),
        )
        .join("\n");
      return `BAND ${band}\n${body}`;
    })
    .join("\n\n");
}

// Built once at module load: the tables never change between requests.
const TASK1_DESCRIPTORS = renderDescriptors(task1Descriptors as unknown as DescriptorTable);
const TASK2_DESCRIPTORS = renderDescriptors(task2Descriptors as unknown as DescriptorTable);

/* ------------------------------------------------------------------ *
 * Structured output schema (OpenAI strict json_schema)
 * ------------------------------------------------------------------ */

const criterionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    band: { type: "number", description: "Whole or half band from 0 to 9." },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
  },
  required: ["band", "summary", "strengths", "improvements"],
} as const;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    taskCompliance: {
      type: "string",
      // No "under_20_words": length is settled from our own count, not the
      // model's, which drifts over the boundary and caps 21-word responses.
      enum: ["on_task", "off_topic", "other_language", "memorised"],
    },
    overallFeedback: { type: "string" },
    taskResponse: criterionSchema,
    coherenceCohesion: criterionSchema,
    lexicalResource: criterionSchema,
    grammaticalRange: criterionSchema,
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          quote: { type: "string" },
          issue: { type: "string" },
          fix: { type: "string" },
        },
        required: ["quote", "issue", "fix"],
      },
    },
    improvedExamples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original: { type: "string" },
          improved: { type: "string" },
        },
        required: ["original", "improved"],
      },
    },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: [
    "taskCompliance", "overallFeedback", "taskResponse", "coherenceCohesion",
    "lexicalResource", "grammaticalRange", "corrections", "improvedExamples", "nextSteps",
  ],
} as const;

/* ------------------------------------------------------------------ *
 * Prompts
 * ------------------------------------------------------------------ */

function taskLabel(taskType: WritingTaskType): string {
  switch (taskType) {
    case "writing_task1_academic":
      return "IELTS Academic Writing Task 1: describe a chart, graph, table, diagram, process or map in 150+ words. The first criterion is TASK ACHIEVEMENT, which covers a clear overview and accurate reporting of key features, with no opinions.";
    case "writing_task1_general":
      return "IELTS General Training Writing Task 1: a letter of 150+ words. The first criterion is TASK ACHIEVEMENT, which covers all bullet points with a consistent, appropriate tone.";
    case "writing_task2":
      return "IELTS Writing Task 2: an essay of 250+ words. The first criterion is TASK RESPONSE, which means addressing all parts of the prompt with a clear, developed position.";
  }
}

function descriptorsFor(taskType: WritingTaskType): string {
  return taskType === "writing_task2" ? TASK2_DESCRIPTORS : TASK1_DESCRIPTORS;
}

/**
 * Task 1 descriptors carry both variants on the same line, tagged "(Academic)"
 * and "(General Training)". Tell the model which half applies so it doesn't
 * mark a letter for chart overviews.
 */
function variantNote(taskType: WritingTaskType): string {
  switch (taskType) {
    case "writing_task1_academic":
      return 'Some descriptor lines below are tagged "(Academic)" and others "(General Training)". This is an ACADEMIC response: apply the (Academic) lines and ignore the (General Training) lines.';
    case "writing_task1_general":
      return 'Some descriptor lines below are tagged "(Academic)" and others "(General Training)". This is a GENERAL TRAINING response: apply the (General Training) lines and ignore the (Academic) lines.';
    case "writing_task2":
      return "";
  }
}

function buildSystemPrompt(taskType: WritingTaskType): string {
  return [
    "You are a certified, experienced IELTS examiner. You mark Writing against the official IELTS public band descriptors, reproduced below in full, and you award the band a real examiner would award.",
    "",
    `TASK YOU ARE MARKING: ${taskLabel(taskType)}`,
    variantNote(taskType),
    "",
    "=== OFFICIAL IELTS PUBLIC BAND DESCRIPTORS (verbatim, Band 9 down to Band 0) ===",
    descriptorsFor(taskType),
    "=== END OF DESCRIPTORS ===",
    "",
    "HOW TO AWARD THE BANDS",
    "- Mark the four criteria independently. For each one, read the descriptors from Band 9 downwards and award the highest band whose wording the response genuinely matches.",
    "- The whole scale is live. Bands 8, 8.5 and 9 are real, achievable marks and you must award them when the descriptors for them are met. There is no ceiling, no quota, and no house policy of keeping candidates between 5 and 7. If a response satisfies all four criteria, it is a Band 8 to 9 response, and you should say so plainly.",
    "- Award a half band when a response is clearly beyond one whole band but does not fully reach the next.",
    "- Mark liberally within the descriptors, the way an experienced examiner does. Judge the response as a whole against the wording of the band, do not count faults and subtract. The descriptors themselves allow error high on the scale: Band 8 permits occasional errors with minimal impact on communication, and Band 9 permits minor errors that are extremely rare. An error that does not impede communication does not pull a band down.",
    "- Never lower a band because of a style you would have written differently, American versus British usage, an opinion you disagree with, or plain words used accurately.",
    "- Report the bands you actually judged. If two criteria are 8 and two are 7, say that. Do not flatten everything to one cautious number and do not round down out of caution.",
    "",
    "THE ONLY HARD CAPS (Band 1)",
    '- Set taskCompliance to "other_language" and give band 1 in all four criteria when the response is written wholly or mainly in a language other than English.',
    '- Set taskCompliance to "off_topic" and give band 1 in all four criteria when the content is wholly unrelated to the task that was set.',
    '- Set taskCompliance to "memorised" and give band 1 in all four criteria when the response is plainly a memorised text that does not answer this prompt.',
    '- In every other case set taskCompliance to "on_task" and mark normally. Do not use bands 1 or 2 outside those three cases: a response that is on topic and communicates something in English is at least Band 3 or 4.',
    "- Wording copied from the question rubric is discounted. It counts towards neither length nor content.",
    "",
    "LENGTH",
    "- Length never caps a response. Any response that reaches you is long enough to mark, so never justify a band with the words \"too short to assess\" and never award 1 across the board for shortness.",
    "- When a response is on topic but below the task minimum, the shortfall is paid for on Task Achievement or Task Response, in proportion to how much of the task went uncovered. A response that covers very little of the task belongs at 3 or 4 on that criterion.",
    "- The other three criteria rate the language the candidate actually produced. Do not mark accurate language as faulty because there is little of it, and do not drag those criteria down merely to match a low Task score.",
    "- Equally, a very short response is thin evidence. The upper bands for Coherence, Lexical Resource and Grammar all require range to be demonstrated, and range that was never shown cannot be credited, so a very short answer normally sits in the middle of the scale on those three, not at the top.",
    "- A long response earns no credit for length alone, and no penalty for it either.",
    "",
    "WHAT YOUR FEEDBACK IS FOR",
    "- You are analysing the response, not auditing it for faults. Explain what the candidate did well and why it works, in the same detail you give anything you criticise. Comment on the ideas and the content, not only the language.",
    "- A response can be genuinely excellent, and some are. If you find no real errors, return an empty corrections array and an empty improvedExamples array, and say the writing is already at this level. Never invent an error, a weakness, or a lukewarm criticism to look thorough or to justify a lower band.",
    "- Put something in corrections only when it is a real error: grammar, vocabulary choice, spelling, punctuation, or register. Quote the candidate's own words exactly as written. Never quote or correct text they did not write.",
    "- Use improvedExamples only for sentences that would genuinely gain a band from a rewrite. Leave good sentences alone.",
    '- "improvements" and "nextSteps" must be specific to this response and actionable. If the candidate is already at the top of the scale, nextSteps says how to hold that standard under exam timing, not filler criticism.',
    "- Bands must be whole or half numbers between 0 and 9.",
    "",
    "WRITING STYLE",
    '- Your feedback is shown to the learner exactly as you write it. Address them as "you".',
    '- Write plainly, the way a teacher speaks. Never use em-dashes or en-dashes; use commas, colons, or separate sentences. Avoid "not just X but Y" constructions and three-item flourishes. Prefer short, direct sentences.',
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function buildUserPrompt(p: {
  module: string;
  questionPrompt: string;
  wordMin: number;
  text: string;
  wordCount: number;
}): string {
  return [
    `MODULE: ${p.module}`,
    `TASK MINIMUM WORD COUNT: ${p.wordMin}`,
    "",
    `QUESTION / PROMPT GIVEN TO THE CANDIDATE:\n"""${p.questionPrompt}"""`,
    "",
    `CANDIDATE'S RESPONSE (${p.wordCount} words):\n"""${p.text}"""`,
  ].join("\n");
}

/**
 * Reasoning models reject a `temperature` other than the default, so only the
 * classic chat models get the low-variance setting we want for grading.
 */
function supportsTemperature(model: string): boolean {
  return !/^(o\d|gpt-5)/i.test(model);
}

function isTaskCompliance(v: unknown): v is TaskCompliance {
  return (
    v === "on_task" || v === "off_topic" || v === "other_language" ||
    v === "under_20_words" || v === "memorised"
  );
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export async function scoreWriting(params: {
  text: string;
  taskType: WritingTaskType;
  module: string;
  questionPrompt: string;
  wordMin: number;
}): Promise<WritingScoreResult> {
  if (!isWritingAiConfigured()) return { ok: false, reason: "not_configured" };

  const text = params.text.trim();
  const wordCount = countWords(text);
  if (wordCount < 3) return { ok: false, reason: "bad_response", detail: "empty" };

  try {
    const model = env.OPENAI_MODEL;
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY!}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(params.taskType) },
          {
            role: "user",
            content: buildUserPrompt({
              module: params.module,
              questionPrompt: params.questionPrompt,
              wordMin: params.wordMin,
              text,
              wordCount,
            }),
          },
        ],
        ...(supportsTemperature(model) ? { temperature: 0.2 } : {}),
        response_format: {
          type: "json_schema",
          json_schema: { name: "ielts_writing_band", strict: true, schema: responseSchema },
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Keep the body: a wrong OPENAI_MODEL and a spent quota both fail here and
      // the message is the only thing that tells them apart.
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: "request_failed", detail: `${res.status} ${detail.slice(0, 500)}` };
    }

    const json = await res.json();
    const message = json?.choices?.[0]?.message;
    // A refusal or a truncated completion leaves no JSON to parse. Treat both as
    // a bad response rather than letting JSON.parse throw on `undefined`.
    if (message?.refusal) return { ok: false, reason: "bad_response", detail: "refused" };
    const body = message?.content;
    if (!body) return { ok: false, reason: "bad_response", detail: "empty completion" };
    const parsed = JSON.parse(body);

    const crit = (c: { band?: number; summary?: string; strengths?: string[]; improvements?: string[] }): WritingCriterion => ({
      band: toHalfBand(Number(c?.band)),
      summary: String(c?.summary ?? ""),
      strengths: Array.isArray(c?.strengths) ? c.strengths.map(String) : [],
      improvements: Array.isArray(c?.improvements) ? c.improvements.map(String) : [],
    });

    let compliance: TaskCompliance = isTaskCompliance(parsed.taskCompliance)
      ? parsed.taskCompliance
      : "on_task";
    // The official "20 words or fewer is Band 1" rule is applied from our own
    // count, never the model's: asked to judge length it drifts over the line
    // and caps 21-word responses. The model is not even offered this flag, so a
    // stray one is discarded. A more specific flag still wins, since either way
    // the bands cap at 1.
    if (compliance === "under_20_words") compliance = "on_task";
    if (compliance === "on_task" && wordCount <= MIN_RATEABLE_WORDS) compliance = "under_20_words";
    const onTask = compliance === "on_task";

    // The Band 1 caps are enforced here, not trusted from the model: once it has
    // flagged another language, an off-topic answer, a 20-word answer or a
    // memorised one, every criterion is 1 whatever numbers came back.
    const capped = (c: WritingCriterion): WritingCriterion => (onTask ? c : { ...c, band: 1 });

    const criteria = {
      taskResponse: capped(crit(parsed.taskResponse)),
      coherenceCohesion: capped(crit(parsed.coherenceCohesion)),
      lexicalResource: capped(crit(parsed.lexicalResource)),
      grammaticalRange: capped(crit(parsed.grammaticalRange)),
    };
    const mean =
      (criteria.taskResponse.band + criteria.coherenceCohesion.band + criteria.lexicalResource.band + criteria.grammaticalRange.band) / 4;

    return {
      ok: true,
      score: {
        overall: toHalfBand(mean),
        wordCount,
        onTask,
        taskCompliance: compliance,
        criteria,
        overallFeedback: String(parsed.overallFeedback ?? ""),
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections.slice(0, 12) : [],
        improvedExamples: Array.isArray(parsed.improvedExamples) ? parsed.improvedExamples.slice(0, 6) : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String) : [],
        raw: parsed,
      },
    };
  } catch (e) {
    return { ok: false, reason: "request_failed", detail: e instanceof Error ? e.message : String(e) };
  }
}
