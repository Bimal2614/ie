/**
 * IELTS 2026 format, timing and question-type metadata.
 * Single source of truth for the practice UI, seeding, and scoring.
 */

export type SectionKey = "listening" | "reading" | "writing" | "speaking";

export type QuestionTypeKey =
  | "multiple_choice_single"
  | "multiple_choice_multiple"
  | "matching_information"
  | "matching_headings"
  | "matching_features"
  | "matching_sentence_endings"
  | "sentence_completion"
  | "summary_completion"
  | "note_completion"
  | "table_completion"
  | "flowchart_completion"
  | "diagram_label_completion"
  | "form_completion"
  | "short_answer"
  | "true_false_notgiven"
  | "yes_no_notgiven"
  | "plan_map_diagram_labelling"
  | "writing_task1_academic"
  | "writing_task1_general"
  | "writing_task2"
  | "speaking_part1"
  | "speaking_part2"
  | "speaking_part3";

/** How the player renders + collects an answer. */
export type InputFamily =
  | "single" // one correct option
  | "multi" // several correct options
  | "tfng" // True / False / Not Given
  | "ynng" // Yes / No / Not Given
  | "matching" // match prompts to a list of options
  | "completion" // fill the blank(s) with words from text/audio
  | "labelling" // label an image / map / diagram
  | "writing" // long-form text, AI-scored
  | "speaking"; // recorded audio, AI-scored

export interface SectionMeta {
  key: SectionKey;
  label: string;
  /** Official total time. */
  durationMin: number;
  /** Short human description shown on cards. */
  blurb: string;
  /** Section accent token suffix → chip-<accent>. */
  accent: "listening" | "reading" | "writing" | "speaking";
  details: string;
}

export const SECTIONS: Record<SectionKey, SectionMeta> = {
  listening: {
    key: "listening",
    label: "Listening",
    durationMin: 30,
    blurb: "4 parts · 40 questions · audio plays once",
    accent: "listening",
    details: "30 minutes of audio plus transfer time. Four recordings move from everyday to academic contexts.",
  },
  reading: {
    key: "reading",
    label: "Reading",
    durationMin: 60,
    blurb: "3 passages · 40 questions",
    accent: "reading",
    details: "60 minutes, 40 questions across 3 texts. Academic uses journal/article texts; General uses everyday & workplace texts.",
  },
  writing: {
    key: "writing",
    label: "Writing",
    durationMin: 60,
    blurb: "Task 1 + Task 2 · AI band score",
    accent: "writing",
    details: "60 minutes. Task 1 (20 min, 150+ words) and Task 2 (40 min, 250+ words). Task 2 carries more weight.",
  },
  speaking: {
    key: "speaking",
    label: "Speaking",
    durationMin: 14,
    blurb: "3 parts · 11-14 minutes · recorded",
    accent: "speaking",
    details: "An 11-14 minute interview in three parts: introduction, a long-turn cue card, and a two-way discussion.",
  },
};

/** The shared structure a type's questions live inside, if any. */
export type LayoutKind =
  | "inline_blanks"
  | "notes"
  | "table"
  | "form"
  | "flowchart"
  | "diagram"
  | "options";

