"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Shuffle } from "lucide-react";
import { countWords } from "@/lib/ielts";

/**
 * The interactive half of /ielts-typing-test.
 *
 * Built as a copy of the computer-delivered Writing screen rather than a generic
 * typing box: dark header with the clock, the task on the left, the answer box on
 * the right, a live word count and no spell-checker. Practising on something that
 * looks like test day is half the point.
 *
 * Two modes, because "is my typing fast enough?" is two questions:
 *  - speed: copy a passage. Mechanical speed and accuracy, the ceiling.
 *  - pace:  write your own answer to a Task 2 prompt. Words you actually produce
 *           per minute while thinking, which is what decides whether you finish.
 *
 * Nothing leaves the browser.
 */

const PASSAGES = [
  "Cities around the world are experimenting with car-free zones in their historic centres. Supporters argue that removing traffic makes streets safer, cleaner and more pleasant for walking, and that local shops benefit from the extra foot traffic. Critics point out that deliveries become harder, that people with limited mobility may struggle to reach the centre, and that congestion can simply move to the surrounding roads. The evidence so far is mixed. Where planners have invested in frequent public transport and clear signage, the results have generally been positive. Where a ban was introduced quickly and without alternatives, businesses have often complained of falling sales during the first year.",
  "The graph compares the percentage of households with internet access in three countries between 2005 and 2025. Overall, access rose steadily in all three, although the pace of growth differed considerably. In 2005, just under half of households in the first country were online, compared with roughly a quarter in the second and fewer than one in ten in the third. Over the following two decades, the third country recorded the most dramatic increase, eventually overtaking the second in 2019. By the end of the period, access in all three countries had exceeded eighty per cent, with the first remaining slightly ahead of the others.",
  "Some people believe that university education should be free for every student, while others think that students should pay at least part of the cost. In my view, a mixed approach is the most sensible. Free tuition widens access, particularly for talented young people from low-income families who might otherwise never apply. However, universities also need stable funding to employ good teachers and maintain their facilities, and governments face many competing demands on their budgets. A system in which fees are charged but repaid only once graduates earn above a certain income would protect access while still sharing the cost fairly.",
  "Dear Ms Patel, I am writing to complain about the washing machine I bought from your store on 3 March. Although it worked well for the first two weeks, it has since begun to leak water during every cycle, and on one occasion the kitchen floor was flooded. I contacted your customer service team twice by telephone, but on both occasions I was promised a call back that never came. I would be grateful if you could arrange for an engineer to inspect the machine within the next seven days. If the fault cannot be repaired, I would like a full replacement. I look forward to hearing from you.",
];

const PROMPTS = [
  "Some people think that governments should spend more money on public transport than on building new roads. To what extent do you agree or disagree?",
  "In many countries, people are working longer hours than in the past. What are the causes of this, and what effects does it have on individuals and society?",
  "Some believe that children should learn to cook at school, while others think this is the responsibility of parents. Discuss both views and give your own opinion.",
  "More and more people are choosing to work from home. Do the advantages of this trend outweigh the disadvantages?",
];

type Mode = "speed" | "pace";
type Status = "idle" | "running" | "done";

const DURATIONS: Record<Mode, number[]> = { speed: [1, 3, 5], pace: [5, 10] };

/** The 400-word minimum across both tasks: 150 for Task 1, 250 for Task 2. */
const MIN_WORDS = 400;
const HOUR = 60;

