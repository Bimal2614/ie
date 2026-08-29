"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Highlighter, StickyNote, Trash2, X } from "lucide-react";
import {
  armPhraseDrag,
  hasAnswerTargets,
  phraseDragJustEnded,
  PhraseDragScope,
  tidyPhrase,
} from "./answer-drag";

/**
 * The highlighter and notes the real test provides — on ANY text on the page.
 *
 * WHY IT EARNS ITS PLACE. Computer-delivered IELTS gives candidates a
 * right-click menu — Highlight, Add note, Clear — and it works on everything
 * they can read: the Reading passage, and in Listening the note sheet, the
 * table, the form and the question stems. Marking the line you are waiting for
 * before the recording reaches it is the technique every course teaches, and
 * Listening is where it matters most because the audio does not come back.
 *
 * WHY IT IS A LAYER AND NOT A COMPONENT. The first version only knew how to
 * annotate one string — the Reading passage — because it re-rendered that
 * string by splitting it on character offsets. A Listening part is not one
 * string: it is a note sheet with answer fields sitting inside the sentences, a
 * table, a set of options. So the offsets are now filed per RUN — one authored
 * string, wherever it is drawn — and any renderer that prints one wraps it in
 * <AnnotatedText/>. The passage is simply the run called "passage".
 *
 * OFFSETS, NOT DOM RANGES. An annotation is `{start, end}` into a run's text.
 * Serialising DOM ranges instead would break the moment anything re-renders —
 * which it does on every keystroke — and could not be persisted at all. Offsets
 * are stable, comparable and trivially storable. Crucially they are measured
 * against the AUTHORED text, so typing into a gap that sits mid-sentence moves
 * nothing: an <input> contributes no characters.
 *
 * COPY PROTECTION, AND THE ONE PAPER THAT IS EXEMPT. Selection has to be
 * allowed for any of this to work, so it is — and `onCopy` is otherwise refused,
 * with the browser's own context menu replaced by ours, everywhere except
 * inside a field the candidate is writing their own answer into.
 *
 * READING IS THE EXEMPTION, because the real test makes it one: computer-
 * delivered IELTS Reading lets a candidate copy a phrase out of the passage
 * with Ctrl+C and paste it into the answer box with Ctrl+V, and it is the
 * standard way of avoiding a typo in a word the paper says to take verbatim.
 * Refusing it here would be practising a different test. `phrases` is that
 * exemption, and it also switches on the drag in answer-drag.tsx; Listening,
 * and any graded paper, stay locked.
 */

export type Annotation = {
  /** Character offsets into the run's text; `end` is exclusive. */
  start: number;
  end: number;
  /** Present when the candidate attached a note to the mark. */
  note?: string;
};

/** Every mark on one screen: run id -> spans into that run's text. */
type Sheet = Record<string, Annotation[]>;

/** One run's slice of a live selection. */
type Span = { run: string; start: number; end: number };

const PREFIX = "ielts:annot:";

const EMPTY: Annotation[] = [];

/**
 * Where a screen's annotations are filed.
 *
 * THE SCOPE IS NOT DECORATION. A mock's part and the section-practice part it
 * was built from are the SAME `practice_sections` row, so keying by the part
 * alone meant marks made while practising reappeared, already drawn, inside a
 * timed mock — a candidate sitting the exam with last week's findings on the
 * page. The scope is what keeps one attempt's working notes to that attempt.
 *
 * THE SLOT IS NOT DECORATION EITHER. The exam layout draws the stimulus pane
 * and the questions pane as two separate <QuestionBody/> trees, so they hold
 * two independent sheets. Sharing a key would mean whichever pane saved last
 * wiped the other's marks.
 */
function storageKey(scope: string, id: string, slot: string) {
  return `${PREFIX}${scope}:${id}:${slot}`;
}

/**
 * SESSION storage, not local.
 *
 * Annotations are scratch working notes, not saved work. They have to survive a
 * reload and moving between parts — which is what storage is for here — but they
 * should not outlive the tab or pile up for ever. `sessionStorage` gives exactly
 * that lifetime, and being per-tab it also means a mock opened beside a practice
 * tab cannot inherit anything from it.
 */
function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    // Blocked site data. Nothing persists; the highlighter still works.
    return null;
  }
}