export interface QuestionTypeMeta {
  key: QuestionTypeKey;
  label: string;
  /** How an answer is collected + graded. */
  family: InputFamily;
  /**
   * The set-level structure this type renders into. Types that omit it have
   * self-contained questions (MCQ, TFNG, short answer, writing, speaking); the
   * rest hang their gaps off one shared table/summary/diagram on the set.
   */
  layoutKind?: LayoutKind;
  /**
   * How the set's questions are presented.
   *  - "stacked" (default): all questions on one page, submitted together —
   *    right for reading/listening, where candidates work through a paper.
   *  - "sequential": one question at a time. Speaking Parts 1 and 3 are a live
   *    interview — the examiner asks, you answer, then the next question comes.
   *    Seeing all seven at once lets you rehearse, which the real test never
   *    allows.
   */
  presentation?: "stacked" | "sequential";
  /**
   * Default IELTS instruction line shown above the question.
   *
   * Whether it is DISPLAYED is a separate question — see showsInstruction().
   * Some types keep an instruction for scoring purposes while suppressing it on
   * screen, so this stays populated regardless.
   */
  instruction?: string;
  modules: "academic" | "general" | "both";
  /** One-liner shown on the task card. */
  shortDescription: string;
  /** Skill tags shown as chips on the card. */
  scoredSkills: string[];
  /** Whether this type is AI-evaluated (writing/speaking). */
  aiEvaluated?: boolean;
  /** Writing/Speaking timing (seconds). */
  prepSeconds?: number;
  speakSeconds?: number;
  /** Word limits for writing. */
  wordLimitMin?: number;
}

