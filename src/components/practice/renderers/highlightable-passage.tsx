"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Highlighter, StickyNote, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The reading passage, with the highlighter and notes the real test provides.
 *
 * WHY IT EARNS ITS PLACE. Computer-delivered IELTS gives candidates a right-click
 * menu on the passage — Highlight, Add note, Clear — and in Reading it is the
 * most-used tool on the screen. Locating information is the whole task, and the
 * technique every course teaches is to mark the sentence you found and move on.
 * Without it, a candidate practising here rehearses a strategy the real paper
 * lets them use and ours did not.
 *
 * OFFSETS, NOT DOM RANGES. An annotation is stored as a character span into the
 * passage string, and the passage is re-rendered by splitting on those spans.
 * Serialising DOM ranges instead would break the moment the text re-renders —
 * which it does on every keystroke elsewhere in the pane — and could not be
 * persisted at all. Offsets are stable, comparable and trivially storable.
 *
 * COPY PROTECTION SURVIVES. The passage used to set `select-none`, which made
 * highlighting impossible, so selection is now allowed — but `onCopy` is still
 * blocked and the browser context menu is still suppressed (we replace it with
 * our own). Selecting text to mark it never yields a copy.
 */

export type Annotation = {
  /** Character offsets into the passage text; `end` is exclusive. */
  start: number;
  end: number;
  /** Present when the candidate attached a note to the mark. */
  note?: string;
};

/**
 * Where a passage's annotations are filed.
 *
 * THE SCOPE IS NOT DECORATION. A mock's Reading passage and the section-practice
 * part it was built from are the SAME `practice_sections` row, so keying by the
 * passage alone meant highlights made while practising reappeared, already
 * drawn, on that passage inside a timed mock — a candidate sitting the exam with
 * last week's findings marked on the page. The scope is what keeps one attempt's
 * working notes to that attempt.
 */
function storageKey(scope: string, id: string) {
  return `${PREFIX}${scope}:${id}`;
}

const PREFIX = "ielts:annot:";

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

function load(scope: string, id: string): Annotation[] {
  try {
    const raw = store()?.getItem(storageKey(scope, id));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Annotation =>
        a && typeof a.start === "number" && typeof a.end === "number" && a.end > a.start,
    );
  } catch {
    // Blocked site data, or something else's key. Either way: no annotations.
    return [];
  }
}

function save(scope: string, id: string, list: Annotation[]) {
  try {
    store()?.setItem(storageKey(scope, id), JSON.stringify(list));
  } catch {
    // Losing them on reload is bad; refusing to draw them now is worse.
  }
}

/**
 * Merge a new span into the list, absorbing anything it touches.
 *
 * Overlapping `<mark>`s would otherwise stack into nested spans that get darker
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

/** Character offset of a point in the DOM, relative to the passage container. */
function offsetOf(root: HTMLElement, node: Node, offset: number): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  // The selection ran outside the passage (into the questions, say).
  return null;
}

type Menu =
  | { kind: "selection"; start: number; end: number; x: number; y: number }
  | { kind: "mark"; index: number; x: number; y: number };