export function TypingTest() {
  const [mode, setMode] = useState<Mode>("speed");
  const [minutes, setMinutes] = useState(1);
  const [pick, setPick] = useState(0);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [endedAt, setEndedAt] = useState(0);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Copy mode loops through every passage from the chosen one, so a fast typist
  // never runs off the end of the text inside five minutes.
  const target = useMemo(
    () => [...PASSAGES.slice(pick % PASSAGES.length), ...PASSAGES.slice(0, pick % PASSAGES.length)].join(" "),
    [pick],
  );

  const reset = useCallback(() => {
    setText("");
    setStatus("idle");
    setStartedAt(0);
    setEndedAt(0);
    setNow(0);
    boxRef.current?.focus();
  }, []);

  const finish = useCallback(() => {
    setStatus("done");
    setEndedAt(Date.now());
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [status]);

  const limitMs = minutes * 60_000;
  const elapsedMs = status === "idle" ? 0 : Math.min((status === "done" ? endedAt : now) - startedAt, limitMs);
  const remainingMs = Math.max(0, limitMs - elapsedMs);

  useEffect(() => {
    if (status === "running" && elapsedMs >= limitMs) finish();
  }, [status, elapsedMs, limitMs, finish]);

  const onChange = (value: string) => {
    if (status === "done") return;
    if (status === "idle" && value.length > 0) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
      setStatus("running");
    }
    setText(value);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMinutes(DURATIONS[m][0]);
    reset();
  };

  const words = countWords(text);
  const correctChars = useMemo(() => (mode === "speed" ? scoreCopy(target, text).correctChars : 0), [mode, text, target]);

  // Standard measure: five characters is one "word", counting only correct ones.
  const mins = Math.max(elapsedMs, 1000) / 60_000;
  const netWpm = mode === "speed" ? correctChars / 5 / mins : words / mins;
  const accuracy = text.length ? correctChars / text.length : 1;

  return (
    <div>
      {/* Mode + length controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Test type" className="inline-flex rounded-xl border border-line bg-paper-sunken p-1">
          {(
            [
              ["speed", "Typing speed"],
              ["pace", "Exam pace"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={mode === key}
              onClick={() => switchMode(key)}
              className={
                mode === key
                  ? "rounded-lg bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-sm"
                  : "rounded-lg px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-xl border border-line p-1" aria-label="Test length">
          {DURATIONS[mode].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              onClick={() => {
                setMinutes(m);
                reset();
              }}
              className={
                minutes === m
                  ? "rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper"
                  : "rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              }
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {mode === "speed"
          ? "Copy the passage exactly, capitals and commas included. The clock starts on your first key."
          : "Answer the Task 2 question in your own words, as you would on test day. The clock starts on your first key."}
      </p>

      {/* The test screen */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line-strong bg-paper-elev shadow-sm">
        <div className="flex items-center justify-between gap-3 bg-paper-strong px-4 py-2.5 text-white">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            IELTS Writing · practice
          </span>
          <span
            className={`font-mono text-sm tabular-nums ${remainingMs <= 10_000 && status === "running" ? "text-warning" : "text-white"}`}
            aria-label="Time remaining"
          >
            {clock(remainingMs)}
          </span>
        </div>

        <div className="grid md:grid-cols-2">
          <div className="border-b border-line p-4 sm:p-5 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {mode === "speed" ? "Copy this text" : "Writing Task 2"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPick((p) => p + 1);
                  reset();
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
              >
                <Shuffle className="size-3.5" /> New {mode === "speed" ? "text" : "question"}
              </button>
            </div>
            {mode === "speed" ? (
              <Passage target={target} typed={text} />
            ) : (
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink">
                <p className="font-medium">{PROMPTS[pick % PROMPTS.length]}</p>
                <p className="text-sm text-ink-muted">
                  Give reasons for your answer and include any relevant examples from your own knowledge or experience.
                  Write at least 250 words.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col p-4 sm:p-5">
            <label htmlFor="typing-answer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="typing-answer"
              ref={boxRef}
              value={text}
              onChange={(e) => onChange(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              readOnly={status === "done"}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              data-gramm="false"
              placeholder={mode === "speed" ? "Start typing the passage here…" : "Start your essay here…"}
              className="min-h-36 w-full flex-1 resize-y rounded-lg border border-line bg-paper p-3 text-[15px] leading-relaxed text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-ring/30 md:min-h-72"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
              <span>No spell-check, as on test day</span>
              <span className="font-medium tabular-nums text-ink">Word count: {words}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper-sunken px-4 py-3 sm:px-5">
          <p className="text-sm tabular-nums text-ink-soft" aria-live="polite">
            {status === "idle"
              ? "Waiting for your first key"
              : status === "running" && elapsedMs < 5000
                ? "Measuring…"
                : `${Math.round(netWpm)} ${mode === "speed" ? "wpm" : "words a minute"}${mode === "speed" ? ` · ${Math.round(accuracy * 100)}% accurate` : ""}`}
          </p>
          <div className="flex gap-2">
            {status === "running" && (
              <button
                type="button"
                onClick={finish}
                className="rounded-lg border border-line bg-paper px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-elev"
              >
                Finish now
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> Restart
            </button>
          </div>
        </div>
      </div>

      {status === "done" &&
        (elapsedMs < (mode === "speed" ? 20_000 : 60_000) || words < 5 ? (
          <p className="mt-5 rounded-xl border border-line bg-paper-elev p-4 text-sm text-ink-soft">
            {mode === "speed"
              ? "That was too short to measure. Give it at least the full minute and type as you normally would."
              : "That was too short to measure your pace. Write for at least a minute, and ideally the whole test, as you would on the day."}
          </p>
        ) : mode === "speed" ? (
          <SpeedResult wpm={netWpm} accuracy={accuracy} />
        ) : (
          <PaceResult wpm={netWpm} words={words} minutes={elapsedMs / 60_000} />
        ))}
    </div>
  );
}

/* ─────────────────────────────── Passage ─────────────────────────────── */

/**
 * Word-by-word scoring, the way typing tests do it. Comparing character by
 * character means one dropped letter shifts everything after it and the rest of
 * the line turns red; aligning on words means a typo costs exactly one word.
 */
function scoreCopy(target: string, typed: string) {
  const want = target.split(" ");
  const got = typed.split(" ");
  const done = got.length - 1; // the last chunk is the word in progress
  const states: ("ok" | "bad")[] = [];
  let correctChars = 0;
  for (let i = 0; i < done; i++) {
    const ok = got[i] === want[i];
    states.push(ok ? "ok" : "bad");
    if (ok) correctChars += want[i].length + 1;
  }
  const current = got[done] ?? "";
  const currentOk = (want[done] ?? "").startsWith(current);
  if (currentOk) correctChars += current.length;
  return { want, states, current: done, currentOk, correctChars };
}

/** The copy text, coloured as you go: done in ink, mistakes in red, the rest muted. */
function Passage({ target, typed }: { target: string; typed: string }) {
  const { want, states, current, currentOk } = scoreCopy(target, typed);
  // Only render what can matter on screen: what you've typed plus a window ahead.
  const shown = want.slice(0, Math.max(current + 80, 120));
  const boxRef = useRef<HTMLParagraphElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  // Keep the word you are on in view, one line from the top. Without this the
  // passage scrolls away under you, and on a phone the keyboard hides the rest.
  // Sets scrollTop on the passage only, so the page itself never jumps.
  useEffect(() => {
    const box = boxRef.current;
    const word = wordRef.current;
    if (!box || !word) return;
    box.scrollTop = Math.max(0, word.offsetTop - 26);
  }, [current]);

  return (
    <p
      ref={boxRef}
      className="relative mt-3 max-h-36 overflow-y-auto text-[15px] leading-relaxed text-ink-muted md:max-h-[22rem]"
    >
      {shown.map((w, i) => (
        <span key={i}>
          <span
            ref={i === current ? wordRef : undefined}
            className={
              i < current
                ? states[i] === "ok"
                  ? "text-ink"
                  : "rounded-sm bg-danger-soft text-danger underline decoration-danger"
                : i === current
                  ? `border-b-2 ${currentOk ? "border-brand" : "border-danger"} text-ink`
                  : undefined
            }
          >
            {w}
          </span>{" "}
        </span>
      ))}
    </p>
  );
}

/* ─────────────────────────────── Results ─────────────────────────────── */

function SpeedResult({ wpm, accuracy }: { wpm: number; accuracy: number }) {
  const typing = MIN_WORDS / Math.max(wpm, 1);
  const left = HOUR - typing;
  const verdict =
    wpm >= 40
      ? { tone: "good", head: "Typing is not your problem.", body: "At this speed the 400 words take about ten minutes or less to type, which leaves almost the whole hour for planning, thinking and checking. Spend your practice on the essay itself." }
      : wpm >= 30
        ? { tone: "good", head: "Fast enough, with room to save minutes.", body: "You can type both tasks comfortably. A couple of weeks of short daily drills would hand you back a few extra minutes for planning and proofreading." }
        : wpm >= 20
          ? { tone: "warn", head: "Typing is eating your thinking time.", body: "Typing alone takes a large slice of the hour, and that time comes out of planning and checking. This is the most fixable problem in IELTS Writing: ten minutes of daily drills for two weeks usually moves people up a bracket." }
          : { tone: "bad", head: "This is a real risk on test day.", body: "Typing would take a third of the hour or more before you think a single thought. Drill daily before your test, and look at whether Writing on Paper is offered at your centre." };

  return (
    <ResultCard
      tone={verdict.tone}
      stats={[
        { label: "Typing speed", value: `${Math.round(wpm)} wpm` },
        { label: "Accuracy", value: `${Math.round(accuracy * 100)}%` },
        { label: "To type 400 words", value: `${fmtMin(typing)} min` },
      ]}
      head={verdict.head}
      body={verdict.body}
      note={
        accuracy < 0.92
          ? "Your accuracy is below 92%. On test day there is no spell-checker, so every typo is a spelling mistake an examiner sees. Slow down until accuracy is above 95%, then build speed."
          : "Copying is your ceiling. Writing your own answer is always slower, because you think as you type. Try the Exam pace test for the number that decides whether you finish."
      }
    >
      <Hour
        segments={[
          { label: "Typing the 400 words", min: Math.min(typing, HOUR), cls: "bg-brand" },
          { label: "Left for planning, thinking and checking", min: Math.max(left, 0), cls: "bg-green" },
        ]}
      />
    </ResultCard>
  );
}

function PaceResult({ wpm, words, minutes }: { wpm: number; words: number; minutes: number }) {
  const t2 = 250 / Math.max(wpm, 0.5);
  const t1 = 150 / Math.max(wpm, 0.5);
  const total = t1 + t2;
  const tone = total <= 50 ? "good" : total <= HOUR ? "warn" : "bad";
  const head =
    tone === "good"
      ? "At this pace you finish, with time to check."
      : tone === "warn"
        ? "You finish, but only just."
        : "At this pace you would not finish both tasks.";
  const body =
    tone === "good"
      ? `Task 2 would take about ${fmtMin(t2)} minutes against the 40 you should give it, and Task 1 about ${fmtMin(t1)} against 20. Use the spare minutes for a plan before you start and a proofread at the end.`
      : tone === "warn"
        ? `Both tasks together take about ${fmtMin(total)} of your 60 minutes, which leaves almost nothing for planning or proofreading. Most candidates also slow down in the middle of an essay, so this is tighter than it looks.`
        : `Both tasks together would take about ${fmtMin(total)} minutes, more than the hour you have. Something has to change: faster typing, a tighter plan so you hesitate less, or both.`;

  return (
    <ResultCard
      tone={tone}
      stats={[
        { label: "Your pace", value: `${wpm.toFixed(1)} words/min` },
        { label: "Words written", value: `${words} in ${fmtMin(minutes)} min` },
        { label: "Task 2 at this pace", value: `${fmtMin(t2)} min` },
      ]}
      head={head}
      body={body}
      note="A short sample flatters you, because the opening of an essay is the easy part. Take the 10-minute version for a more honest number."
    >
      <Hour
        segments={[
          { label: "Task 1 (150 words)", min: Math.min(t1, HOUR), cls: "bg-info" },
          { label: "Task 2 (250 words)", min: Math.min(t2, Math.max(HOUR - t1, 0)), cls: "bg-brand" },
          { label: "Spare", min: Math.max(HOUR - total, 0), cls: "bg-green" },
        ]}
        over={total > HOUR ? total - HOUR : 0}
      />
    </ResultCard>
  );
}

function ResultCard({
  tone,
  stats,
  head,
  body,
  note,
  children,
}: {
  tone: string;
  stats: { label: string; value: string }[];
  head: string;
  body: string;
  note: string;
  children: React.ReactNode;
}) {
  const ring = tone === "good" ? "border-green/50" : tone === "warn" ? "border-warning/50" : "border-danger/50";
  const dot = tone === "good" ? "bg-green" : tone === "warn" ? "bg-warning" : "bg-danger";
  return (
    <section aria-live="polite" className={`mt-6 rounded-2xl border-2 ${ring} bg-paper-elev p-5 sm:p-7`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Your result</p>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-ink-muted">{s.label}</dt>
            <dd className="font-serif text-3xl tabular-nums text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">{children}</div>
      <h3 className="mt-6 flex items-center gap-2 text-lg font-semibold text-ink">
        <span className={`size-2.5 rounded-full ${dot}`} aria-hidden />
        {head}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{body}</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{note}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Get your essay band-scored free <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/** The 60-minute Writing hour as one bar, so the trade-off is visible at a glance. */
function Hour({ segments, over = 0 }: { segments: { label: string; min: number; cls: string }[]; over?: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-ink-muted">
        <span>Your 60-minute Writing test</span>
        <span className="tabular-nums">0 → 60 min</span>
      </div>
      <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-paper-sunken" role="img" aria-label={segments.map((s) => `${s.label}: ${fmtMin(s.min)} minutes`).join("; ")}>
        {segments.map((s) =>
          s.min > 0 ? <div key={s.label} className={`${s.cls} h-full`} style={{ width: `${(s.min / HOUR) * 100}%` }} /> : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-soft">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${s.cls}`} aria-hidden />
            {s.label}: <span className="tabular-nums font-medium text-ink">{fmtMin(s.min)} min</span>
          </li>
        ))}
        {over > 0 && (
          <li className="flex items-center gap-1.5 font-medium text-danger">
            Over time by <span className="tabular-nums">{fmtMin(over)} min</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function clock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtMin(m: number) {
  return m >= 10 ? Math.round(m).toString() : m.toFixed(1);
}