export const QUESTION_TYPES: Record<QuestionTypeKey, QuestionTypeMeta> = {
  multiple_choice_single: { key: "multiple_choice_single", label: "Multiple choice (single)", family: "single", instruction: "Choose the correct letter, A, B, C or D.", modules: "both", shortDescription: "Pick the single best answer from four options.", scoredSkills: ["Listening", "Reading"] },
  multiple_choice_multiple: { key: "multiple_choice_multiple", label: "Multiple choice (multiple)", family: "multi", instruction: "Choose TWO letters, A-E.", modules: "both", shortDescription: "Pick all correct answers from a longer list.", scoredSkills: ["Listening", "Reading"] },
  matching_information: { key: "matching_information", label: "Matching information", family: "matching", layoutKind: "options", instruction: "Which paragraph contains the following information? Write the correct letter.", modules: "both", shortDescription: "Match each statement to the paragraph that contains it.", scoredSkills: ["Reading", "Scanning"] },
  matching_headings: { key: "matching_headings", label: "Matching headings", family: "matching", layoutKind: "options", instruction: "Choose the correct heading for each paragraph from the list below.", modules: "academic", shortDescription: "Choose the best heading for each paragraph.", scoredSkills: ["Reading", "Main idea"] },
  matching_features: { key: "matching_features", label: "Matching features", family: "matching", layoutKind: "options", instruction: "Match each statement with the correct option. Write the correct letter.", modules: "both", shortDescription: "Match names, dates, or categories to statements.", scoredSkills: ["Listening", "Reading"] },
  matching_sentence_endings: { key: "matching_sentence_endings", label: "Matching sentence endings", family: "matching", layoutKind: "options", instruction: "Complete each sentence with the correct ending, A-F.", modules: "both", shortDescription: "Complete each sentence by choosing the correct ending.", scoredSkills: ["Reading", "Grammar"] },
  sentence_completion: { key: "sentence_completion", label: "Sentence completion", family: "completion", layoutKind: "inline_blanks", instruction: "Complete the sentences. Write NO MORE THAN TWO WORDS for each answer.", modules: "both", shortDescription: "Fill missing words to complete sentences from the text.", scoredSkills: ["Listening", "Reading", "Spelling"] },
  summary_completion: { key: "summary_completion", label: "Summary completion", family: "completion", layoutKind: "inline_blanks", instruction: "Complete the summary. Write ONE WORD ONLY for each answer.", modules: "both", shortDescription: "Fill blanks in a summary using words from the passage.", scoredSkills: ["Reading", "Vocabulary"] },
  note_completion: { key: "note_completion", label: "Note completion", family: "completion", layoutKind: "notes", instruction: "Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.", modules: "both", shortDescription: "Complete notes while listening to the recording.", scoredSkills: ["Listening", "Spelling"] },
  table_completion: { key: "table_completion", label: "Table completion", family: "completion", layoutKind: "table", instruction: "Complete the table. Write NO MORE THAN TWO WORDS for each answer.", modules: "both", shortDescription: "Fill in a table with information from the audio.", scoredSkills: ["Listening", "Spelling"] },
  flowchart_completion: { key: "flowchart_completion", label: "Flow-chart completion", family: "completion", layoutKind: "flowchart", instruction: "Complete the flow-chart. Write ONE WORD ONLY for each answer.", modules: "both", shortDescription: "Complete a process flow-chart with missing words.", scoredSkills: ["Listening", "Reading"] },
  diagram_label_completion: { key: "diagram_label_completion", label: "Diagram label completion", family: "labelling", layoutKind: "diagram", instruction: "Label the diagram. Write NO MORE THAN TWO WORDS for each answer.", modules: "academic", shortDescription: "Label parts of a diagram from the passage.", scoredSkills: ["Reading", "Vocabulary"] },
  form_completion: { key: "form_completion", label: "Form completion", family: "completion", layoutKind: "form", instruction: "Complete the form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.", modules: "both", shortDescription: "Fill in a form with details from the recording.", scoredSkills: ["Listening", "Spelling"] },
  short_answer: { key: "short_answer", label: "Short-answer questions", family: "completion", instruction: "Answer the questions. Write NO MORE THAN THREE WORDS for each answer.", modules: "both", shortDescription: "Write brief answers to factual questions.", scoredSkills: ["Listening", "Reading"] },
  true_false_notgiven: { key: "true_false_notgiven", label: "True / False / Not Given", family: "tfng", instruction: "Do the statements agree with the information in the text?", modules: "both", shortDescription: "Decide whether statements match factual information in the text.", scoredSkills: ["Reading", "Inference"] },
  yes_no_notgiven: { key: "yes_no_notgiven", label: "Yes / No / Not Given", family: "ynng", instruction: "Do the statements agree with the writer's claims?", modules: "both", shortDescription: "Decide whether statements match the writer's opinion.", scoredSkills: ["Reading", "Inference"] },
  plan_map_diagram_labelling: { key: "plan_map_diagram_labelling", label: "Plan / map / diagram labelling", family: "labelling", layoutKind: "diagram", instruction: "Label the map below. Write the correct letter for each answer.", modules: "both", shortDescription: "Label locations on a plan, map, or diagram.", scoredSkills: ["Listening", "Spatial"] },
  writing_task1_academic: { key: "writing_task1_academic", label: "Task 1: Academic (describe a visual)", family: "writing", instruction: "Summarise the information by selecting and reporting the main features. Write at least 150 words.", modules: "academic", shortDescription: "Describe a chart, graph, table, map, or process in 150+ words.", scoredSkills: ["Task achievement", "Coherence", "Vocabulary", "Grammar"], aiEvaluated: true, wordLimitMin: 150 },
  writing_task1_general: { key: "writing_task1_general", label: "Task 1: General (letter)", family: "writing", instruction: "Write a letter responding to the situation. Write at least 150 words.", modules: "general", shortDescription: "Write a letter (formal, semi-formal, or informal) in 150+ words.", scoredSkills: ["Task achievement", "Coherence", "Vocabulary", "Grammar"], aiEvaluated: true, wordLimitMin: 150 },
  writing_task2: { key: "writing_task2", label: "Task 2: Essay", family: "writing", instruction: "Give reasons for your answer and include relevant examples. Write at least 250 words.", modules: "both", shortDescription: "Write an essay responding to an argument or point of view.", scoredSkills: ["Task response", "Coherence", "Vocabulary", "Grammar"], aiEvaluated: true, wordLimitMin: 250 },
  speaking_part1: { key: "speaking_part1", label: "Part 1: Introduction & interview", family: "speaking", presentation: "sequential", instruction: "Answer questions about yourself and familiar topics.", modules: "both", shortDescription: "Answer questions about yourself and familiar topics.", scoredSkills: ["Fluency", "Pronunciation", "Vocabulary", "Grammar"], aiEvaluated: true, speakSeconds: 45 },
  speaking_part2: { key: "speaking_part2", label: "Part 2: Cue card (long turn)", family: "speaking", instruction: "You have 1 minute to prepare, then talk for 1-2 minutes.", modules: "both", shortDescription: "Speak for 1-2 minutes on a cue card topic.", scoredSkills: ["Fluency", "Pronunciation", "Vocabulary", "Coherence"], aiEvaluated: true, prepSeconds: 60, speakSeconds: 120 },
  speaking_part3: { key: "speaking_part3", label: "Part 3: two-way discussion", family: "speaking", presentation: "sequential", instruction: "Discuss more abstract questions related to the Part 2 topic.", modules: "both", shortDescription: "Discuss abstract ideas linked to the Part 2 topic.", scoredSkills: ["Fluency", "Pronunciation", "Vocabulary", "Grammar"], aiEvaluated: true, speakSeconds: 60 },
};