export function HighlightablePassage({
  id,
  scope,
  text,
  className,
}: {
  /** Identity of the passage — what the annotations are filed under. */
  id: string;
  /**
   * Which attempt these belong to: one mock sitting, or one practice attempt.
   * See `storageKey` — without it, practice and the mock share a passage's marks.
   */
  scope: string;
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  // After mount, never during render: the server has no sessionStorage.
  useEffect(() => {
    setAnnotations(load(scope, id));
    setMenu(null);
    setNoteDraft(null);
  }, [id, scope]);

  const commit = useCallback(
    (next: Annotation[]) => {
      setAnnotations(next);
      save(scope, id, next);
    },
    [id, scope],
  );

  /** Read the live selection, if it lies inside this passage. */
  const readSelection = useCallback(() => {
    const root = ref.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return null;

    const start = offsetOf(root, range.startContainer, range.startOffset);
    const end = offsetOf(root, range.endContainer, range.endOffset);
    if (start === null || end === null || start === end) return null;

    const rect = range.getBoundingClientRect();
    return {
      start: Math.min(start, end),
      end: Math.max(start, end),
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
  }, []);

  const openSelectionMenu = useCallback(() => {
    const sel = readSelection();
    if (!sel) return false;
    setMenu({ kind: "selection", ...sel });
    setNoteDraft(null);
    return true;
  }, [readSelection]);

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
    // Capture phase: the passage pane scrolls independently, and a menu pinned
    // to viewport coordinates would otherwise drift away from its text.
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  /** The passage split into plain runs and annotated runs, in order. */
  const pieces = useMemo(() => {
    const sorted = [...annotations].sort((a, b) => a.start - b.start);
    const out: { text: string; annotation?: Annotation; index?: number }[] = [];
    let cursor = 0;
    sorted.forEach((a, i) => {
      const start = Math.max(cursor, Math.min(a.start, text.length));
      const end = Math.max(start, Math.min(a.end, text.length));
      if (start > cursor) out.push({ text: text.slice(cursor, start) });
      if (end > start) out.push({ text: text.slice(start, end), annotation: a, index: i });
      cursor = Math.max(cursor, end);
    });
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }, [annotations, text]);

  const active =
    menu?.kind === "mark" ? [...annotations].sort((a, b) => a.start - b.start)[menu.index] : null;

  return (
    <div className="relative">
      <article
        ref={ref}
        // Selection is REQUIRED for highlighting, so `select-none` is gone — but
        // copying is still refused and the browser's own menu still suppressed.
        className={cn(
          "whitespace-pre-line rounded-xl border border-line bg-paper-elev p-5 text-sm leading-relaxed text-ink-soft",
          className,
        )}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onMouseUp={() => openSelectionMenu()}
        onContextMenu={(e) => {
          // Right-click IS the gesture in the real test. Ours replaces the
          // browser menu rather than adding to it, so copy stays out of reach.
          e.preventDefault();
          openSelectionMenu();
        }}
      >
        {pieces.map((piece, i) =>
          piece.annotation ? (
            <mark
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setMenu({
                  kind: "mark",
                  index: piece.index!,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                });
                setNoteDraft(null);
              }}
              title={piece.annotation.note || "Highlighted"}
              className={cn(
                "cursor-pointer rounded-[2px] bg-warning-soft text-ink decoration-warning/60",
                piece.annotation.note && "underline decoration-dotted underline-offset-2",
              )}
            >
              {piece.text}
            </mark>
          ) : (
            <span key={i}>{piece.text}</span>
          ),
        )}
      </article>

      {annotations.length > 0 && (
        <button
          type="button"
          onClick={() => commit([])}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:text-danger"
        >
          <Trash2 className="size-3" /> Clear all {annotations.length} highlight
          {annotations.length === 1 ? "" : "s"}
        </button>
      )}

      {menu && (
        <div
          data-annot-menu
          // Fixed to the viewport because the pane it sits in scrolls on its own;
          // an absolutely-positioned menu would scroll away from its own text.
          style={{ left: menu.x, top: menu.y }}
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
                  onClick={() => {
                    setNoteDraft(null);
                    setMenu(null);
                  }}
                  className="rounded px-2 py-1 text-[11px] font-semibold text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const note = noteDraft.trim();
                    if (menu.kind === "selection") {
                      commit(
                        mergeSpan(annotations, {
                          start: menu.start,
                          end: menu.end,
                          ...(note ? { note } : {}),
                        }),
                      );
                    } else if (active) {
                      commit(
                        annotations.map((a) =>
                          a === active ? { ...a, ...(note ? { note } : { note: undefined }) } : a,
                        ),
                      );
                    }
                    window.getSelection()?.removeAllRanges();
                    setNoteDraft(null);
                    setMenu(null);
                  }}
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
                  commit(mergeSpan(annotations, { start: menu.start, end: menu.end }));
                  window.getSelection()?.removeAllRanges();
                  setMenu(null);
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
                  commit(annotations.filter((a) => a !== active));
                  setMenu(null);
                }}
              />
              <MenuButton
                icon={<X className="size-3.5" />}
                label=""
                onClick={() => setMenu(null)}
              />
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
    </div>
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