/** Drop every annotation under a scope — an attempt ending, or a paper handed in. */
export function clearAnnotations(scope: string) {
  const s = store();
  if (!s) return;
  try {
    const prefix = `${PREFIX}${scope}:`;
    // Collected first: removing while iterating shifts the indices and skips keys.
    const doomed: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (key?.startsWith(prefix)) doomed.push(key);
    }
    for (const key of doomed) s.removeItem(key);
  } catch {
    // Cosmetic either way.
  }
}

function load(scope: string, id: string, slot: string): Sheet {
  try {
    const raw = store()?.getItem(storageKey(scope, id, slot));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Sheet = {};
    for (const [run, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const clean = (list as Annotation[])
        .filter(
          (a) => a && typeof a.start === "number" && typeof a.end === "number" && a.end > a.start,
        )
        .sort((a, b) => a.start - b.start);
      if (clean.length > 0) out[run] = clean;
    }
    return out;
  } catch {
    // Blocked site data, or something else's key. Either way: no annotations.
    return {};
  }
}

function save(scope: string, id: string, slot: string, sheet: Sheet) {
  try {
    store()?.setItem(storageKey(scope, id, slot), JSON.stringify(sheet));
  } catch {
    // Losing them on reload is bad; refusing to draw them now is worse.
  }
}

/**
 * Merge a new span into one run's list, absorbing anything it touches.
 *
 * Overlapping marks would otherwise stack into nested spans that get darker
 * with every pass and can never be cleared in one click. Any note text on an
 * absorbed span is carried into the survivor rather than silently dropped.
 */
function mergeSpan(list: Annotation[], span: Annotation): Annotation[] {
  const untouched: Annotation[] = [];
  let start = span.start;
  let end = span.end;
  const notes: string[] = span.note ? [span.note] : [];

  for (const a of list) {
    if (a.end < start || a.start > end) {
      untouched.push(a);
      continue;
    }
    start = Math.min(start, a.start);
    end = Math.max(end, a.end);
    if (a.note) notes.push(a.note);
  }

  const merged: Annotation = { start, end };
  if (notes.length > 0) merged.note = notes.join("\n");
  return [...untouched, merged].sort((a, b) => a.start - b.start);
}

/** Apply one gesture's spans — which may cross several runs — to the sheet. */
function applySpans(sheet: Sheet, spans: Span[], note?: string): Sheet {
  const next: Sheet = { ...sheet };
  for (const s of spans) {
    next[s.run] = mergeSpan(next[s.run] ?? [], {
      start: s.start,
      end: s.end,
      ...(note ? { note } : {}),
    });
  }
  return next;
}

/**
 * Characters from the start of `seg` to a point inside it.
 *
 * Measured with a Range rather than by walking text nodes, because a selection
 * boundary is often an ELEMENT and an offset into its children rather than a
 * text node — which a text-node walk can never match. `toString()` counts only
 * rendered text, so a gap's <input> sitting inside the run contributes nothing.
 */
function textLengthTo(seg: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(seg);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0;
  }
  return range.toString().length;
}

/** The live selection, expressed as one span per run it covers. */
function spansOfSelection(container: HTMLElement): { spans: Span[]; x: number; y: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  // A run can be drawn as several segments — "Cost: $[[3]] per person" is two —
  // so the covered part of each is folded back into one span per run.
  const found = new Map<string, { start: number; end: number }>();
  for (const seg of container.querySelectorAll<HTMLElement>("[data-annot-seg]")) {
    if (!range.intersectsNode(seg)) continue;
    const run = seg.dataset.annotRun;
    if (!run) continue;
    const base = Number(seg.dataset.annotBase ?? "0");
    const length = seg.textContent?.length ?? 0;
    const from = seg.contains(range.startContainer)
      ? textLengthTo(seg, range.startContainer, range.startOffset)
      : 0;
    const to = seg.contains(range.endContainer)
      ? textLengthTo(seg, range.endContainer, range.endOffset)
      : length;
    // Touching a boundary counts as intersecting; nothing was actually covered.
    if (to <= from) continue;
    const prev = found.get(run);
    found.set(run, {
      start: Math.min(prev?.start ?? Number.POSITIVE_INFINITY, base + from),
      end: Math.max(prev?.end ?? Number.NEGATIVE_INFINITY, base + to),
    });
  }
  if (found.size === 0) return null;

  const rect = range.getBoundingClientRect();
  return {
    spans: [...found].map(([run, s]) => ({ run, ...s })),
    x: rect.left + rect.width / 2,
    y: rect.top,
  };
}

