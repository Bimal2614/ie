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
      // Headings can carry a gap too — "Excavations of rock shelters inside
      // [[8]] near the village of Kelo revealed:" is a real Cambridge layout.
      layout.groups.forEach((g) => {
        if (g.title) scan(g.title);
        g.items.forEach(scan);
      });
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
  /**
   * The worked answer the paper gives away before the questions start ("the
   * Main Hall - seats ....200...."). It is shown, never answered, so it needs
   * to look unlike the notes around it — printed as a bullet it read as the
   * first thing to fill in.
   */
  example?: string;
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
  /** When set, steps are answered by choosing a letter from a shared box. */
  choices?: { key: string; text: string }[];
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

/* ------------------------------------------------------------------ *
 * Practice sections — one stimulus, several question groups
 *
 * A Cambridge part is ONE recording (or passage) that candidates answer 2–3
 * different task types against: Listening Part 1 of C21 Test 1 is a table
 * completion for 1–6 and a note completion for 7–10, off a single 7-minute
 * audio. The old one-set-one-type shape could not express that without
 * duplicating the audio and handing the candidate two players, so the group
 * — not the section — is what owns a task type, its instruction and its layout.
 *
 * Numbering stays continuous across the paper: a group declares the exam
 * numbers it covers, and `[[n]]` gaps inside its layout bind to those numbers.
 */

/** One numbered item — a single mark on the answer sheet. */
export type QuestionItem = {
  /** Exam number. What `[[n]]` in the group's layout binds to. */
  n: number;
  /** Shown above the input. Gap-backed types carry their text in the layout. */
  prompt?: string;
  /** Multiple choice / matching options, when the item owns them. */
  options?: string[];
  /** How many options a "Choose TWO letters" item expects. */
  selectCount?: number;
  /**
   * Marks this one input is worth; defaults to 1.
   *
   * "Questions 21 and 22 — choose TWO letters" is ONE selection scored out of
   * two on the answer sheet. Modelling it as two items would put two identical
   * multi-selects on screen; modelling it as one 1-mark item would silently
   * lose a mark and break the numbering of everything after it.
   */
  marks?: number;
  /** Omitted for Writing & Speaking, which are AI-scored rather than keyed. */
  answer?: CorrectAnswer;
  /** Why that answer is right — shown in review. */
  explanation?: string;
  /** Writing. */
  wordLimitMin?: number;
  wordLimitMax?: number;
  /** Speaking. */
  prepSeconds?: number;
  speakSeconds?: number;
  cueCard?: { topic: string; bullets: string[] };
};

/** A run of consecutive questions sharing one task type and one layout. */
export type QuestionGroup = {
  questionType: string;
  /** Verbatim exam wording, e.g. "Write ONE WORD AND/OR A NUMBER". */
  instruction?: string;
  /** Inclusive exam-number range this group covers. */
  from: number;
  to: number;
  /** The structure the gaps live in. Null for self-contained items (MCQ). */
  layout?: SetLayout | null;
  items: QuestionItem[];
};

/** The whole `questions` jsonb column of one practice section. */
export type SectionQuestions = { groups: QuestionGroup[] };

/** Every exam number a section actually defines, in document order. */
export function numbersInSection(q: SectionQuestions | null): number[] {
  if (!q) return [];
  return q.groups.flatMap((g) => g.items.map((i) => i.n));
}
