"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS, type SectionKey } from "@/lib/ielts";
import type { Answer } from "@/lib/question-content";
import { SetBody, type PlayerSet, type PlayerQuestion } from "@/components/practice/set-body";
import { finishMock } from "@/app/actions/mock";

export type MockSection = {
  section: SectionKey;
  set: PlayerSet;
  questions: PlayerQuestion[];
};

export function MockPlayer({ sessionId, sections, durationMinutes }: { sessionId: string; sections: MockSection[]; durationMinutes: number }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const finished = useRef(false);

  const setAnswer = useCallback((qid: string, value: Answer) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    await finishMock(sessionId, answers);
  }, [sessionId, answers]);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { clearInterval(t); void finish(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [finish]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const state = remaining < 60 ? "critical" : remaining < 300 ? "warning" : "ok";
  const answeredCount = Object.keys(answers).length;
  const totalQ = sections.reduce((n, s) => n + s.questions.length, 0);

  return (
    <div className="flex min-h-svh flex-col bg-paper">
      {/* Exam header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper-elev/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-brand" />
          <span style={{ fontFamily: "var(--font-heading)" }}>IELTSAce</span>
          <span className="chip ml-2">Full Mock</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-muted sm:inline">{answeredCount}/{totalQ} answered</span>
          <span className="exam-timer flex items-center gap-1.5 text-lg" data-state={state}>
            <Clock className="h-4 w-4" /> {mm}:{ss}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
        {sections.map((sec) => (
          <section key={sec.section} className="space-y-5">
            <div className="flex items-center gap-2">
              <h2 className="display text-xl">{SECTIONS[sec.section].label}</h2>
              <span className={`chip chip-${SECTIONS[sec.section].accent}`}>
                {sec.questions.length} questions
              </span>
            </div>

            {/* Same renderer as practice, so the mock looks like what they trained on. */}
            <SetBody
              set={sec.set}
              questions={sec.questions}
              answers={answers}
              results={null}
              onAnswer={setAnswer}
            />
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-20 flex items-center justify-between border-t border-line bg-paper-elev/95 px-4 py-3 backdrop-blur">
        <span className="text-sm text-ink-muted">Finish to see your band report.</span>
        <Button size="lg" onClick={finish} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Scoring…" : "Finish test"}
        </Button>
      </footer>
    </div>
  );
}
