"use client";

import { createContext, useContext, useEffect, useId, useRef, useSyncExternalStore } from "react";

/**
 * Drag a phrase out of the passage and drop it into the answer box.
 *
 * WHY IT EARNS ITS PLACE. Reading completion, table, note and short-answer
 * questions are answered with words lifted STRAIGHT OUT of the passage — "NO
 * MORE THAN TWO WORDS FROM THE PASSAGE" is printed on the paper. Once a
 * candidate has found the phrase, retyping it is not the skill being tested,
 * and the grader compares strings: one slipped keystroke in a phrase they read
 * correctly is a mark gone. The real computer-delivered test solves this with
 * Ctrl+C / Ctrl+V out of the passage; this is the same job done with the mouse.
 *
 * READING ONLY, and not merely for tidiness. In Listening the answer comes out
 * of the recording — there is nothing on screen to drag but the question's own
 * words, so the gesture could only ever fill a blank with the sentence around
 * it. The highlighter belongs on both papers; this belongs on one. The gate is
 * <PhraseDragScope/> below, set from the section type.
 *
 * WHY NOT HTML5 DRAG AND DROP, which would be free. Three things it cannot do.
 * It drops the phrase EXACTLY as the passage prints it, and the grader compares
 * strings — so "trees." from the end of a sentence is marked wrong against
 * "trees" (see tidyPhrase below). It shows the drop point as a thin text caret
 * rather than telling the candidate which numbered box is about to receive it.
 * And it will not scroll a pane, so a gap below the fold of the questions
 * column cannot be reached without letting go first. A pointer drag of our own
 * does all three.
 *
 * WHY A MODULE-LEVEL STORE AND NOT A CONTEXT. The exam layout draws the
 * passage and the questions as two separate <QuestionBody/> trees — that is the
 * whole point of the split panes — and the drag travels from one to the other.
 * No React context spans them, so what is in hand lives here, in the module
 * both trees import, and the panes subscribe to it.
 */

/** The phrase under the pointer, while a drag is running. */
type Phrase = {
  text: string;
  /** The target it would land in right now. */
  over: string | null;
};

/** Answer boxes currently able to receive a phrase, by drop id. */
const sinks = new Map<string, (text: string) => void>();
const listeners = new Set<() => void>();
let phrase: Phrase | null = null;