/** True for anywhere the candidate is writing their own answer. */
function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el?.closest?.("input, textarea, [contenteditable=true]"));
}

/**
 * Whether a press landed ON the selection — which is what makes it the start of
 * a drag rather than the start of a new selection.
 *
 * Measured against the selection's own client rectangles, one per line it
 * covers, because a selection is a shape and not a box: hit-testing its bounding
 * rectangle would claim the empty space to the right of a short last line, and
 * pressing there would refuse to start a fresh selection.
 */
function pressedOnSelection(x: number, y: number): boolean {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;
  for (const r of sel.getRangeAt(0).getClientRects()) {
    if (x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * The layer
 * ------------------------------------------------------------------ */

type Menu =
  | { kind: "selection"; spans: Span[]; x: number; y: number }
  | { kind: "mark"; run: string; index: number; x: number; y: number };

type AnnotationApi = {
  spansFor: (run: string) => Annotation[];
  openMark: (run: string, index: number, rect: DOMRect) => void;
};

const AnnotationContext = createContext<AnnotationApi | null>(null);

export function AnnotationProvider({
  id,
  scope,
  slot = "all",
  enabled = true,
  phrases = false,
  children,
}: {
  /** Identity of the screen — what the annotations are filed under (the part). */
  id?: string;
  /** Which attempt these belong to: one mock sitting, or one practice attempt. */
  scope?: string;
  /** Which pane of the exam layout this tree is. See `storageKey`. */
  slot?: string;
  /** Off once the paper is graded: the marks are then history, not a tool. */
  enabled?: boolean;
  /**
   * READING ONLY. Lets a phrase move out of the text and into an answer box —
   * by Ctrl+C / Ctrl+V, which is what the real computer-delivered test gives,
   * and by dragging it there. Both are meaningless on the other papers: a
   * Listening answer comes out of the recording, so the only words on screen to
   * copy are the question's own.
   */
  phrases?: boolean;
  children: React.ReactNode;
}) {
  const on = Boolean(enabled && id && scope);
  /** Both routes stop dead once the paper is graded, like the highlighter. */
  const lift = phrases && on;
  const ref = useRef<HTMLDivElement | null>(null);
  const [sheet, setSheet] = useState<Sheet>({});
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  // After mount, never during render: the server has no sessionStorage.
  useEffect(() => {
    setSheet(on && id && scope ? load(scope, id, slot) : {});
    setMenu(null);
    setNoteDraft(null);
  }, [id, scope, slot, on]);

  const commit = useCallback(
    (next: Sheet) => {
      setSheet(next);
      if (id && scope) save(scope, id, slot, next);
    },
    [id, scope, slot],
  );

  const spansFor = useCallback((run: string) => sheet[run] ?? EMPTY, [sheet]);

  const openMark = useCallback((run: string, index: number, rect: DOMRect) => {
    setMenu({ kind: "mark", run, index, x: rect.left + rect.width / 2, y: rect.top });
    setNoteDraft(null);
  }, []);

  const api = useMemo<AnnotationApi>(() => ({ spansFor, openMark }), [spansFor, openMark]);

  const openSelectionMenu = useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const hit = spansOfSelection(root);
    if (!hit) return;
    setMenu({ kind: "selection", ...hit });
    setNoteDraft(null);
  }, []);

  // Dismiss on anything that isn't the menu itself.
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-annot-menu]")) return;
      setMenu(null);
      setNoteDraft(null);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", close);
    // Capture phase: the panes scroll independently, and a menu pinned to
    // viewport coordinates would otherwise drift away from its own text.
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const count = useMemo(
    () => Object.values(sheet).reduce((n, list) => n + list.length, 0),
    [sheet],
  );

  const active = menu?.kind === "mark" ? (sheet[menu.run] ?? EMPTY)[menu.index] : undefined;

  const closeMenu = () => {
    setMenu(null);
    setNoteDraft(null);
  };

  const saveNote = () => {
    if (!menu) return;
    const note = noteDraft?.trim() ?? "";
    if (menu.kind === "selection") {
      // One gesture, one note: every run the selection crossed carries it, so
      // the glyph is wherever the candidate looks for it.
      commit(applySpans(sheet, menu.spans, note || undefined));
    } else if (active) {
      commit({
        ...sheet,
        [menu.run]: (sheet[menu.run] ?? []).map((a) =>
          a === active ? { start: a.start, end: a.end, ...(note ? { note } : {}) } : a,
        ),
      });
    }
    window.getSelection()?.removeAllRanges();
    closeMenu();
  };

  if (!on) return <>{children}</>;

  return (
    <AnnotationContext.Provider value={api}>
      {/* `contents`, not a box: this wraps whole panes whose height chains (a
          full-height Writing editor, a scrolling passage column) run straight
          through it, and an extra layout box would break them. Events still
          bubble to it and DOM queries still see it. */}
      <div
        ref={ref}
        className="contents"
        // Selection is REQUIRED for highlighting, so it stays on — but copying
        // is refused. Never inside a field: cut and paste in the answer box is
        // the candidate's own writing, which the real test allows. And never on
        // a Reading paper, where copying the passage IS one of the tools the
        // real test hands out — see `phrases` above.
        onCopy={(e) => {
          if (!lift && !isEditable(e.target)) e.preventDefault();
        }}
        onCut={(e) => {
          if (!isEditable(e.target)) e.preventDefault();
        }}
        // A press on the selection is a phrase being picked up, not a click:
        // the default is refused so the browser neither collapses the selection
        // nor starts a drag of its own, and the gesture becomes ours. Refusing
        // it also leaves the selection standing after the drop, so the same
        // phrase can be dropped into a second gap without re-selecting it.
        onMouseDown={(e) => {
          if (!lift || e.button !== 0 || !hasAnswerTargets()) return;
          const el = e.target as HTMLElement | null;
          // Two exemptions. A field the candidate is writing in, where a press
          // places their caret. And anything explicitly draggable — the
          // matching board and the option bank move their lettered cards with
          // the browser's own drag, which refusing this default would kill.
          if (isEditable(el) || el?.closest?.("[draggable=true]")) return;
          if (!pressedOnSelection(e.clientX, e.clientY)) return;
          const text = tidyPhrase(window.getSelection()?.toString() ?? "");
          if (!text) return;
          e.preventDefault();
          armPhraseDrag(text, e.clientX, e.clientY);
        }}
        onMouseUp={(e) => {
          if (isEditable(e.target)) return;
          // A drop ends in a mouse-up like any other gesture. Without this the
          // highlight menu would open over the box just answered.
          if (phraseDragJustEnded()) return;
          openSelectionMenu();
        }}
        onContextMenu={(e) => {
          // Right-click IS the gesture in the real test. Ours replaces the
          // browser menu rather than adding to it, so copy stays out of reach.
          if (isEditable(e.target)) return;
          e.preventDefault();
          openSelectionMenu();
        }}
      >
        {/* Tells the answer fields in this tree that they may take a dropped
            phrase. It has to be a context and not another module-level flag,
            because "is this Reading" is a property of the tree, not of the
            page — and the two panes are two trees. */}
        <PhraseDragScope on={lift}>{children}</PhraseDragScope>
        {count > 0 && (
          <button
            type="button"
            onClick={() => commit({})}
            className="mt-2 inline-flex items-center gap-1.5 self-start text-[11px] font-medium text-ink-muted transition-colors hover:text-danger"
          >
            <Trash2 className="size-3" /> Clear all {count} highlight{count === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {menu && (
        <div
          data-annot-menu
          // Fixed to the viewport because the pane it sits in scrolls on its own;
          // an absolutely-positioned menu would scroll away from its own text.
          // `margin: 0` because a `space-y-*` parent would otherwise nudge it.
          style={{ left: menu.x, top: menu.y, margin: 0 }}
          className="fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-line bg-paper-elev p-1 shadow-[var(--shadow-md)]"
        >
          {noteDraft !== null ? (
            <div className="w-60 p-1.5">
              <textarea
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Your note…"
                spellCheck={false}
                rows={3}
                className="w-full resize-none rounded-md border border-line bg-paper px-2 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
              />
              <div className="mt-1.5 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={closeMenu}
                  className="rounded px-2 py-1 text-[11px] font-semibold text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  className="rounded bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                >
                  Save note
                </button>
              </div>
            </div>
          ) : menu.kind === "selection" ? (
            <div className="flex items-center gap-0.5">
              <MenuButton
                icon={<Highlighter className="size-3.5" />}
                label="Highlight"
                onClick={() => {
                  commit(applySpans(sheet, menu.spans));
                  window.getSelection()?.removeAllRanges();
                  closeMenu();
                }}
              />
              <MenuButton
                icon={<StickyNote className="size-3.5" />}
                label="Note"
                onClick={() => setNoteDraft("")}
              />
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <MenuButton
                icon={<StickyNote className="size-3.5" />}
                label={active?.note ? "Edit note" : "Add note"}
                onClick={() => setNoteDraft(active?.note ?? "")}
              />
              <MenuButton
                icon={<Trash2 className="size-3.5" />}
                label="Remove"
                onClick={() => {
                  const rest = (sheet[menu.run] ?? []).filter((a) => a !== active);
                  const next = { ...sheet };
                  if (rest.length > 0) next[menu.run] = rest;
                  else delete next[menu.run];
                  commit(next);
                  closeMenu();
                }}
              />
              <MenuButton icon={<X className="size-3.5" />} label="" onClick={closeMenu} />
            </div>
          )}

          {/* The note itself, when one is attached and we are not editing it. */}
          {noteDraft === null && menu.kind === "mark" && active?.note && (
            <p className="max-w-60 whitespace-pre-line border-t border-line px-2 py-1.5 text-[11px] leading-snug text-ink-soft">
              {active.note}
            </p>
          )}
        </div>
      )}
    </AnnotationContext.Provider>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || "Close"}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * The leaf every renderer reaches for
 * ------------------------------------------------------------------ */

type Piece = {
  text: string;
  annotation?: Annotation;
  index?: number;
  /** This piece holds the END of the mark — where the note glyph belongs. */
  tail?: boolean;
};

/** Split one segment of a run's text into plain and marked pieces. */
function slicePieces(text: string, base: number, list: Annotation[]): Piece[] {
  const out: Piece[] = [];
  const length = text.length;
  let cursor = 0;
  list.forEach((a, i) => {
    const start = Math.max(cursor, Math.min(a.start - base, length));
    const end = Math.max(start, Math.min(a.end - base, length));
    if (start > cursor) out.push({ text: text.slice(cursor, start) });
    if (end > start) {
      // A mark running across a gap is drawn as one <mark> either side of the
      // input, so the glyph goes on whichever piece the mark actually ends in —
      // otherwise one note would show two of them.
      out.push({ text: text.slice(start, end), annotation: a, index: i, tail: base + end >= a.end });
    }
    cursor = Math.max(cursor, end);
  });
  if (cursor < length) out.push({ text: text.slice(cursor) });
  return out;
}

/**
 * One stretch of authored text, highlightable.
 *
 * Outside a provider — a graded paper, or a surface with no attempt scope — it
 * renders the plain string and costs nothing, so callers never have to ask
 * whether the highlighter is on.
 *
 * `base` exists because a run can be drawn in pieces: a note line reading
 * "Cost: $[[3]] per person" is two calls into the same run, and the second one
 * starts at character 7 of it. Offsets are into the run, not the piece.
 */
export function AnnotatedText({
  run,
  text,
  base = 0,
}: {
  /** The run these offsets belong to. Omitted, the text is drawn as-is. */
  run?: string;
  text: string;
  base?: number;
}) {
  const api = useContext(AnnotationContext);
  if (!api || !run || !text) return <>{text}</>;

  const pieces = slicePieces(text, base, api.spansFor(run));

  return (
    <span data-annot-seg data-annot-run={run} data-annot-base={base}>
      {pieces.map((piece, i) =>
        piece.annotation ? (
          <mark
            key={i}
            onClick={(e) => {
              // preventDefault, not just stopPropagation: an option's text sits
              // inside its <label>, and a click there activates the radio no
              // matter who handled the event. Opening a note must not answer
              // the question underneath it.
              e.preventDefault();
              e.stopPropagation();
              api.openMark(run, piece.index!, e.currentTarget.getBoundingClientRect());
            }}
            title={piece.annotation.note || "Highlighted"}
            className="cursor-pointer rounded-[2px] bg-marker px-[1px] text-marker-ink"
          >
            {piece.text}
            {piece.annotation.note && piece.tail && (
              // A NOTE IS A THING, NOT A TEXT DECORATION. This was a dotted
              // underline, which reads as emphasis or a spelling error and
              // disappears entirely on a line that wraps. A note glyph says
              // something is attached, and says where to click to read it.
              <StickyNote
                aria-hidden
                className="mx-0.5 inline-block size-3.5 align-[-0.2em] text-marker-ink"
              />
            )}
          </mark>
        ) : (
          <span key={i}>{piece.text}</span>
        ),
      )}
    </span>
  );
}
