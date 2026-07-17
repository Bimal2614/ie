"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Loader2, GraduationCap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTIONS, type SectionKey } from "@/lib/ielts";
import type { Answer } from "@/lib/question-content";
import { SetBody, type PlayerSet, type PlayerQuestion } from "@/components/practice/set-body";
import { finishMock, advanceMockSection, saveMockProgress } from "@/app/actions/mock";

export type MockSection = {
  section: SectionKey;
  set: PlayerSet;
  questions: PlayerQuestion[];
  /** Exam numbers of this section's questions, in order — drives the palette. */
  numbers: number[];
};

type Props = {
  sessionId: string;
  sections: MockSection[];
  initialIndex: number;
  initialRemaining: number;
  initialAnswers: Record<string, Answer>;
  initialTimings: Record<string, number>;
};

const AUTOSAVE_MS = 5000;

/**
 * Full-mock player — a timed, resumable, section-by-section exam environment.
 *
 * Fidelity to the real computer-delivered IELTS:
 *  - one section on screen at a time, its own clock, no returning once you move on;
 *  - the clock is server-authoritative (seeded from the session's stored
 *    deadline) — closing the tab does not pause it, and it can't be extended by
 *    tampering with the client;
 *  - a question-navigation palette shows answered vs unanswered and jumps to any
 *    question, exactly like the real paper's number strip;
 *  - work autosaves, so a reload or a return resumes mid-section.
 */
export function MockPlayer({
  sessionId,
  sections,
  initialIndex,
  initialRemaining,
  initialAnswers,
  initialTimings,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [advancing, setAdvancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const current = sections[index];
  const isLast = index === sections.length - 1;

  // --- Per-question timing: attribute the think-time before an answer to that
  // question. Cheap and honest, and survives resume via draftTimings. ---
  const timings = useRef<Record<string, number>>({ ...initialTimings });
  const lastTick = useRef(Date.now());

  const setAnswer = useCallback((qid: string, value: Answer) => {
    const now = Date.now();
    const delta = Math.round((now - lastTick.current) / 1000);
    if (delta > 0 && delta < 3600) timings.current[qid] = (timings.current[qid] ?? 0) + delta;
    lastTick.current = now;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  // Latest state without re-subscribing effects on every keystroke.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const finished = useRef(false);

  const submit = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    await finishMock(sessionId, answersRef.current, timings.current);
    // finishMock redirects to /results/[id]; spinner stays up until navigation.
  }, [sessionId]);

  const advance = useCallback(async () => {
    if (finished.current || advancing) return;
    if (isLast) {
      void submit();
      return;
    }
    setAdvancing(true);
    const next = index + 1;
    // The server sets the next section's deadline — the client only reflects it.
    const res = await advanceMockSection(sessionId, next, answersRef.current, timings.current);
    setIndex(next);
    setRemaining(res?.remainingSeconds ?? SECTIONS[sections[next].section].durationMin * 60);
    lastTick.current = Date.now();
    setAdvancing(false);
    window.scrollTo({ top: 0 });
  }, [advancing, isLast, index, sessionId, sections, submit]);

  // Countdown. On zero the section's time is up → advance / submit.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(t);
          void advanceRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [index]);

  // Autosave: on a timer, and whenever the tab is hidden (a likely "leaving").
  useEffect(() => {
    const save = () => {
      if (finished.current) return;
      void saveMockProgress(sessionId, answersRef.current, timings.current);
    };
    const iv = setInterval(save, AUTOSAVE_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [sessionId]);

  const jumpTo = useCallback((number: number) => {
    document.getElementById(`mq-${number}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  if (!current) {
    return (
      <div className="grid min-h-svh place-items-center bg-paper text-sm text-ink-muted">
        This mock has no questions.
      </div>
    );
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const timerState = remaining < 60 ? "critical" : remaining < 300 ? "warning" : "ok";
  const answeredHere = current.numbers.filter((_, i) => answers[current.questions[i]?.id] !== undefined).length;

  return (
    <div className="flex min-h-svh flex-col bg-paper">
      {/* Exam header — brand, section, answered count, timer */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-paper-elev/95 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 shrink-0 text-brand" />
          <span className="truncate" style={{ fontFamily: "var(--font-heading)" }}>
            IELTSAce
          </span>
          <span className="chip ml-1 hidden sm:inline-flex">Full Mock</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-muted sm:inline">
            {answeredHere}/{current.questions.length} answered
          </span>
          <span
            className="exam-timer flex items-center gap-1.5 text-lg tabular-nums"
            data-state={timerState}
            aria-label={`${mm} minutes ${ss} seconds remaining`}
          >
            <Clock className="h-4 w-4" /> {mm}:{ss}
          </span>
        </div>
      </header>

      {/* Section progress rail — no navigation; a finished section can't be reopened */}
      <nav className="flex items-center gap-2 overflow-x-auto border-b border-line bg-paper-elev/60 px-4 py-2">
        {sections.map((s, i) => {
          const sec = SECTIONS[s.section];
          const done = i < index;
          const here = i === index;
          return (
            <span
              key={s.section}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium",
                here && "border-brand bg-brand-soft text-brand",
                done && "border-success/40 bg-success-soft text-success",
                !here && !done && "border-line text-ink-muted",
              )}
            >
              {done && <Check className="size-3" />}
              {sec.label}
            </span>
          );
        })}
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-4">
          <h2 className="display text-xl">{SECTIONS[current.section].label}</h2>
          <p className="text-sm text-ink-muted">
            {SECTIONS[current.section].durationMin} minutes · {current.questions.length} question
            {current.questions.length !== 1 ? "s" : ""} · you can&apos;t return to this section once
            you move on
          </p>
        </div>

        <SetBody
          key={current.section}
          set={current.set}
          questions={current.questions}
          answers={answers}
          results={null}
          onAnswer={setAnswer}
        />
      </main>

      {/* Question palette — the IELTS number strip: answered vs not, jump to any */}
      <div className="sticky bottom-[3.25rem] z-20 border-t border-line bg-paper-elev/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Questions
          </span>
          {current.numbers.map((n, i) => {
            const answered = answers[current.questions[i]?.id] !== undefined;
            return (
              <button
                key={n}
                type="button"
                onClick={() => jumpTo(n)}
                aria-label={`Go to question ${n}${answered ? ", answered" : ""}`}
                className={cn(
                  "grid size-7 place-items-center rounded border font-mono text-[11px] tabular-nums transition-colors",
                  answered
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-paper text-ink-soft hover:bg-paper-sunken",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer: advance / finish */}
      <footer className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-paper-elev/95 px-4 py-2.5 backdrop-blur">
        <span className="hidden text-sm text-ink-muted sm:inline">
          {isLast ? "Last section — finish to see your band report." : "Finished this section?"}
        </span>
        <Button
          size="lg"
          onClick={advance}
          disabled={submitting || advancing}
          className="btn-lift ml-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Scoring…
            </>
          ) : advancing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : isLast ? (
            "Finish test"
          ) : (
            <>
              Next section <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
