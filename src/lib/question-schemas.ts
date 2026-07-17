/**
 * Runtime validation for question/set content.
 *
 * WHY THIS EXISTS — a lesson from the PTE database. There, `content` is an
 * untyped jsonb and the per-type interfaces are advisory only, so nothing
 * rejects a bad write. Across 22,919 live rows the same field ended up spelled
 * three ways (`correct_answer` 3,982 · `correct_answers` 661 ·
 * `correctAnswer` 220) and audio two ways (`audio_url` 10,249 · `audioUrl`
 * 110) — one row carries both. Every reader now probes several keys to find one
 * value, and the interfaces document the drift instead of preventing it.
 *
 * The architecture there is right; the missing piece was a gate at the write
 * boundary. Everything that writes a set or question — seeds today, the admin
 * panel later — parses through here, so a typo fails loudly at the source
 * rather than becoming a permanent shape every consumer must handle.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Set layouts
 * ------------------------------------------------------------------ */

const inlineBlanks = z.object({
  kind: z.literal("inline_blanks"),
  heading: z.string().optional(),
  blocks: z.array(z.string()).min(1),
});

const notes = z.object({
  kind: z.literal("notes"),
  heading: z.string().optional(),
  groups: z
    .array(
      z.object({
        title: z.string().optional(),
        items: z.array(z.string()).min(1),
      }),
    )
    .min(1),
});

const table = z.object({
  kind: z.literal("table"),
  heading: z.string().optional(),
  columns: z.array(z.string()).min(1),
  rows: z
    .array(z.array(z.object({ text: z.string(), header: z.boolean().optional() })).min(1))
    .min(1),
});

const form = z.object({
  kind: z.literal("form"),
  heading: z.string().optional(),
  rows: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
});

const flowchart = z.object({
  kind: z.literal("flowchart"),
  heading: z.string().optional(),
  steps: z.array(z.string()).min(2),
});

const diagram = z.object({
  kind: z.literal("diagram"),
  heading: z.string().optional(),
  imageUrl: z.url().optional(),
  pins: z
    .array(
      z.object({
        gap: z.int().positive(),
        // Percentages of the image box — pins must land on the image.
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
      }),
    )
    .min(1),
  choices: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
});

const options = z.object({
  kind: z.literal("options"),
  title: z.string(),
  options: z.array(z.object({ key: z.string(), text: z.string() })).min(2),
});

export const setLayoutSchema = z.discriminatedUnion("kind", [
  inlineBlanks,
  notes,
  table,
  form,
  flowchart,
  diagram,
  options,
]);

/* ------------------------------------------------------------------ *
 * Question content + answers
 * ------------------------------------------------------------------ */

export const questionContentSchema = z
  .union([
    z.object({ options: z.array(z.string()).min(2), selectCount: z.int().positive().optional() }),
    z.object({ choices: z.array(z.string()).min(2) }),
    z.object({ options: z.array(z.object({ key: z.string(), text: z.string() })).min(2) }),
    z.object({ cueCard: z.object({ topic: z.string(), bullets: z.array(z.string()).min(1) }) }),
    z.object({}), // gap-backed types keep their structure on the set's layout
  ])
  .nullable();

export const correctAnswerSchema = z
  .union([
    z.object({ index: z.int().nonnegative() }),
    z.object({ indices: z.array(z.int().nonnegative()).min(1) }),
    z.object({ value: z.string() }),
    z.object({ key: z.string() }),
    // Every accepted spelling/variant is data — IELTS marks "four" and "4"
    // alike, so the grader stays dumb and the content stays honest.
    z.object({ any: z.array(z.string()).min(1) }),
  ])
  .nullable();

/* ------------------------------------------------------------------ *
 * Validated write helpers
 * ------------------------------------------------------------------ */

export function parseSetLayout(layout: unknown, label: string) {
  if (layout == null) return null;
  const res = setLayoutSchema.safeParse(layout);
  if (!res.success) {
    throw new Error(`Invalid layout for "${label}": ${z.prettifyError(res.error)}`);
  }
  return res.data;
}

export function parseCorrectAnswer(answer: unknown, label: string) {
  const res = correctAnswerSchema.safeParse(answer ?? null);
  if (!res.success) {
    throw new Error(`Invalid correctAnswer for "${label}": ${z.prettifyError(res.error)}`);
  }
  return res.data;
}

export function parseQuestionContent(content: unknown, label: string) {
  const res = questionContentSchema.safeParse(content ?? null);
  if (!res.success) {
    throw new Error(`Invalid content for "${label}": ${z.prettifyError(res.error)}`);
  }
  return res.data;
}