/** Which question types each section offers (a type can appear in two sections). */
export const SECTION_TYPES: Record<SectionKey, QuestionTypeKey[]> = {
  listening: [
    "multiple_choice_single",
    "multiple_choice_multiple",
    "matching_information",
    "matching_features",
    "plan_map_diagram_labelling",
    "form_completion",
    "note_completion",
    "table_completion",
    "flowchart_completion",
    "sentence_completion",
    "summary_completion",
    "short_answer",
  ],
  reading: [
    "multiple_choice_single",
    "multiple_choice_multiple",
    "true_false_notgiven",
    "yes_no_notgiven",
    "matching_information",
    "matching_headings",
    "matching_features",
    "matching_sentence_endings",
    "sentence_completion",
    "summary_completion",
    "note_completion",
    "table_completion",
    "flowchart_completion",
    "diagram_label_completion",
    "short_answer",
  ],
  writing: ["writing_task1_academic", "writing_task1_general", "writing_task2"],
  speaking: ["speaking_part1", "speaking_part2", "speaking_part3"],
};

/**
 * What one set *is*, per section — a reading set is a passage, a speaking set
 * is a topic. Used wherever the UI counts sets ("Topic 2 of 6").
 */
export const SET_NOUN: Record<SectionKey, string> = {
  reading: "Passage",
  listening: "Recording",
  writing: "Task",
  speaking: "Topic",
};

/**
 * Types whose instruction line is HIDDEN in the player.
 *
 * Speaking Parts 1 and 3 are already introduced by their topic and by the
 * question on screen, so a generic "answer questions about familiar topics"
 * above them is noise the real test doesn't have either.
 *
 * WHY A DISPLAY RULE RATHER THAN DELETING THE TEXT. The same line is stored in
 * three places — `question_sets.instructions`, `practice_sections.instructions`,
 * and each group inside `practice_sections.questions` — and every render site
 * prefers stored text over this default. Scrubbing the data therefore has to be
 * repeated for every table, and comes back the moment a book is re-imported or
 * new content is authored. Suppressing it at the point of display is one rule
 * that cannot be out-run by data.
 *
 * Part 2 is not listed: "You have 1 minute to prepare, then talk for 1–2
 * minutes" is timing the cue card does not carry.
 */
const INSTRUCTION_HIDDEN: QuestionTypeKey[] = ["speaking_part1", "speaking_part3"];

/**
 * Rubric that only restates a control the candidate is already looking at.
 *
 * "Choose the correct letter, A, B or C" is written for a paper booklet where
 * the answer sheet is somewhere else. On screen the options are right there
 * with a radio beside each one, so the line explains nothing and pushes the
 * actual question further down the page. Same for "Complete the notes below"
 * above a note sheet with boxes in it.
 *
 * Matched only as a LEADING sentence, and only these forms. Anything the list
 * does not recognise is kept, which is the safe direction to fail in: an
 * unfamiliar rubric shows in full rather than vanishing.
 *
 * The opener runs to its full stop OR to the word that starts the constraint,
 * because a handful of these arrived from the export with the full stop missing
 * ("Complete the flow-chart below Choose SIX answers from the box…"). Stopping
 * only at punctuation ate the whole line on exactly the groups whose constraint
 * matters most.
 */
