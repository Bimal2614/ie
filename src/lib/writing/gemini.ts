import "server-only";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { env, isWritingAiConfigured } from "@/lib/env";

/**
 * Writing band scoring with Google Gemini.
 *
 * Grades IELTS Writing Task 1/2 on the four OFFICIAL band criteria and returns
 * a rich, examiner-style analysis: per-criterion band + strengths + fixes,
 * annotated corrections (quote → issue → fix), upgraded sentence rewrites, an
 * on-task check, and prioritised next steps. Returns a structured result rather
 * than throwing, so a scoring outage degrades to "unscored" — never a failed
 * submission. The band is computed server-side and never trusted from a client.
 */

export type WritingTaskType = "writing_task1_academic" | "writing_task1_general" | "writing_task2";

export type WritingCriterion = {
  /** 0–9, half-band. */
  band: number;
  /** One-line verdict on this criterion in this response. */
  summary: string;
  strengths: string[];
  improvements: string[];
};

export type WritingScore = {
  /** Overall band = mean of the four criteria, rounded to the nearest half. */
  overall: number;
  wordCount: number;
  /** Did the response actually address the task set? */
  onTask: boolean;
  criteria: {
    taskResponse: WritingCriterion; // "Task Achievement" for Task 1
    coherenceCohesion: WritingCriterion;
    lexicalResource: WritingCriterion;
    grammaticalRange: WritingCriterion;
  };
  overallFeedback: string;
  /** Specific corrections lifted from the candidate's own text. */
  corrections: { quote: string; issue: string; fix: string }[];
  /** Band-raising rewrites of the candidate's sentences. */
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

const criterionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    band: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING },
    strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    improvements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["band", "summary", "strengths", "improvements"],
} as const;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    onTask: { type: SchemaType.BOOLEAN },
    overallFeedback: { type: SchemaType.STRING },
    taskResponse: criterionSchema,
    coherenceCohesion: criterionSchema,
    lexicalResource: criterionSchema,
    grammaticalRange: criterionSchema,
    corrections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          quote: { type: SchemaType.STRING },
          issue: { type: SchemaType.STRING },
          fix: { type: SchemaType.STRING },
        },
        required: ["quote", "issue", "fix"],
      },
    },
    improvedExamples: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          original: { type: SchemaType.STRING },
          improved: { type: SchemaType.STRING },
        },
        required: ["original", "improved"],
      },
    },
    nextSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "onTask", "overallFeedback", "taskResponse", "coherenceCohesion",
    "lexicalResource", "grammaticalRange", "corrections", "improvedExamples", "nextSteps",
  ],
} as const;

function taskLabel(taskType: WritingTaskType): string {
  switch (taskType) {
    case "writing_task1_academic":
      return "IELTS Academic Writing Task 1 (describe a chart/graph/table/process/map in 150+ words; the first criterion is TASK ACHIEVEMENT — includes a clear overview and accurate data, no opinions)";
    case "writing_task1_general":
      return "IELTS General Training Writing Task 1 (a letter of 150+ words; the first criterion is TASK ACHIEVEMENT — covers all bullet points with a consistent, appropriate tone)";
    case "writing_task2":
      return "IELTS Writing Task 2 (a 250+ word essay; the first criterion is TASK RESPONSE — fully addresses all parts of the prompt with a clear, developed position)";
  }
}

function buildPrompt(p: {
  taskType: WritingTaskType;
  module: string;
  questionPrompt: string;
  wordMin: number;
  text: string;
  wordCount: number;
}): string {
  return [
    "You are a certified, experienced IELTS examiner. Grade the candidate's writing STRICTLY against the official IELTS public band descriptors (0–9, half-bands allowed).",
    "",
    `TASK: ${taskLabel(p.taskType)}.`,
    `MODULE: ${p.module}.`,
    `MINIMUM WORDS: ${p.wordMin}. Under-length responses are penalised on Task Achievement/Response.`,
    "",
    "THE FOUR CRITERIA (weight them equally):",
    "1. Task Response / Task Achievement — does it fully address the task, develop ideas, and (T1) give an overview / (T2) hold a clear position?",
    "2. Coherence & Cohesion — logical progression, paragraphing, and natural (not mechanical) linking.",
    "3. Lexical Resource — range, precision and naturalness of vocabulary; collocation; spelling.",
    "4. Grammatical Range & Accuracy — variety of structures and error density.",
    "",
    "RULES:",
    "- Be calibrated and honest — do NOT inflate. Most real candidates sit between 5.0 and 7.5.",
    "- Quote the candidate's OWN words in corrections and improvedExamples (do not invent text they didn't write).",
    "- 'improvements' and 'nextSteps' must be specific and actionable, not generic advice.",
    "- If the response is off-topic, memorised, or far under length, set onTask=false and cap the bands accordingly.",
    "- Bands must be one of: 0,1,2,3,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9.",
    "",
    `QUESTION / PROMPT GIVEN TO THE CANDIDATE:\n"""${p.questionPrompt}"""`,
    "",
    `CANDIDATE'S RESPONSE (${p.wordCount} words):\n"""${p.text}"""`,
  ].join("\n");
}

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
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: responseSchema as any,
      },
    });

    const prompt = buildPrompt({ ...params, text, wordCount, wordMin: params.wordMin });
    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(res.response.text());

    const crit = (c: { band?: number; summary?: string; strengths?: string[]; improvements?: string[] }): WritingCriterion => ({
      band: toHalfBand(Number(c?.band)),
      summary: String(c?.summary ?? ""),
      strengths: Array.isArray(c?.strengths) ? c.strengths.map(String) : [],
      improvements: Array.isArray(c?.improvements) ? c.improvements.map(String) : [],
    });

    const criteria = {
      taskResponse: crit(parsed.taskResponse),
      coherenceCohesion: crit(parsed.coherenceCohesion),
      lexicalResource: crit(parsed.lexicalResource),
      grammaticalRange: crit(parsed.grammaticalRange),
    };
    const mean =
      (criteria.taskResponse.band + criteria.coherenceCohesion.band + criteria.lexicalResource.band + criteria.grammaticalRange.band) / 4;

    return {
      ok: true,
      score: {
        overall: toHalfBand(mean),
        wordCount,
        onTask: Boolean(parsed.onTask),
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
