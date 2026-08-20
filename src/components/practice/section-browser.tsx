"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBooks, getParts, getSources } from "@/app/actions/section-browser";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Layers,
  Library,
  Loader2,
  Mic,
  PenLine,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, SECTIONS, SECTION_ORDER, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";

/* ------------------------------------------------------------------ *
 * Types — mirror the summary APIs exactly
 * ------------------------------------------------------------------ */

type SourceSummary = {
  source: string;
  label: string;
  tests: number;
  parts: number;
  sections: SectionKey[];
};

/** 3 across, 5 down. */
const BOOKS_PER_PAGE = 15;

type BookSummary = {
  key: string;
  book: string;
  testNumber: number | null;
  label: string;
  parts: number;
  questions: number;
  sections: SectionKey[];
};

type PartSummary = {
  id: string;
  sectionType: SectionKey;
  partNumber: number | null;
  title: string;
  questionTypes: string[];
  totalQuestions: number;
  startNumber: number;
  endNumber: number;
  estimatedMinutes: number | null;
  hasAudio: boolean;
};

const SECTION_ICON: Record<SectionKey, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

const ACCENT_ICON_BG: Record<SectionKey, string> = {
  listening: "bg-section-listening-soft text-section-listening",
  reading: "bg-section-reading-soft text-section-reading",
  writing: "bg-section-writing-soft text-section-writing",
  speaking: "bg-section-speaking-soft text-section-speaking",
};

/* ------------------------------------------------------------------ *
 * Browser
 *
 * A three-step drill-down — source → book+test → part — where each step is one
 * small fetch. Nothing loads until it is asked for, so opening the page costs
 * a list of collection names rather than every transcript in the library.
 * ------------------------------------------------------------------ */

