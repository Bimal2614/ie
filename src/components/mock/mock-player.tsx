"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasSideStimulus, SECTIONS, type SectionKey } from "@/lib/ielts";
import { answerKey, anyUploadPending, isAnswered, type Answer } from "@/lib/question-content";
import { MOCK_MODULE_NOTE, moduleSeconds } from "@/lib/mock-timing";
import {
  advanceMockModule,
  finishMock,
  saveMockProgress,
  type MockModuleView,
  type MockSittingData,
} from "@/app/actions/mock";
import { ConfirmSubmit } from "@/components/exam/confirm-submit";
import { ExamShell, type StripPart } from "@/components/exam/exam-shell";
import { SplitPane } from "@/components/exam/split-pane";
import { SectionBody, type ClientSectionView } from "@/components/practice/section-body";
import { clearAnnotations } from "@/components/practice/renderers/annotations";
import { ListeningTape, type Tape } from "./listening-tape";

/**
 * The full-mock player.
 *
 * ONE MODULE ON SCREEN, SEVERAL PARTS INSIDE IT. Listening is four recordings,
 * Reading three passages — a candidate moves between the parts of the module
 * freely, exactly as they can flip through a booklet, but a module that is over
 * is over. The parts strip along the bottom is the answer sheet: Listening shows
 * 1-40 across four tabs, Reading 1-40 across three, Writing 1-2, Speaking 1-11.
 *
 * THE CLOCK IS THE SERVER'S. `remainingSeconds` is seeded from the sitting's
 * stored timeline and re-seeded by every advance. The countdown here is only a
 * display of it: closing the tab does not pause anything, and reloading asks the
 * server where the clock is rather than resuming from a number the client kept.
 *
 * The chrome is <ExamShell/>, shared with section practice, and the questions are
 * drawn by <SectionBody/> — the same component, so a table completion looks
 * identical whether it is sat as practice or inside a mock.
 */

const AUTOSAVE_MS = 5000;

type Props = {
  sitting: MockSittingData;
};

