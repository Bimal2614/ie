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
  /**
   * When set, the blanks are filled from a shared lettered box rather than
   * typed — "Complete the summary using the list of words, A-H, below".
   *
   * Same shape and same meaning as `choices` on the flow-chart and diagram
   * layouts, because it is the same task: prose with gaps plus one bank of
   * options. Without it this rubric was read as a matching task and each blank
   * became its own row carrying a truncated sentence fragment, which is not
   * what the paper prints.
   */
  choices?: { key: string; text: string }[];
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
  /**
   * The box of words a map-labelling task tells the candidate to choose from
   * ("Choose your answers from the box below"). Unlike `choices` elsewhere
   * these are not lettered — the candidate writes the word out — so this is a
   * printed reference box, not a picker, and the paper is unanswerable
   * without it.
   */
  wordBank?: string[];
};

export type TableCell = {
  text: string;
  /** Header cells render bold on a tinted background and take no input. */
  header?: boolean;
  /** Cells merged across columns / down rows, as the printed paper prints
   * them: a sentence or a section label running the full width of the grid,
   * or a row label shared by the two rows beneath it. A row carrying a
   * merged cell holds fewer cells than the table has columns — that is the
   * span doing its job, not a malformed row. */
  colSpan?: number;
  rowSpan?: number;
};