const REDUNDANT_RUBRIC =
  /^\s*(?:complete the (?:notes?|table|form|flow[-\s]?chart|summary|sentences?|diagram)|label the (?:map|plan|diagram)|choose the correct letter|choose (?:two|three|four)\s+letters)\b[^.?]*?(?:[.?]|(?=\s+(?:write|choose|drag|answer)\b)|$)\s*/i;

/**
 * Instruction lines are TRIMMED across PRACTICE — every module, every type.
 *
 * Only the half above comes off. What survives is the half that is real
 * information and appears nowhere else on screen: "Write ONE WORD ONLY for each
 * answer", "Choose SIX answers from the box and write the correct letter, A-H".
 * That limit is per group and it varies inside a single paper — Part 1 of a
 * listening test can allow a word and a number where Part 4 allows one word —
 * so it cannot be replaced by a rule the UI knows on its own, and a candidate
 * who never sees it is marked wrong for something the paper told them and the
 * app did not.
 *
 * THE MOCK KEEPS EVERYTHING, deliberately. A mock is a rehearsal of the real
 * thing, rubric included — the point there is that nothing on the day is
 * unfamiliar. So this is consulted only by the practice surfaces (question
 * practice, section practice, the paginated session, and the review of a
 * practice attempt); the mock player and the exam shell it drives are left
 * alone.
 *
 * WHY A SWITCH RATHER THAN DELETED CODE. "For now" is the whole point: this is
 * a presentation decision that may well be reversed, and the render sites are
 * spread across five components. One constant is one edit to put them all back,
 * and it keeps the rule findable instead of scattered as five silent removals.
 */
// Typed `boolean`, not the literal `true`: flipping it back must stay a
// one-character edit that cannot narrow a branch out from under the compiler.
export const PRACTICE_INSTRUCTIONS_HIDDEN: boolean = true;

/**
 * What a PRACTICE surface should print of a stored instruction.
 *
 * Returns null when nothing is left worth a line — the whole rubric was the
 * redundant kind — so every caller can render the result unconditionally
 * instead of each deciding for itself what "empty" means.
 */
export function practiceInstruction(instruction: string | null | undefined): string | null {
  const text = instruction?.trim();
  if (!text) return null;
  if (!PRACTICE_INSTRUCTIONS_HIDDEN) return text;
  const kept = text.replace(REDUNDANT_RUBRIC, "").trim();
  return kept || null;
}

/**
 * Sections whose band comes from AI marking rather than an answer key. There is
 * no marks card for these: the examiner report IS the result.
 */
export function isAiScored(section: SectionKey): boolean {
  return section === "writing" || section === "speaking";
}

/**
 * Does this task's stimulus sit BESIDE the questions rather than above them?
 *
 * Reading always has a passage to read against; Writing Task 1 has a chart to
 * describe. Task 2, Listening and Speaking have nothing that needs to stay in
 * view while answering, so they run as one column.
 *
 * Lives here because all three players (question, section, paginated session)
 * ask the same question, and three copies of the rule is how a Task 1 chart
 * ends up stacked above the editor on one route and beside it on another.
 */
export function hasSideStimulus(
  section: SectionKey,
  stimulus: { passageText?: string | null; imageUrl?: string | null },
): boolean {
  if (section === "reading") return Boolean(stimulus.passageText);
  if (section === "writing") return Boolean(stimulus.imageUrl);
  return false;
}

/** Should this type's instruction line be drawn at all? */
export function showsInstruction(questionType: QuestionTypeKey): boolean {
  return !INSTRUCTION_HIDDEN.includes(questionType);
}

