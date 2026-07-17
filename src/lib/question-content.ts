/**
 * Content contract for IELTS practice sets.
 *
 * In the real exam the *stimulus* is shared and the *gaps* are the questions: a
 * summary paragraph with gaps 14–18 is one paragraph and five marks. So the
 * structure (summary text, table grid, heading list, diagram pins) lives on the
 * SET as `layout`, and each question owns exactly one numbered gap plus its
 * accepted answers.
 *
 * Gaps are written inline as `[[14]]`, referencing the question's *exam number*
 * (set.startNumber + orderIndex) — not its uuid, so seed data stays readable.
 */

/** A gap marker parsed out of a text block. */
export type Gap = { gap: number };
/** A text block is a run of literal text and gaps, in order. */
export type Segment = string | Gap;

const GAP_RE = /\[\[(\d+)\]\]/g;

/** Split `"up to [[14]] degrees"` into `["up to ", {gap:14}, " degrees"]`. */
export function parseGaps(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(GAP_RE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ gap: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function isGap(s: Segment): s is Gap {
  return typeof s !== "string";
}

/** Every gap number appearing in a layout, in document order. */
export function gapsInLayout(layout: SetLayout | null): number[] {
  if (!layout) return [];
  const found: number[] = [];
  const scan = (t: string) => {
    for (const m of t.matchAll(GAP_RE)) found.push(Number(m[1]));
  };
  switch (layout.kind) {
    case "inline_blanks":
      layout.blocks.forEach(scan);
      break;
    case "notes":
      layout.groups.forEach((g) => g.items.forEach(scan));
      break;
    case "table":
      layout.rows.forEach((r) => r.forEach((c) => scan(c.text)));
      break;
    case "form":
      layout.rows.forEach((r) => scan(r.value));
      break;
    case "flowchart":
      layout.steps.forEach(scan);
      break;
    case "diagram":
      layout.pins.forEach((p) => found.push(p.gap));
      break;
    case "options":
      break;
  }
  return found;
}

/* ------------------------------------------------------------------ *
 * Set-level layouts
 * ------------------------------------------------------------------ */

/** Prose with gaps: summary / sentence completion. */
export type InlineBlanksLayout = {
  kind: "inline_blanks";
  heading?: string;
  /** Each block is a paragraph (or a numbered sentence) containing `[[n]]`. */
  blocks: string[];
};

/** Indented note-taking layout used by Listening note completion. */
export type NotesLayout = {
  kind: "notes";
  heading?: string;
  groups: { title?: string; items: string[] }[];
};

export type TableCell = {
  text: string;
  /** Header cells render bold on a tinted background and take no input. */
  header?: boolean;
};

/** A real grid — table completion. */
export type TableLayout = {
  kind: "table";
  heading?: string;
  columns: string[];
  rows: TableCell[][];
};

/** `Label: ______` rows — form completion. */
export type FormLayout = {
  kind: "form";
  heading?: string;
  rows: { label: string; value: string }[];
};

/** Boxes joined by arrows — flow-chart completion. */
export type FlowchartLayout = {
  kind: "flowchart";
  heading?: string;
  steps: string[];
};

/** An image with numbered pins — diagram / plan / map labelling. */
export type DiagramLayout = {
  kind: "diagram";
  heading?: string;
  /** Falls back to the set's imageUrl when omitted. */
  imageUrl?: string;
  /** `x`/`y` are percentages of the image box, so pins scale with it. */
  pins: { gap: number; x: number; y: number }[];
  /** When set, pins are answered by choosing a letter rather than typing. */
  choices?: { key: string; text: string }[];
};

/** A shared lettered/roman option box — matching headings, features, endings. */
export type OptionsLayout = {
  kind: "options";
  title: string;
  options: { key: string; text: string }[];
};

export type SetLayout =
  | InlineBlanksLayout
  | NotesLayout
  | TableLayout
  | FormLayout
  | FlowchartLayout
  | DiagramLayout
  | OptionsLayout;

/* ------------------------------------------------------------------ *
 * Question-level content (types that carry their own options)
 * ------------------------------------------------------------------ */

export type ChoiceContent = { options: string[]; selectCount?: number };
export type JudgementContent = { choices?: string[] };
export type CueCardContent = { cueCard: { topic: string; bullets: string[] } };

/* ------------------------------------------------------------------ *
 * Answers
 * ------------------------------------------------------------------ */

/**
 * What the player collects, keyed by question id, and what lands in the
 * `response` jsonb. Deliberately an open bag rather than a union: readers pull
 * one key out of an answer whose shape depends on the question's family, and a
 * closed union would force a cast at every read. The variants below document
 * the shape each family writes.
 *
 *   single   → { index: number }
 *   multi    → { indices: number[] }
 *   tfng     → { value: string }
 *   ynng     → { value: string }
 *   matching → { key: string }
 *   gaps     → { text: string }
 *   writing  → { text: string, words: number }
 *   speaking → { recorded: true, durationSec: number }
 */
export type Answer = Record<string, unknown>;

/**
 * Accepted answers. `any` lists equally-valid variants — IELTS marks
 * "four"/"4" and "car park"/"carpark" alike, so spelling variants are data,
 * not a grader special case.
 */
export type CorrectAnswer =
  | { index: number }
  | { indices: number[] }
  | { value: string }
  | { key: string }
  | { any: string[] };