export function MockPlayer({ sitting }: Props) {
  const [module, setModule] = useState<MockModuleView>(sitting.current);
  const [remaining, setRemaining] = useState(sitting.remainingSeconds);
  const [answers, setAnswers] = useState<Record<string, Answer>>(
    sitting.draftAnswers as Record<string, Answer>,
  );
  const [activePartId, setActivePartId] = useState(sitting.current.parts[0]?.id ?? "");
  const [current, setCurrent] = useState<number | null>(null);
  /**
   * Questions marked to come back to, keyed like the answers.
   *
   * Deliberately NOT autosaved with them: a flag is a note to self about the
   * paper in front of you, not an answer, and it has no meaning once the module
   * is handed in. Keeping it out of `draft_answers` also keeps the submitted
   * payload exactly the set of things that get marked.
   */
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [advancing, setAdvancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Set while the hand-in check is on screen. Never set by the clock. */
  const [confirming, setConfirming] = useState(false);
  // Modules the clock closed rather than the candidate handing them in. Kept in
  // state so the warning clears once they move on under their own steam.
  const [lapsed, setLapsed] = useState(sitting.lapsedIndexes);
  // Whether the Listening recording has run out. Only affects what the footer
  // says — the module still runs to its own clock, which is what gives the
  // candidate the paper exam's ten minutes to transfer answers.
  const [tapeFinished, setTapeFinished] = useState(false);

  /** One sitting's working notes, kept apart from practice and from other sittings. */
  const annotationScope = `mock:${sitting.sessionId}`;
  const isLastModule = module.index === sitting.modules.length - 1;
  const part = module.parts.find((p) => p.id === activePartId) ?? module.parts[0];

  /* --- Per-question timing: the think-time before an answer belongs to that
     question. Cheap, honest, and it survives a resume via draftTimings. --- */
  const timings = useRef<Record<string, number>>({ ...sitting.draftTimings });
  const lastTick = useRef(Date.now());
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const finished = useRef(false);

  const handleAnswer = useCallback(
    (sectionId: string, n: number, value: Answer) => {
      const key = answerKey(sectionId, n);
      const now = Date.now();
      const delta = Math.round((now - lastTick.current) / 1000);
      if (delta > 0 && delta < 3600) timings.current[key] = (timings.current[key] ?? 0) + delta;
      lastTick.current = now;
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleFlag = useCallback((sectionId: string, n: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      const key = answerKey(sectionId, n);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleClear = useCallback((sectionId: string, n: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[answerKey(sectionId, n)];
      return next;
    });
  }, []);

  /* --- The answer sheet: every number in the module, and the input each one
     belongs to. A paired "Choose TWO letters" prints as 23 AND 24 but is a
     single input anchored at 23, so both squares lead back to it. --- */
  const sheet = useMemo(() => {
    const parts: StripPart[] = [];
    const anchorOf = new Map<number, { sectionId: string; n: number }>();
    const all: number[] = [];
    for (const p of module.parts) {
      const numbers: number[] = [];
      for (const group of p.questions.groups) {
        for (const item of group.items) {
          for (let k = 0; k < (item.marks ?? 1); k++) {
            numbers.push(item.n + k);
            anchorOf.set(item.n + k, { sectionId: p.sectionId, n: item.n });
            all.push(item.n + k);
          }
        }
      }
      parts.push({ id: p.id, label: partLabel(module.section, p.partNumber), numbers });
    }
    return { parts, anchorOf, all };
  }, [module]);

  const answered = useMemo(() => {
    const done = new Set<number>();
    for (const n of sheet.all) {
      const a = sheet.anchorOf.get(n);
      if (a && isAnswered(answers[answerKey(a.sectionId, a.n)])) done.add(n);
    }
    return done;
  }, [answers, sheet]);

  // The strip marks sheet NUMBERS; flags are held against answer keys. Numbers
  // are unique within a module, so the two map cleanly here.
  const flaggedNumbers = useMemo(() => {
    const marked = new Set<number>();
    for (const n of sheet.all) {
      const a = sheet.anchorOf.get(n);
      if (a && flagged.has(answerKey(a.sectionId, a.n))) marked.add(n);
    }
    return marked;
  }, [flagged, sheet]);

  /* --- The Listening recording --- */

  const isListening = module.section === "listening";
  const tracks: Tape[] = useMemo(
    () =>
      isListening
        ? module.parts
            .filter((p) => p.audioUrl)
            .map((p) => ({
              partId: p.id,
              label: partLabel(module.section, p.partNumber),
              src: p.audioUrl!,
            }))
        : [],
    [isListening, module.parts, module.section],
  );

  /**
   * Turn the page when the recording does — but only for a candidate who is
   * following it.
   *
   * The tape announces each part and moves on, so the paper should move with it.
   * Someone who has deliberately gone back to Part 1 to fix an answer is a
   * different case: yanking them to Part 3 mid-sentence would lose their place
   * for no reason. The recording still advances either way, because it always
   * does — this only decides whether the screen follows.
   */
  /**
   * Seconds already spent in this module when we entered it, from the SERVER's
   * remaining count — what positions the recording on a resume.
   *
   * Captured on entry rather than read from `remaining`, which ticks every
   * second: as a live value it would re-seek the tape continuously. Updated on
   * every advance so a module entered later is measured from its own start.
   */
  const enteredAt = useRef(moduleSeconds(sitting.current.section) - sitting.remainingSeconds);

  const tapeAt = useRef<string | null>(null);
  const onTrackChange = useCallback((partId: string) => {
    const leaving = tapeAt.current;
    tapeAt.current = partId;
    setActivePartId((shown) => (leaving === null || shown === leaving ? partId : shown));
    setCurrent(null);
  }, []);

  /* --- Moving on --- */

  const submit = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    // The paper is gone; so are the notes on it. Left behind they would sit in
    // storage until the tab closed, and reappear on a re-sit of the same test.
    clearAnnotations(annotationScope);
    // finishMock redirects to the report; the spinner stays up until navigation.
    await finishMock(sitting.sessionId, answersRef.current, timings.current);
  }, [annotationScope, sitting.sessionId]);

  const advance = useCallback(async () => {
    if (finished.current || advancing) return;
    // The last module ends the paper, so it hands in rather than moving on —
    // finishMock grades and redirects server-side.
    if (isLastModule) {
      void submit();
      return;
    }
    setAdvancing(true);
    const res = await advanceMockModule(
      sitting.sessionId,
      module.index,
      answersRef.current,
      timings.current,
    );
    if (res.done) {
      // The clock ran out mid-request: the server has already graded and closed
      // the sitting, so there is nothing left to do but go and read the report.
      finished.current = true;
      setSubmitting(true);
      clearAnnotations(annotationScope);
      window.location.href = `/results/${sitting.sessionId}`;
      return;
    }
    setModule(res.current);
    setRemaining(res.remainingSeconds);
    setLapsed(res.lapsedIndexes);
    setTapeFinished(false);
    // A module opened by advancing starts at its beginning, minus whatever the
    // request itself cost — which the server has already deducted.
    enteredAt.current = moduleSeconds(res.current.section) - res.remainingSeconds;
    tapeAt.current = null;
    setActivePartId(res.current.parts[0]?.id ?? "");
    setCurrent(null);
    lastTick.current = Date.now();
    setAdvancing(false);
  }, [advancing, annotationScope, isLastModule, module.index, sitting.sessionId, submit]);

  // Countdown. At zero the module's time is up — the server is asked for the
  // next one, which is also what re-syncs the clock.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    const t = window.setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          // Straight through, with no confirmation: the bell is not the
          // candidate's decision, and a dialog nobody dismisses would just sit
          // there while the module was submitted behind it.
          setConfirming(false);
          void advanceRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [module.index]);

  // Autosave on a timer, and whenever the tab is hidden — the most likely moment
  // someone is about to walk away mid-module.
  useEffect(() => {
    const save = () => {
      if (finished.current) return;
      void saveMockProgress(sitting.sessionId, answersRef.current, timings.current);
    };
    const iv = window.setInterval(save, AUTOSAVE_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [sitting.sessionId]);

  /* --- Speaking: the examiner moves on --- */

  /**
   * A finished take advances the interview by itself.
   *
   * In a real Speaking test nobody sits in silence after answering — the
   * examiner asks the next question. So when a recording ends, whether the
   * candidate stopped it or the clock did, we move on. It is also the fix for a
   * genuine trap: leaving a recorded question on screen invites a candidate to
   * hit record again and talk over their own answer.
   *
   * A take is identified by its duration, so the upload completing (which
   * rewrites the same answer with a URL) does not read as a second take, while a
   * deliberate re-record of a different length does.
   */
  const takeSeen = useRef(new Map<string, string>());
  /** Takes that were already in the autosave — restoring is not answering. */
  const restored = useRef(new Set(Object.keys(sitting.draftAnswers)));
  // Written further down, once the question on screen and the move-on function
  // exist. Read only from the effect below, which runs after that.
  const focusRef = useRef<number | null>(null);
  const partRef = useRef("");
  const nextQuestion = useRef<() => void>(() => {});

  useEffect(() => {
    const n = focusRef.current;
    if (module.section !== "speaking" || n === null) return;
    const key = answerKey(partRef.current, n);
    const a = answers[key] as { recorded?: boolean; durationSec?: number } | undefined;
    if (!a?.recorded) return;

    const signature = String(a.durationSec ?? 0);
    if (takeSeen.current.get(key) === signature) return;
    const firstSighting = !takeSeen.current.has(key);
    takeSeen.current.set(key, signature);
    // Answers rebuilt from a resumed sitting must not stampede through the part.
    if (firstSighting && restored.current.has(key)) return;

    // A beat, so the candidate sees their answer land before the page turns.
    const t = window.setTimeout(() => nextQuestion.current(), 900);
    return () => window.clearTimeout(t);
  }, [answers, module.section]);

  /* --- Navigation inside the module --- */

  const jumpTo = useCallback(
    (n: number, partId: string) => {
      if (partId !== activePartId) setActivePartId(partId);
      setCurrent(n);
      const anchor = sheet.anchorOf.get(n)?.n ?? n;
      // Give a part switch a frame to render before hunting for the anchor.
      requestAnimationFrame(() => {
        const el =
          document.getElementById(`mq-${anchor}`) ?? document.getElementById(`sq-${anchor}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
      });
    },
    [activePartId, sheet],
  );

  // Memoised so it is a stable dependency: a fresh `[]` on every render would
  // rebuild `step` on every keystroke.
  const partNumbers = useMemo(
    () => sheet.parts.find((p) => p.id === activePartId)?.numbers ?? [],
    [activePartId, sheet.parts],
  );
  const step = useCallback(
    (delta: number) => {
      if (partNumbers.length === 0) return;
      const at = current === null ? -1 : partNumbers.indexOf(current);
      const next = Math.min(partNumbers.length - 1, Math.max(0, (at === -1 ? 0 : at) + delta));
      jumpTo(partNumbers[next], activePartId);
    },
    [activePartId, current, jumpTo, partNumbers],
  );

  /**
   * The next question of the interview, crossing into the next part when this
   * one runs out.
   *
   * Not `step(1)`: that clamps at the end of the current part, so a candidate
   * who finished Part 1's last question would sit on a recorded answer with the
   * Next button doing nothing. Speaking is one continuous interview across its
   * three parts, so the move-on has to be too.
   */
  const nextInterviewQuestion = useCallback(() => {
    const at = sheet.parts.findIndex((p) => p.id === activePartId);
    const here = sheet.parts[at]?.numbers ?? [];
    const i = current === null ? 0 : here.indexOf(current);
    if (i >= 0 && i < here.length - 1) {
      jumpTo(here[i + 1], activePartId);
      return;
    }
    const next = sheet.parts[at + 1];
    // The last question of the last part stays put: there is nowhere to go, and
    // the candidate still has to hand the module in themselves.
    if (next?.numbers.length) jumpTo(next.numbers[0], next.id);
  }, [activePartId, current, jumpTo, sheet.parts]);
  nextQuestion.current = nextInterviewQuestion;

  if (!part) {
    return (
      <div className="grid min-h-svh place-items-center bg-paper px-6 text-center text-sm text-ink-muted">
        This paper has no content for {SECTIONS[module.section].label}.
      </div>
    );
  }

  /* --- Rendering --- */

  const sec = SECTIONS[module.section];
  const view = toSectionView(part, module.section, !isListening);
  // Speaking is an interview: one question on screen, because seeing all eleven
  // lets a candidate rehearse — the habit the real test punishes.
  const oneAtATime = module.section === "speaking";
  const focus = oneAtATime ? (current ?? partNumbers[0] ?? null) : null;
  const focusIndex = focus === null ? -1 : partNumbers.indexOf(focus);
  // Published for the auto-advance effect above, which cannot see them directly.
  focusRef.current = focus;
  partRef.current = part.sectionId;

  const questions = (
    <SectionBody
      key={part.id}
      section={view}
      answers={answers}
      results={null}
      onAnswer={(n, value) => handleAnswer(part.sectionId, n, value)}
      onClearAnswer={(n) => handleClear(part.sectionId, n)}
      // A paper holds twelve parts whose numbers collide, so answers are keyed
      // by part. The body has to index its inputs the same way or every one of
      // them reads back empty. See `answerKey`.
      answerScope={part.sectionId}
      flagged={flagged}
      onToggleFlag={(n) => toggleFlag(part.sectionId, n)}
      // Scoped to THIS sitting. Highlights made while practising the same
      // passage must not appear on a timed paper, and a second sitting of this
      // test starts with a clean page.
      annotationScope={annotationScope}
      slot="questions"
      focusNumber={focus}
      groupHeaders={view.questions.groups.length > 1}
      // On test day a Speaking question is spoken and never printed, so the
      // paper plays it and hides the text. Section practice does the opposite.
      spokenPromptOnly
    />
  );

  const stimulus = (
    <SectionBody
      key={`${part.id}-stimulus`}
      section={view}
      answers={answers}
      results={null}
      onAnswer={(n, value) => handleAnswer(part.sectionId, n, value)}
      answerScope={part.sectionId}
      annotationScope={annotationScope}
      slot="stimulus"
    />
  );

  const twoPane = hasSideStimulus(module.section, view);
  const body = twoPane ? (
    <SplitPane
      className="h-full"
      storageKey={`exam-split-${module.section}`}
      left={<div className="p-4 sm:p-5">{stimulus}</div>}
      right={<div className="space-y-4 p-4 sm:p-5">{questions}</div>}
    />
  ) : (
    <div className="h-full overflow-y-auto">
      <div
        className={cn("space-y-4 p-4 sm:p-5", module.section === "speaking" && "mx-auto max-w-2xl")}
      >
        {/* Outside the part-keyed body ON PURPOSE: this element must not be
            unmounted when the candidate moves between parts, or the recording
            stops and starts over. */}
        {isListening && tracks.length > 0 && (
          <ListeningTape
            tracks={tracks}
            elapsedSeconds={enteredAt.current}
            onTrackChange={onTrackChange}
            onFinished={() => setTapeFinished(true)}
          />
        )}
        {stimulus}
        {questions}
      </div>
    </div>
  );

  const savingRecording = anyUploadPending(answers);
  const timerState = remaining < 60 ? "critical" : remaining < 300 ? "warning" : "ok";

  return (
    <ExamShell
      title={`${sitting.title} · ${sec.label}`}
      partLabel={partLabel(module.section, part.partNumber)}
      instruction={part.instructions}
      remainingSec={remaining}
      timerState={timerState}
      badges={
        <>
          <span className={cn("chip", `chip-${sec.accent}`)}>{sec.label}</span>
          <span className="chip capitalize">{sitting.module}</span>
          <span className="chip">
            Q{part.startNumber}
            {part.endNumber > part.startNumber ? `-${part.endNumber}` : ""}
          </span>
        </>
      }
      menu={<ModuleRail modules={sitting.modules} activeIndex={module.index} />}
      parts={sheet.parts}
      activePartId={activePartId}
      answered={answered}
      flagged={flaggedNumbers}
      current={current}
      onJump={jumpTo}
      // A sheet number maps back to the input that owns it, so flagging the
      // second square of a paired "choose TWO" flags the one question, not a
      // number with nothing behind it.
      onToggleFlag={(n) => {
        const a = sheet.anchorOf.get(n);
        if (a) toggleFlag(a.sectionId, a.n);
      }}
      onSelectPart={(id) => {
        setActivePartId(id);
        setCurrent(null);
      }}
      onPrev={() => step(-1)}
      onNext={() => step(1)}
      canPrev={oneAtATime ? focusIndex > 0 : current === null || partNumbers.indexOf(current) > 0}
      canNext={
        oneAtATime
          ? focusIndex < partNumbers.length - 1
          : current === null || partNumbers.indexOf(current) < partNumbers.length - 1
      }
      onSubmit={() => setConfirming(true)}
      submitting={submitting || advancing || savingRecording}
      submitLabel={
        savingRecording
          ? "Saving recording…"
          : isLastModule
            ? "Finish test"
            : `Finish ${sec.label}`
      }
      footerNote={
        <FooterNote
          savingRecording={savingRecording}
          advancing={advancing}
          submitting={submitting}
          answered={answered.size}
          total={sheet.all.length}
          isLastModule={isLastModule}
          section={module.section}
          lapsed={lapsed.map((i) => SECTIONS[sitting.modules[i]?.section ?? "listening"].label)}
          tapeFinished={isListening && tapeFinished}
        />
      }
    >
      {body}

      <ConfirmSubmit
        open={confirming}
        title={isLastModule ? "Hand in the whole paper?" : `Finish ${sec.label}?`}
        detail={
          isLastModule
            ? "This submits every module and produces your band report. You can't return to the paper."
            : `You won't be able to come back to ${sec.label} once you move on.`
        }
        unanswered={sheet.all.length - answered.size}
        flagged={flaggedNumbers.size}
        confirmLabel={isLastModule ? "Hand in" : `Finish ${sec.label}`}
        onConfirm={() => {
          setConfirming(false);
          void advance();
        }}
        onCancel={() => setConfirming(false)}
      />
    </ExamShell>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

/** What the paper calls a part of this module. */
function partLabel(section: SectionKey, partNumber: number): string {
  if (section === "reading") return `Passage ${partNumber}`;
  if (section === "writing") return `Task ${partNumber}`;
  return `Part ${partNumber}`;
}

/**
 * Adapt one mock part to the shape section practice renders.
 *
 * The two are deliberately the same type: a mock part IS a practice part, sat
 * under a clock, and giving the mock its own renderer is how the two drift until
 * a table completion looks different in the exam than in practice.
 */
function toSectionView(
  part: MockSittingData["current"]["parts"][number],
  section: SectionKey,
  /**
   * False during Listening, where <ListeningTape/> plays all four parts from one
   * element above the part switcher. Leaving the part's own player in as well
   * would put a second, seekable, pausable copy of the recording on screen —
   * which is a way to hear an answer twice.
   */
  ownsAudio: boolean,
): ClientSectionView {
  return {
    id: part.sectionId,
    sectionType: section,
    title: part.title,
    partNumber: part.partNumber,
    instructions: part.instructions,
    audioUrl: ownsAudio ? part.audioUrl : null,
    passageText: part.passageText,
    imageUrl: part.imageUrl,
    startNumber: part.startNumber,
    endNumber: part.endNumber,
    totalQuestions: part.totalQuestions,
    questions: part.questions,
  };
}

/**
 * The running order, in the header. Not navigation — a module you have left
 * cannot be reopened, and one you have not reached cannot be started early.
 */
function ModuleRail({
  modules,
  activeIndex,
}: {
  modules: MockSittingData["modules"];
  activeIndex: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {modules.map((m) => {
        const sec = SECTIONS[m.section];
        const done = m.index < activeIndex;
        const here = m.index === activeIndex;
        return (
          <span
            key={m.section}
            title={`${sec.label} · ${m.minutes} min`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold",
              here && "border-brand bg-brand-soft text-brand",
              done && "border-success/40 bg-success-soft text-success",
              !here && !done && "border-line text-ink-muted",
            )}
          >
            {done && <Check className="size-3" />}
            <span className={cn(!here && "hidden sm:inline")}>{sec.label}</span>
            <span className={cn(here && "sm:hidden", !here && "sm:hidden")}>{sec.label[0]}</span>
          </span>
        );
      })}
    </div>
  );
}

function FooterNote({
  savingRecording,
  advancing,
  submitting,
  answered,
  total,
  isLastModule,
  section,
  lapsed,
  tapeFinished,
}: {
  savingRecording: boolean;
  advancing: boolean;
  submitting: boolean;
  answered: number;
  total: number;
  isLastModule: boolean;
  section: SectionKey;
  lapsed: string[];
  tapeFinished: boolean;
}) {
  if (submitting) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="size-3 animate-spin" /> Marking your paper…
      </span>
    );
  }
  if (advancing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="size-3 animate-spin" /> Moving on…
      </span>
    );
  }
  if (savingRecording) return <>Storing your recording — don&apos;t leave yet.</>;
  if (lapsed.length > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-warning">
        <AlertTriangle className="size-3" />
        {lapsed.join(" and ")} ran out of time — the exam clock kept going.
      </span>
    );
  }
  return (
    <>
      {answered} / {total} answered ·{" "}
      <span className="hidden sm:inline">
        {tapeFinished
          ? "The recording has finished — check and transfer your answers. "
          : `${MOCK_MODULE_NOTE[section]} `}
      </span>
      {isLastModule ? "Finishing hands in the whole paper." : "You can't come back to this module."}
    </>
  );
}