export function SectionBrowser() {
  const router = useRouter();

  const [section, setSection] = useState<SectionKey | null>(null);
  const [sources, setSources] = useState<SourceSummary[] | null>(null);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookPage, setBookPage] = useState(1);

  const [picker, setPicker] = useState<{ book: BookSummary; parts: PartSummary[] | null } | null>(
    null,
  );


  /* -- Step 1: sources. Reloaded when the section filter changes, because a
        source with only listening material must disappear under "Writing". -- */
  useEffect(() => {
    let alive = true;
    setSources(null);
    getSources(section)
      .then((d) => alive && setSources(d))
      .catch(() => alive && setSources([]));
    return () => {
      alive = false;
    };
  }, [section]);

  /* -- Step 2: books under the open source. -- */
  useEffect(() => {
    if (!openSource) {
      setBooks(null);
      return;
    }
    let alive = true;
    setBooksLoading(true);
    // A different source or filter is a different list; page 3 of the old one
    // would open on nothing.
    setBookPage(1);
    getBooks(openSource, section)
      .then((d) => alive && setBooks(d))
      .catch(() => alive && setBooks([]))
      .finally(() => alive && setBooksLoading(false));
    return () => {
      alive = false;
    };
  }, [openSource, section]);

  /* -- Step 3: parts for the picked test, loaded when the dialog opens. -- */
  const openPicker = async (book: BookSummary) => {
    setPicker({ book, parts: null });
    try {
      const parts = await getParts(book.book, book.testNumber, section);
      setPicker((cur) => (cur && cur.book.key === book.key ? { ...cur, parts } : cur));
    } catch {
      setPicker((cur) => (cur && cur.book.key === book.key ? { ...cur, parts: [] } : cur));
    }
  };

  const empty = sources !== null && sources.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Section filter ── */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={section === null} onClick={() => setSection(null)}>
          All sections
        </FilterChip>
        {SECTION_ORDER.map((key) => {
          const Icon = SECTION_ICON[key];
          return (
            <FilterChip key={key} active={section === key} onClick={() => setSection(key)}>
              <Icon className="size-3.5" />
              {SECTIONS[key].label}
            </FilterChip>
          );
        })}
      </div>

      {/* ── Sources ── */}
      {sources === null ? (
        <SkeletonRow />
      ) : empty ? (
        <div className="rounded-xl border border-dashed border-line bg-paper-elev px-6 py-10 text-center">
          <Library className="mx-auto size-6 text-ink-muted" />
          <p className="mt-3 text-sm font-medium text-ink-strong">
            No material for this filter yet
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {section
              ? `No ${SECTIONS[section].label.toLowerCase()} parts have been imported.`
              : "Import a test to see it here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((src) => {
            const isOpen = openSource === src.source;
            return (
              <div
                key={src.source}
                className={cn(
                  "overflow-hidden rounded-xl border bg-paper-elev transition-colors",
                  isOpen ? "border-brand/50" : "border-line hover:border-brand/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenSource(isOpen ? null : src.source)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Library className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-semibold text-ink-strong">
                      {src.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-muted">
                      {src.tests} test{src.tests === 1 ? "" : "s"} · {src.parts} part
                      {src.parts === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 sm:flex">
                    {src.sections.map((s) => {
                      const Icon = SECTION_ICON[s];
                      return (
                        <span
                          key={s}
                          title={SECTIONS[s].label}
                          className={cn("grid size-7 place-items-center rounded-lg", ACCENT_ICON_BG[s])}
                        >
                          <Icon className="size-3.5" />
                        </span>
                      );
                    })}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-5 shrink-0 text-ink-muted transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                </button>

                {/* ── Books, flat: one row per test ── */}
                {isOpen && (
                  <div className="border-t border-line bg-paper-sunken/40 px-3 py-3">
                    {booksLoading || books === null ? (
                      <div className="flex items-center gap-2 px-2 py-4 text-sm text-ink-muted">
                        <Loader2 className="size-4 animate-spin" /> Loading books…
                      </div>
                    ) : books.length === 0 ? (
                      <p className="px-2 py-4 text-sm text-ink-muted">Nothing here for this filter.</p>
                    ) : (
                      (() => {
                        // 3 across, 5 down. A source is 40-odd tests, and a
                        // wall of them is harder to scan than three pages of
                        // fifteen — the grid stays a fixed shape so the pager
                        // below never moves under the cursor.
                        const pages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
                        const page = Math.min(bookPage, pages);
                        const start = (page - 1) * BOOKS_PER_PAGE;
                        const shown = books.slice(start, start + BOOKS_PER_PAGE);

                        return (
                          <div className="space-y-3">
                            <div className="grid overflow-hidden rounded-lg border border-line bg-paper-elev sm:grid-cols-2 xl:grid-cols-3">
                              {shown.map((book) => (
                                <button
                                  key={book.key}
                                  type="button"
                                  onClick={() => openPicker(book)}
                                  className="group flex items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-brand-soft/40 sm:border-r"
                                >
                                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper-sunken text-ink-muted transition-colors group-hover:bg-brand-soft group-hover:text-brand">
                                    <BookOpen className="size-4" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink-strong">
                                      {book.label}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-ink-muted">
                                      {book.parts} part{book.parts === 1 ? "" : "s"} ·{" "}
                                      {book.questions} questions
                                    </span>
                                  </span>
                                  <ArrowRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                                </button>
                              ))}
                            </div>

                            {pages > 1 && (
                              <Pager
                                page={page}
                                pages={pages}
                                onChange={setBookPage}
                                total={books.length}
                                from={start + 1}
                                to={start + shown.length}
                              />
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {picker && (
        <PartPicker
          book={picker.book}
          parts={picker.parts}
          onClose={() => setPicker(null)}
          onPick={(id) => router.push(`/section-practice/${id}`)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Part picker dialog
 * ------------------------------------------------------------------ */

function PartPicker({
  book,
  parts,
  onClose,
  onPick,
}: {
  book: BookSummary;
  parts: PartSummary[] | null;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Escape closes, and focus moves into the dialog so keyboard users are not
  // left behind on the trigger button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a part from ${book.label}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-2xl border border-line bg-paper-elev shadow-[var(--shadow-lg)] outline-none sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Choose a part
            </p>
            <h2 className="display mt-0.5 truncate text-xl">{book.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-3 py-3">
          {parts === null ? (
            <div className="flex items-center gap-2 px-3 py-8 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> Loading parts…
            </div>
          ) : parts.length === 0 ? (
            <p className="px-3 py-8 text-sm text-ink-muted">No parts available.</p>
          ) : (
            <ul className="space-y-2">
              {parts.map((part) => {
                const sec = SECTIONS[part.sectionType];
                const Icon = SECTION_ICON[part.sectionType];
                return (
                  <li key={part.id}>
                    <button
                      type="button"
                      onClick={() => onPick(part.id)}
                      className="group flex w-full items-start gap-4 rounded-xl border border-line bg-paper-elev p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[var(--shadow-md)]"
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl",
                          ACCENT_ICON_BG[part.sectionType],
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-semibold text-ink-strong">
                            {sec.label}
                            {part.partNumber ? ` · Part ${part.partNumber}` : ""}
                          </span>
                          <span className={`chip chip-${sec.accent}`}>
                            Q{part.startNumber}–{part.endNumber}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-sm text-ink-muted">
                          {part.title}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          {part.questionTypes.map((t) => (
                            <span key={t} className="chip text-[10px]">
                              {QUESTION_TYPES[t as QuestionTypeKey]?.label ?? t}
                            </span>
                          ))}
                          {part.hasAudio && (
                            <span className="chip text-[10px]">
                              <Headphones className="size-3" /> Audio
                            </span>
                          )}
                          {part.estimatedMinutes && (
                            <span className="chip text-[10px]">
                              <Clock className="size-3" /> ~{part.estimatedMinutes} min
                            </span>
                          )}
                          <span className="chip text-[10px]">
                            <Layers className="size-3" /> {part.totalQuestions} marks
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Bits
 * ------------------------------------------------------------------ */

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-transparent bg-brand text-white shadow-sm"
          : "border-line bg-paper-elev text-ink-soft hover:border-brand/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-[76px] animate-pulse rounded-xl border border-line bg-paper-sunken/50"
        />
      ))}
    </div>
  );
}


/* ------------------------------------------------------------------ *
 * Pager
 * ------------------------------------------------------------------ */

/**
 * Compact page control for a list that is already in memory.
 *
 * A source is 40-odd tests, small enough to fetch in one go, so paging is a
 * slice rather than another round trip — pages change instantly and nothing
 * re-loads. Long runs collapse to a window around the current page so the
 * control keeps its size whether there are three pages or thirty.
 */
function Pager({
  page,
  pages,
  onChange,
  total,
  from,
  to,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  total: number;
  from: number;
  to: number;
}) {
  const visible: number[] = [];
  const first = Math.max(1, Math.min(page - 2, pages - 4));
  for (let n = first; n <= Math.min(pages, first + 4); n++) visible.push(n);

  const arrow =
    "grid size-7 place-items-center rounded-md border border-line bg-paper-elev text-ink-muted transition-colors enabled:hover:border-brand/50 enabled:hover:text-brand disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs tabular-nums text-ink-muted">
        {from}–{to} of {total}
      </p>

      <nav aria-label="Book list pages" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={arrow}
        >
          <ChevronLeft className="size-3.5" />
        </button>

        {visible.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            className={cn(
              "grid size-7 place-items-center rounded-md border font-mono text-[11px] font-semibold tabular-nums transition-colors",
              n === page
                ? "border-brand bg-brand text-white"
                : "border-line bg-paper-elev text-ink-soft hover:border-brand/50 hover:text-brand",
            )}
          >
            {n}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className={arrow}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </nav>
    </div>
  );
}