function publish(next: Phrase | null) {
  phrase = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const read = () => phrase;
/** Nothing is ever in hand on the server. A stable null keeps hydration quiet. */
const readServer = () => null;

/** True when there is an answer box on screen for a phrase to go into. */
export function hasAnswerTargets() {
  return sinks.size > 0;
}

/* ------------------------------------------------------------------ *
 * Which papers get it
 * ------------------------------------------------------------------ */

const Enabled = createContext(false);

/**
 * Marks a tree as one where phrases can be dragged into answers — Reading, and
 * only while the paper is live. Both panes are told separately, because they
 * are separate trees: the passage pane needs it to start a drag, the questions
 * pane for its boxes to accept one.
 */
export function PhraseDragScope({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <Enabled.Provider value={on}>{children}</Enabled.Provider>;
}

/** False everywhere outside a scope, so a renderer never has to ask. */
export function usePhraseDrag() {
  return useContext(Enabled);
}

/* ------------------------------------------------------------------ *
 * The phrase itself
 * ------------------------------------------------------------------ */

const LEAD = /^[\s"'“”‘’(\[{]+/;
const TRAIL = /[\s"'“”‘’)\]}.,;:!?]+$/;

/**
 * The selected text as an ANSWER rather than as a quotation.
 *
 * Two things come with a phrase pulled out of running prose and neither belongs
 * in the box. The line breaks: a passage wraps mid-phrase, and "carbon\nsink"
 * is one answer, not two lines. And the sentence's own punctuation: grading
 * folds case and whitespace and nothing else (see lib/grading.ts), so a dropped
 * "trees." is marked wrong against "trees" — a mark lost to the tool, not by
 * the candidate. Only the ends are trimmed, so "world's" and "1,000" keep their
 * insides, "$50" keeps its sign and "40%" keeps its own.
 */
export function tidyPhrase(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(LEAD, "").replace(TRAIL, "");
}

/* ------------------------------------------------------------------ *
 * Drop targets
 * ------------------------------------------------------------------ */

/** The registered answer box under a point, if any. */
function targetAt(x: number, y: number): string | null {
  // The ghost is `pointer-events: none`, so it never shadows what is under it.
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const box = el?.closest?.("[data-answer-drop]") as HTMLElement | null;
  const id = box?.dataset.answerDrop;
  return id && sinks.has(id) ? id : null;
}

/**
 * Wires one answer box up as somewhere a phrase can land.
 *
 * `enabled` is false outside Reading and on a graded paper: the marks are then
 * history, and dropping a new answer into them would rewrite the evidence.
 */
export function useAnswerTarget(onDrop: (text: string) => void, enabled: boolean) {
  const id = useId();
  // The binding behind a gap is rebuilt on every keystroke anywhere in the
  // paper, so registering `onDrop` itself would re-register every field on
  // every render. The registration is stable; what it calls is always current.
  const latest = useRef(onDrop);
  latest.current = onDrop;

  useEffect(() => {
    if (!enabled) return;
    sinks.set(id, (text) => latest.current(text));
    return () => {
      sinks.delete(id);
    };
  }, [id, enabled]);

  // A box that takes nothing should not light up either.
  const held = useSyncExternalStore(subscribe, read, readServer);
  const live = enabled ? held : null;

  return {
    /** Spread on the box the phrase lands in — this is how the drag finds it. */
    dropProps: enabled ? { "data-answer-drop": id } : {},
    /** A phrase is in flight: every box should look like it will take it. */
    armed: live !== null,
    /** This box is the one it would land in. */
    over: live?.over === id,
  };
}

/* ------------------------------------------------------------------ *
 * The ghost
 * ------------------------------------------------------------------ */

/**
 * Plain DOM rather than a React element, for two reasons. The drag can start in
 * either pane and each pane is its own tree — rendered from a component, both
 * would draw one. And it moves with the pointer every frame, which out here
 * costs one style write instead of re-rendering forty answer fields.
 */
let ghost: HTMLElement | null = null;

function showGhost(text: string) {
  ghost = document.createElement("div");
  ghost.className = "phrase-ghost";
  // Truncated for the label only; the phrase that lands is never shortened.
  ghost.textContent = text.length > 64 ? `${text.slice(0, 63)}…` : text;
  document.body.appendChild(ghost);
}

function moveGhost(x: number, y: number) {
  // Offset clear of the cursor so the ghost never covers the box being aimed at.
  if (ghost) ghost.style.transform = `translate3d(${x + 14}px, ${y + 16}px, 0)`;
}

/* ------------------------------------------------------------------ *
 * The drag
 * ------------------------------------------------------------------ */

/** Movement that separates a drag from a click that happened to land on text. */
const THRESHOLD = 4;
/** How close to a pane's edge the pointer has to get before it scrolls. */
const EDGE = 56;
/** Pixels per frame at the very edge, tapering to nothing EDGE away from it. */
const SPEED = 16;

let pointer = { x: 0, y: 0 };
let frame = 0;
let endedAt = 0;

/**
 * True for a moment after a drop.
 *
 * The gesture ends with a mouse-up that the annotation layer would otherwise
 * read as "a selection was just made" and answer with the highlight menu —
 * popping it open over the box the candidate is now typing in.
 */
export function phraseDragJustEnded() {
  return performance.now() - endedAt < 250;
}

/**
 * A mouse-down on an existing selection. Nothing happens yet: only movement
 * turns it into a drag, so clicking a selected phrase still behaves normally.
 */
export function armPhraseDrag(text: string, startX: number, startY: number) {
  const disarm = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", disarm);
  };
  const onMove = (e: MouseEvent) => {
    if (Math.abs(e.clientX - startX) < THRESHOLD && Math.abs(e.clientY - startY) < THRESHOLD) {
      return;
    }
    disarm();
    startDrag(text, e.clientX, e.clientY);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", disarm);
}

function startDrag(text: string, x: number, y: number) {
  pointer = { x, y };
  publish({ text, over: targetAt(x, y) });
  showGhost(text);
  moveGhost(x, y);
  document.body.classList.add("phrase-dragging");
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragUp);
  document.addEventListener("keydown", onDragKey);
  // A button released outside the window delivers no mouse-up, so without this
  // the ghost would follow the cursor around for the rest of the paper.
  window.addEventListener("blur", endDrag);
  frame = requestAnimationFrame(travel);
}

function onDragMove(e: MouseEvent) {
  pointer = { x: e.clientX, y: e.clientY };
  moveGhost(e.clientX, e.clientY);
  aim();
}

function aim() {
  if (!phrase) return;
  const over = targetAt(pointer.x, pointer.y);
  if (over !== phrase.over) publish({ ...phrase, over });
}

function onDragUp() {
  const landing = phrase;
  endDrag();
  if (landing?.over) sinks.get(landing.over)?.(landing.text);
}

function onDragKey(e: KeyboardEvent) {
  if (e.key === "Escape") endDrag();
}

function endDrag() {
  cancelAnimationFrame(frame);
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragUp);
  document.removeEventListener("keydown", onDragKey);
  window.removeEventListener("blur", endDrag);
  document.body.classList.remove("phrase-dragging");
  ghost?.remove();
  ghost = null;
  endedAt = performance.now();
  publish(null);
}

/**
 * The scrolling box under the pointer.
 *
 * The passage and the questions are two independently scrolling columns, and
 * the gap being aimed at is very often below the fold of its own. Without this
 * the candidate would have to scroll first, remember where the phrase was, and
 * come back for it.
 */
function scrollerAt(x: number, y: number): HTMLElement | null {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;
  while (el && el !== document.body) {
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      return el;
    }
    el = el.parentElement;
  }
  // Stacked on a narrow screen there are no columns, just the page.
  return (document.scrollingElement as HTMLElement | null) ?? null;
}

function travel() {
  const box = scrollerAt(pointer.x, pointer.y);
  if (box) {
    const page = box === document.scrollingElement;
    const rect = page ? { top: 0, bottom: window.innerHeight } : box.getBoundingClientRect();
    const above = pointer.y - rect.top;
    const below = rect.bottom - pointer.y;
    if (above < EDGE) box.scrollTop -= SPEED * (1 - Math.max(0, above) / EDGE);
    else if (below < EDGE) box.scrollTop += SPEED * (1 - Math.max(0, below) / EDGE);
  }
  // Scrolling moves the boxes under a stationary pointer, so the target is
  // recomputed every frame rather than only when the mouse moves.
  aim();
  frame = requestAnimationFrame(travel);
}