/** A real grid — table completion. */
export type TableLayout = {
  kind: "table";
  heading?: string;
  /** Empty when the paper prints no column headings, or prints them inside
   * the grid — some tables open straight onto a full-width sentence, and one
   * grid can carry two sections with a heading row each. */
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

export type ChoiceContent = {
  options: string[];
  selectCount?: number;
  /**
   * A picture this question alone is asked about — "Which chart shows the
   * percentage of cinema seats?" over three pie charts, where the options are
   * only the labels "Chart A/B/C". The set-level `imageUrl` cannot carry
   * these: consecutive questions in one group each have their own chart, and
   * without the picture the question cannot be answered at all.
   */
  imageUrl?: string;
};
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
 * Does this answer count as GIVEN?
 *
 * Emptying an input does not delete its key. A gap cleared with backspace
 * writes { text: "" }, a matching slot cleared by clicking it writes
 * { key: "" }, and a deselected choice writes {}. Every one of those is
 * `!== undefined`, so counting keys left the answer sheet lighting up numbers
 * whose box was visibly empty — and the count above Submit agreed with it.
 *
 * Shape-aware on purpose: option A is `{ index: 0 }`, so a blanket "is it
 * truthy" test would read the first option of every question as unanswered.
 */
export function isAnswered(a: Answer | undefined): boolean {
  if (!a) return false;
  if (Object.keys(a).length === 0) return false;
  if (typeof a.index === "number") return true;
  if (Array.isArray(a.indices)) return a.indices.length > 0;
  for (const k of ["value", "key", "text"] as const) {
    if (typeof a[k] === "string") return a[k].trim() !== "";
  }
  // Anything left is a recording, which is an answer by virtue of existing.
  return true;
}

/**
 * Is this answer's recording still being stored?
 *
 * A speaking answer is reported to the player the instant recording stops, so
 * the interview can move on while the upload runs. But the answer is only USABLE
 * once it carries an `audioUrl` — submit before then and the row is written with
 * no recording to score, which is silent data loss: the candidate is told the
 * answer was submitted and it can never produce a band.
 *
 * That is not hypothetical. A seven-question Part 1 lost its last answer exactly
 * this way, because the final question is the one you submit immediately after
 * speaking, with no further question to cover the upload.
 */
export function isUploadPending(a: Answer | undefined): boolean {
  return a?.pendingUpload === true;
}

/** True while ANY answer in the set is still uploading. Gates submit. */
export function anyUploadPending(answers: Record<string, Answer | undefined>): boolean {
  return Object.values(answers).some(isUploadPending);
}

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
  /**
   * A picture this question alone is asked about, when the options only name
   * it ("Chart A", "Graph B"). The set's `imageUrl` cannot serve here — one
   * group's consecutive questions each carry a different chart.
   */
  imageUrl?: string;
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
  /**
   * The examiner asking this question aloud, `s3://bucket/<key>`. Authored by
   * `npm run db:build:speaking-audio` rather than by hand, but it lives in the
   * content document for the same reason listening's `audioUrl` does: the
   * import is what carries it to both reading paths, so one re-import keeps
   * `practice_sections` and `questions` saying the same thing.
   */
  promptAudioUrl?: string;
  /** Which ElevenLabs voice spoke it — one examiner per Cambridge book. */
  promptVoiceId?: string;
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

/**
 * Renumber every gap in a layout by `offset`.
 *
 * A mock paper numbers its answer sheet continuously, but the parts it is built
 * from each start their own count at 1 — Writing Task 2 and Speaking Part 2 are
 * both "question 1" in `practice_sections`. The paper shows them as 2 and 5, so
 * the items are shifted for display; a layout whose text says `[[1]]` has to
 * move with them or its gap would bind to nothing.
 *
 * Listening and Reading already number across the whole paper, so their offset
 * is 0 and this is a no-op — which is the case that matters, because those are
 * the only sections with gap-bearing layouts today. It is written generally
 * anyway: a silently mis-bound gap renders as literal `[[7]]` on screen.
 */
export function shiftLayoutGaps(layout: SetLayout | null | undefined, offset: number): SetLayout | null {
  if (!layout) return null;
  if (offset === 0) return layout;

  const shiftText = (t: string) => t.replace(GAP_RE, (_, n: string) => `[[${Number(n) + offset}]]`);
  const l = structuredClone(layout);

  switch (l.kind) {
    case "inline_blanks":
      l.blocks = l.blocks.map(shiftText);
      break;
    case "notes":
      if (l.example) l.example = shiftText(l.example);
      l.groups = l.groups.map((g) => ({
        title: g.title ? shiftText(g.title) : g.title,
        items: g.items.map(shiftText),
      }));
      break;
    case "table":
      l.rows = l.rows.map((r) => r.map((c) => ({ ...c, text: shiftText(c.text) })));
      break;
    case "form":
      l.rows = l.rows.map((r) => ({ ...r, value: shiftText(r.value) }));
      break;
    case "flowchart":
      l.steps = l.steps.map(shiftText);
      break;
    case "diagram":
      // Pins carry the number as data rather than inside text.
      l.pins = l.pins.map((p) => ({ ...p, gap: p.gap + offset }));
      break;
    case "options":
      // A shared letter box has no numbered gaps of its own.
      break;
  }
  return l;
}

/* ------------------------------------------------------------------ *
 * Addressing one answer
 * ------------------------------------------------------------------ */

/**
 * The key one answer is filed under, everywhere: in the player's state, in a
 * mock sitting's `draft_answers`, and as the (section_id, question_number) pair
 * on `mock_test_answers`.
 *
 * WHY A NUMBER ALONE IS NOT ENOUGH. Section practice sits one part at a time, so
 * there the exam number IS the identity. A mock paper holds twelve parts at
 * once, and the number collides four ways inside it: Listening and Reading both
 * run 1-40, and every Writing task and Speaking part starts again at 1. The part
 * the item belongs to is what disambiguates it.
 *
 * WHY IT LIVES HERE, beside the content contract, rather than with the mock
 * timing code that first needed it: this is the format the RENDERER indexes its
 * inputs by. When the two disagree the failure is silent and horrible — the
 * answer sheet lights up as answered while the input the candidate typed into
 * shows nothing back, because the value is being stored under one key and read
 * under another. Keeping the writer and the reader on one exported function is
 * what stops that recurring.
 */
export function answerKey(scope: string | null | undefined, n: number): string {
  return scope ? `${scope}:${n}` : String(n);
}

/** The exam number out of a key, whichever form it took. */
export function numberFromKey(key: string): number {
  const at = key.lastIndexOf(":");
  return Number(at === -1 ? key : key.slice(at + 1));
}
