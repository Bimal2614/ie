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
  recordMockSpeakingTake,
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

/**
 * The longest a hand-in will wait for a recording that has not finished
 * uploading. See `awaitUploads` — it is a grace, not a timeout on the upload
 * itself, which carries on regardless.
 */
const UPLOAD_GRACE_MS = 15_000;

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

  /**
   * Let a take that is still uploading land before the answers are sent.
   *
   * THE ONLY PLACE THE UPLOAD IS ALLOWED TO COST ANYTHING. Storing a recording
   * is server work — the WebM is transcoded to WAV on the way in, because the
   * scorer has no ffmpeg — and it used to be paid for at the front: the Finish
   * button went dead, the footer said "don't leave yet", and a spinner sat
   * beside the answer. None of that helped the candidate, who had already
   * spoken and wanted the next question.
   *
   * So the wait moved here, where it is invisible. By the time a module is
   * handed in the upload is almost always long finished, and when it is not,
   * this happens under a spinner that was going up anyway. Submitting a
   * `pendingUpload` answer would save a recording with no storage location,
   * which the report can only ever show as "Not scored".
   *
   * TIME-BOXED, because the alternative to a lost recording must not be a lost
   * paper. Past the grace the hand-in goes ahead regardless — an answer marked
   * `uploadFailed` is one band missing from a report that otherwise exists.
   */
  const awaitUploads = useCallback(async () => {
    const deadline = Date.now() + UPLOAD_GRACE_MS;
    while (anyUploadPending(answersRef.current) && Date.now() < deadline) {
      await new Promise((r) => window.setTimeout(r, 200));
    }
  }, []);

  const submit = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    await awaitUploads();
    // The paper is gone; so are the notes on it. Left behind they would sit in
    // storage until the tab closed, and reappear on a re-sit of the same test.
    clearAnnotations(annotationScope);
    // finishMock redirects to the report; the spinner stays up until navigation.
    await finishMock(sitting.sessionId, answersRef.current, timings.current);
  }, [annotationScope, awaitUploads, sitting.sessionId]);

  const advance = useCallback(async () => {
    if (finished.current || advancing) return;
    // The last module ends the paper, so it hands in rather than moving on —
    // finishMock grades and redirects server-side.
    if (isLastModule) {
      void submit();
      return;
    }
    setAdvancing(true);
    // Speaking is the last module in every paper today, so this is belt and
    // braces — but a module boundary is still a point of no return, and a take
    // still in flight over one would be saved without its recording.
    await awaitUploads();
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
  }, [advancing, annotationScope, awaitUploads, isLastModule, module.index, sitting.sessionId, submit]);

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

  /* --- Speaking: each take is marked while the interview carries on --- */

  /**
   * Tell the server about a finished take as soon as it is stored.
   *
   * THE MARKING IS SPREAD OVER THE INTERVIEW, not piled up at the end. A
   * Speaking module is eleven recordings; asking for all eleven bands at hand-in
   * was one burst of provider calls, and that burst is what got them refused —
   * eight of eleven on one sitting, every one of which scored fine on a retry.
   * Reported as it happens, the provider sees one call a minute and the report
   * is already marked by the time the paper is handed in.
   *
   * IT FIRES ON THE URL, NOT ON THE TAKE. A recording is reported twice: once
   * the moment it stops, flagged `pendingUpload` with nowhere to fetch it from,
   * and again when the upload completes and it has a location. Only the second
   * is worth sending — there is nothing to score without it.
   *
   * ONCE PER ANSWER, and nothing waits for it. The call is fire-and-forget: it
   * costs the candidate nothing, and a failure is picked up by the batch run at
   * hand-in and the sweeper cron behind that. A resumed sitting replays the takes
   * it restored, which the server absorbs — the row is an upsert and a scored
   * answer is skipped.
   */
  const takeSent = useRef(new Set<string>());
  useEffect(() => {
    if (module.section !== "speaking") return;
    for (const [key, a] of Object.entries(answers)) {
      const url = (a as { audioUrl?: unknown }).audioUrl;
      if (typeof url !== "string" || !url || takeSent.current.has(key)) continue;
      takeSent.current.add(key);
      const at = key.lastIndexOf(":");
      if (at === -1) continue;
      const sectionId = key.slice(0, at);
      const n = Number(key.slice(at + 1));
      if (!Number.isFinite(n)) continue;
      // SAVED FIRST, AND IT HAS TO BE. The server reads the recording's location
      // out of the sitting's saved draft rather than taking it from this call —
      // but the autosave runs on a five-second timer, so a take reported the
      // instant it uploads can easily beat its own draft to the database. The
      // server would then find no recording for that question and quietly do
      // nothing. Saving on the way past costs one request the timer was about to
      // make anyway.
      void saveMockProgress(sitting.sessionId, answersRef.current, timings.current)
        .then(() => recordMockSpeakingTake(sitting.sessionId, sectionId, n))
        .catch(() => {
          // Deliberately swallowed. Hand-in and the sweeper both cover this, and
          // a candidate mid-interview must never be shown a marking error. The
          // key is left in `takeSent` regardless: a retry loop against a failing
          // server is the last thing a timed module needs.
        });
    }
  }, [answers, module.section, sitting.sessionId]);

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
  /**
   * SPEAKING ONLY MOVES FORWARD.
   *
   * An interview is not a paper. The examiner asks, you answer, and they move
   * on — there is no going back to a question already asked, and certainly no
   * listening to your own answer and recording a better one. The recorder was
   * offering "Re-record" on any question the candidate walked back to, which
   * turned a timed speaking test into an editing session.
   *
   * LISTENING, READING AND WRITING ARE UNTOUCHED. Those are papers: every
   * question stays open until the module is handed in, and the answer strip
   * navigates them freely in both directions. This lock is `section ===
   * "speaking"` and nothing else.
   */
  const forwardOnly = module.section === "speaking";

  /**
   * Everything the interview has already passed. Empty for every other module,
   * so the strip renders exactly as it always has.
   */
  const locked = useMemo(() => {
    if (!forwardOnly) return undefined;
    // Where the interview stands: the focused question, or the first of the
    // part when nothing has been focused yet.
    const here = current ?? partNumbers[0] ?? null;
    if (here === null) return new Set<number>();
    const at = sheet.all.indexOf(here);
    return new Set(at > 0 ? sheet.all.slice(0, at) : []);
  }, [forwardOnly, current, partNumbers, sheet.all]);

  const step = useCallback(
    (delta: number) => {
      if (partNumbers.length === 0) return;
      // Belt and braces: the button is disabled below, but a keyboard shortcut
      // or a stale render must not be able to walk the interview backwards.
      if (forwardOnly && delta < 0) return;
      const at = current === null ? -1 : partNumbers.indexOf(current);
      const next = Math.min(partNumbers.length - 1, Math.max(0, (at === -1 ? 0 : at) + delta));
      jumpTo(partNumbers[next], activePartId);
    },
    [activePartId, current, forwardOnly, jumpTo, partNumbers],
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

  /* --- Keeping the examiner's next question ready --- */

  /**
   * Every examiner clip in this module, by the number on the answer sheet.
   *
   * Flattened across PARTS on purpose. An interview is one continuous run of
   * questions that happens to be stored as three parts, and the gap that needed
   * fixing was exactly at a part boundary.
   */
  const promptBySheet = useMemo(() => {
    const m = new Map<number, string>();
    if (module.section !== "speaking") return m;
    for (const p of module.parts) {
      for (const group of p.questions.groups) {
        for (const item of group.items) {
          const src = (item as { promptAudioUrl?: string | null }).promptAudioUrl;
          if (src) m.set(item.n, src);
        }
      }
    }
    return m;
  }, [module]);

  /** Where the interview stands, before the render below works it out again. */
  const focusNow = module.section === "speaking" ? (current ?? partNumbers[0] ?? null) : null;

  /**
   * Fetch the next two examiner clips while the current question is being
   * answered.
   *
   * THE GAP THIS CLOSES IS AT THE PART BOUNDARY, and it was the worst one in the
   * paper. Part 2 ends with a two-minute recording going up — the largest upload
   * of the sitting — and the page then turns straight to Part 3's first
   * question. Cold, that clip costs an authenticated round trip to the media
   * route, a redirect to a presigned URL and then the bytes, all competing with
   * the upload for the same connection: three to five seconds of a candidate
   * looking at a question nobody is asking.
   *
   * ACROSS PARTS, WHICH IS WHY IT LIVES HERE. The earlier version of this sat in
   * QuestionBody, which only ever sees one part's questions — so it warmed the
   * next clip happily in the middle of a part and did nothing at all at the end
   * of one. Only the player knows the module's running order.
   *
   * ONE AHEAD IS ENOUGH. Warming question N+1 while N is still being heard and
   * answered buys fifteen seconds at the very least — a Part 2 long turn buys
   * two minutes — for a clip that is seconds long. Reaching further was
   * insurance against nothing.
   */
  useEffect(() => {
    if (focusNow === null) return;
    const at = sheet.all.indexOf(focusNow);
    if (at === -1) return;

    const src = promptBySheet.get(sheet.all[at + 1]);
    if (!src) return;

    const warm = new Audio();
    warm.preload = "auto";
    warm.src = src;
    warm.load();

    return () => {
      // Drop it if the interview moved on first; the element is unreachable
      // after this and would otherwise hold the connection open.
      // `removeAttribute` rather than `src = ""`, which resolves to the page's
      // own URL and has the browser fetch the document as media.
      warm.removeAttribute("src");
      warm.load();
    };
  }, [focusNow, promptBySheet, sheet.all]);

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
      // And it is asked ONCE. No seek bar, no pause, no replay — the same rule
      // ListeningTape imposes on the recording, for the same reason: scrubbing
      // back through the examiner rehearses a repetition the real one will not
      // give, and it was the last way left to hear a Speaking prompt twice.
      promptPlaysOnce
      // One take: the interview cannot be walked back to, so a "Re-record"
      // button would offer something the navigation refuses.
      singleTake
      // And nobody hands you a record button either: the question plays, and
      // when it stops the recorder is already running. Section practice leaves
      // the candidate to press it, because that is where a clip gets replayed.
      autoRecordAfterPrompt
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
      // The strip disables a closed square; this is the same rule enforced on
      // the handler, so nothing can reopen one by another route.
      onJump={(n, partId) => {
        if (locked?.has(n)) return;
        jumpTo(n, partId);
      }}
      locked={locked}
      // A sheet number maps back to the input that owns it, so flagging the
      // second square of a paired "choose TWO" flags the one question, not a
      // number with nothing behind it.
      onToggleFlag={(n) => {
        const a = sheet.anchorOf.get(n);
        if (a) toggleFlag(a.sectionId, a.n);
      }}
      onSelectPart={(id) => {
        const numbers = sheet.parts.find((p) => p.id === id)?.numbers ?? [];
        // A part every one of whose questions has been asked is behind you.
        if (locked && numbers.length > 0 && numbers.every((n) => locked.has(n))) return;
        setActivePartId(id);
        setCurrent(null);
      }}
      onPrev={() => step(-1)}
      // The interview runs straight through its three parts, so Next carries on
      // into the next one rather than clamping at the end of this part. It only
      // mattered occasionally before; now that there is no way back, a dead
      // Next on a part's last question would leave the answer strip as the only
      // way forward.
      onNext={() => (forwardOnly ? nextInterviewQuestion() : step(1))}
      // Speaking has no Previous at all — see `forwardOnly`.
      canPrev={
        forwardOnly ? false : current === null || partNumbers.indexOf(current) > 0
      }
      canNext={
        forwardOnly
          ? // Anywhere but the last question of the last part.
            focus !== null && focus !== sheet.all[sheet.all.length - 1]
          : current === null || partNumbers.indexOf(current) < partNumbers.length - 1
      }
      onSubmit={() => setConfirming(true)}
      // An upload in flight does NOT hold this shut — see `awaitUploads`. The
      // candidate is never made to wait on the network for a take they have
      // already given; the waiting, where any is needed at all, happens behind
      // the hand-in spinner.
      submitting={submitting || advancing}
      submitLabel={isLastModule ? "Finish test" : `Finish ${sec.label}`}
      footerNote={
        <FooterNote
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
  advancing,
  submitting,
  answered,
  total,
  isLastModule,
  section,
  lapsed,
  tapeFinished,
}: {
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