export const OBJECTIVE_FAMILIES: InputFamily[] = ["single", "multi", "tfng", "ynng", "matching", "completion", "labelling"];

export function isObjective(family: InputFamily): boolean {
  return OBJECTIVE_FAMILIES.includes(family);
}

/**
 * Approximate IELTS raw(/40) → band conversion, used for mock-test scoring and by
 * the public band calculator at /ielts-band-score-calculator.
 *
 * Each row is [minimum correct answers, band]. Read top-down and take the first
 * row you clear. These are the widely-published Cambridge averages — the real
 * paper is equated per version, so treat them as a close guide, not a promise.
 *
 * General Training Reading needs MORE correct answers than Academic for the same
 * band, because the texts are easier. That is why it has its own table.
 */
const LISTENING_BANDS: [min: number, band: number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [6, 3.5], [4, 3], [3, 2.5], [2, 2], [1, 1],
];
const ACADEMIC_READING_BANDS: [min: number, band: number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];
const GENERAL_READING_BANDS: [min: number, band: number][] = [
  [40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3],
];

/** The three tables, exposed so the calculator page can render them as charts. */
export const BAND_TABLES = {
  listening: LISTENING_BANDS,
  academicReading: ACADEMIC_READING_BANDS,
  generalReading: GENERAL_READING_BANDS,
} as const;

export function rawToBand(
  section: "listening" | "reading",
  correct: number,
  module: "academic" | "general" = "academic",
): number {
  const table =
    section === "listening"
      ? LISTENING_BANDS
      : module === "general"
        ? GENERAL_READING_BANDS
        : ACADEMIC_READING_BANDS;
  for (const [min, band] of table) if (correct >= min) return band;
  return 0;
}

/**
 * The overall band from the four skill bands.
 *
 * IELTS averages the four, then reports to the nearest half band — with .25 and
 * .75 rounding UP (6.25 → 6.5, 6.75 → 7). Doubling, rounding half-up, and halving
 * reproduces that rule exactly, including the two round-up cases.
 */
export function overallBand(bands: [number, number, number, number]): number {
  const avg = bands.reduce((a, b) => a + b, 0) / 4;
  return Math.round(avg * 2) / 2;
}

/**
 * The band at which a response counts as "correct".
 *
 * Writing and Speaking have no right/wrong — they're marked against criteria and
 * reported as a band, so `user_responses.is_correct` stays NULL for them. Band 6
 * is the usual minimum entry requirement, so it's the floor we treat as a pass
 * and the thing that makes "attempted vs right/wrong" meaningful across all four
 * skills. Deliberately NOT written into `is_correct`: the column records whether
 * an answer was factually right, and a threshold judgement would destroy the
 * band's resolution (5.5 and 2.0 are not the same answer).
 *
 * Distinct from the learner's own `users.target_band`: clearing 6 makes a
 * response correct, but falling short of the target is what "needs work" means.
 */
export const PASS_BAND = 6;

/**
 * Listening and Reading are marked right/wrong, so accuracy is meaningful for
 * them. Writing and Speaking are marked against criteria and only ever yield a
 * band — accuracy is meaningless there. Anything reporting a score per section
 * has to branch on this.
 */
export function isObjectiveSection(section: string): boolean {
  return section === "listening" || section === "reading";
}

/**
 * Put an objective section's accuracy on the 0–9 band scale so Listening and
 * Reading can be RANKED against Writing/Speaking (which only have a band).
 *
 * Internal comparison only — do not show this to learners. The /40 tables assume
 * a full exam paper, so a band derived from a short practice set is a much weaker
 * claim than a real one; display accuracy for these sections instead.
 */
export function accuracyToBand(section: "listening" | "reading", accuracyPct: number): number {
  return rawToBand(section, Math.round((accuracyPct / 100) * 40));
}

export const SECTION_ORDER: SectionKey[] = ["listening", "reading", "writing", "speaking"];
