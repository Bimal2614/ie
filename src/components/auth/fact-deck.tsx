"use client";

import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Headphones, Mic, PenLine, Trophy, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The sign-in showcase: one card, one IELTS fact at a time, each with its own
 * drawing.
 *
 * Every fact is about the exam itself and checkable against the official
 * format, never about us: a candidate signing in learns something true while
 * they type, and nothing here can go stale with our numbers.
 *
 * COLOURS COME FROM THE PANEL, NOT FROM HERE. The drawings use four variables
 * the auth layout sets (--deck-ink, --deck-soft, --deck-accent,
 * --deck-accent-ink), so the same card is IELTSVega green on www and the
 * class's own colour on its subdomain. The card itself is always light, which
 * keeps the ink readable whatever colour a class picks.
 *
 * Auto-advance is a CSS animation on the active progress segment; when it ends
 * the next fact shows. Hovering pauses it, and reduced motion switches it off
 * entirely, leaving the arrows.
 */

type Fact = {
  skill: string;
  Icon: LucideIcon;
  title: string;
  body: string;
  Art: () => React.ReactElement;
};

const FACTS: Fact[] = [
  {
    skill: "Listening",
    Icon: Headphones,
    title: "You hear it once. Only once.",
    body: "Each recording plays a single time. Use the pause before every part to underline exactly what you are listening for.",
    Art: OnceArt,
  },
  {
    skill: "Reading",
    Icon: BookOpen,
    title: "Not Given is not False.",
    body: "False means the passage says the opposite. Not Given means it says nothing at all. Mixing them up is the classic Reading trap.",
    Art: StampsArt,
  },
  {
    skill: "Writing",
    Icon: PenLine,
    title: "Task 2 counts double.",
    body: "Task 2 is worth twice as much as Task 1, so give it 40 of your 60 minutes and start with it if you tend to run late.",
    Art: ScaleArt,
  },
  {
    skill: "Speaking",
    Icon: Mic,
    title: "One minute to plan, two to talk.",
    body: "In Part 2 you get a cue card, a pencil and one minute for notes. Then you speak for up to two minutes while the examiner listens.",
    Art: CueCardArt,
  },
  {
    skill: "Listening",
    Icon: Headphones,
    title: "One wrong letter, zero marks.",
    body: "A misspelt answer is marked wrong in Listening and Reading. British or American spelling are both fine, as long as it is spelt right.",
    Art: SpellingArt,
  },
  {
    skill: "Reading",
    Icon: BookOpen,
    title: "60 minutes. No extra time.",
    body: "Three passages, 40 questions and no transfer time at the end. Keep to about 20 minutes a passage and write answers as you go.",
    Art: ClockArt,
  },
  {
    skill: "Writing",
    Icon: PenLine,
    title: "249 words is a penalty.",
    body: "Write at least 150 words for Task 1 and 250 for Task 2. Falling short costs you marks, however good the rest is.",
    Art: WordCountArt,
  },
  {
    skill: "Band score",
    Icon: Trophy,
    title: "6.75 becomes 7.0.",
    body: "Your overall band is the average of the four skills, rounded to the nearest half. An average ending in .25 or .75 rounds up.",
    Art: BandArt,
  },
];

const SECONDS_PER_FACT = 7;

export function FactDeck({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const fact = FACTS[index];
  const go = (step: number) => setIndex((i) => (i + step + FACTS.length) % FACTS.length);

  return (
    <div
      className={cn(
        "group/deck relative w-full max-w-[30rem] rounded-[28px] bg-(--deck-card) p-6 text-(--deck-ink) shadow-[0_30px_80px_-30px_rgb(0_0_0/0.55)] xl:p-7",
        className,
      )}
    >
      {/* Header: which skill, and where we are in the deck. */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--deck-accent) px-3 py-1 text-xs font-semibold text-(--deck-accent-ink)">
          <fact.Icon className="size-3.5" strokeWidth={2.25} />
          {fact.skill}
        </span>
        <span className="text-xs font-semibold tabular-nums tracking-wider text-(--deck-muted)">
          {String(index + 1).padStart(2, "0")} / {String(FACTS.length).padStart(2, "0")}
        </span>
      </div>

      {/* Keyed so each fact replays the entrance. */}
      <div key={index} className="animate-[deck-in_480ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none">
        <div className="mt-5 grid h-[clamp(130px,24vh,210px)] place-items-center overflow-hidden rounded-2xl bg-(--deck-soft)">
          <fact.Art />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-(--deck-muted)">Did you know?</p>
        <h3 className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight">{fact.title}</h3>
        <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-(--deck-muted)">{fact.body}</p>
      </div>

      {/* Progress: one segment per fact; the active one fills, then moves on. */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {FACTS.map((f, i) => (
            <button
              key={f.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show fact ${i + 1}: ${f.title}`}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--deck-track)"
            >
              <span
                key={i === index ? `on-${index}` : `off-${i}`}
                onAnimationEnd={i === index ? () => go(1) : undefined}
                style={i === index ? { animationDuration: `${SECONDS_PER_FACT}s` } : undefined}
                className={cn(
                  "block h-full rounded-full bg-(--deck-accent)",
                  i < index && "w-full",
                  i > index && "w-0",
                  i === index &&
                    "w-0 animate-[deck-progress_linear_forwards] group-hover/deck:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none",
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous fact"
            className="grid size-8 place-items-center rounded-full bg-(--deck-soft) transition-colors hover:bg-(--deck-track)"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next fact"
            className="grid size-8 place-items-center rounded-full bg-(--deck-soft) transition-colors hover:bg-(--deck-track)"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Drawings — one per fact, on a shared 240×150 canvas.
 *
 * Ink strokes, soft fills and one accent, all from the deck's variables, and
 * each with a small joke that MOVES: a face that blinks at the one-time
 * recording, a NOT GIVEN stamp that slams down, a scale that tips under
 * Task 2, a microphone that will not stop talking, a red pen circling the
 * typo, a stopwatch spinning in a sweat, a pencil scribbling for word 250,
 * and a crown bouncing on the band.
 *
 * The motion is CSS (`.deck-art` in globals.css), so it costs no JavaScript,
 * replays each time a fact comes round (the card re-keys its content), and
 * stops entirely under prefers-reduced-motion.
 *
 * ANIMATE AN OUTER <g>, NEVER AN ELEMENT WITH ITS OWN transform="…": a CSS
 * transform replaces the attribute, and the drawing loses its tilt.
 * ------------------------------------------------------------------ */

const INK = "var(--deck-ink)";
const ACCENT = "var(--deck-accent)";
const ACCENT_INK = "var(--deck-accent-ink)";
const PAPER = "var(--deck-card)";

function Canvas({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 240 150"
      role="img"
      aria-label={label}
      className="deck-art size-full py-2"
      fill="none"
      stroke={INK}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ fontFamily: "inherit" }}
    >
      {children}
    </svg>
  );
}

/** Headphones around a face that blinks in alarm, waves leaving for good, a wobbling "1×". */
function OnceArt() {
  return (
    <Canvas label="Headphones with a play-once badge">
      <g className="a-bob">
        <path d="M72 84 A48 48 0 0 1 168 84" strokeWidth={6} />
        <rect x="58" y="78" width="22" height="40" rx="9" fill={ACCENT} />
        <rect x="160" y="78" width="22" height="40" rx="9" fill={ACCENT} />
        <circle cx="120" cy="96" r="30" fill={PAPER} />
        <g className="a-blink">
          <circle cx="109" cy="90" r="4.5" fill={INK} stroke="none" />
          <circle cx="131" cy="90" r="4.5" fill={INK} stroke="none" />
        </g>
        <path d="M103 80 l10 -3 M137 80 l-10 -3" />
        <circle className="a-gasp" cx="120" cy="108" r="5" />
      </g>
      {/* Sound waves leaving for good. */}
      <path className="a-wave" d="M44 86 q-8 12 0 24" />
      <path className="a-wave d2" d="M34 80 q-13 18 0 36" />
      <path className="a-wave" d="M196 86 q8 12 0 24" />
      <path className="a-wave d2" d="M206 80 q13 18 0 36" />
      <g className="a-wobble">
        <g transform="rotate(10 192 34)">
          <circle cx="192" cy="34" r="20" fill={ACCENT} />
          <text x="192" y="41" textAnchor="middle" fontSize="19" fontWeight="800" fill={ACCENT_INK} stroke="none">
            1×
          </text>
        </g>
      </g>
    </Canvas>
  );
}

/** TRUE and FALSE sit quietly; NOT GIVEN slams down, and the magnifier hunts for it. */
function StampsArt() {
  const stamp = (x: number, y: number, w: number, label: string, rot: number, hot = false) => (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + 14})`}>
      <rect x={x} y={y} width={w} height="28" rx="6" fill={hot ? ACCENT : PAPER} strokeDasharray={hot ? undefined : "4 4"} />
      <text
        x={x + w / 2}
        y={y + 19}
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="800"
        letterSpacing="1.5"
        fill={hot ? ACCENT_INK : INK}
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
  return (
    <Canvas label="True, False and Not Given stamps">
      <g className="a-fade">{stamp(22, 26, 72, "TRUE", -7)}</g>
      <g className="a-fade d1">{stamp(140, 22, 78, "FALSE", 6)}</g>
      <g className="a-slam">{stamp(58, 78, 124, "NOT GIVEN", -4, true)}</g>
      {/* Ink splats from the landing. */}
      <path className="a-splat" d="M52 86 l-8 -4 M50 100 l-10 0 M188 84 l8 -5 M190 98 l10 1" stroke={ACCENT} />
      <g className="a-hunt">
        <circle cx="176" cy="104" r="22" fill={PAPER} fillOpacity={0.35} />
        <path d="M192 120 l20 20" strokeWidth={7} />
        <path d="M168 96 a10 10 0 0 1 12 -4" opacity={0.6} />
      </g>
    </Canvas>
  );
}

/** A balance that starts level, then tips hard as Task 2's second weight drops on. */
function ScaleArt() {
  return (
    <Canvas label="A scale where Task 2 outweighs Task 1">
      <path d="M120 40 v86 M96 128 h48" />
      <g className="a-tip">
        <g transform="rotate(12 120 48)">
          <path d="M44 48 h152" strokeWidth={4} />
          <path d="M54 48 l-14 34 h40 z M186 48 l-14 34 h40 z" fill={PAPER} />
          <rect x="47" y="58" width="26" height="22" rx="4" fill={PAPER} />
          <text x="60" y="74" textAnchor="middle" fontSize="12" fontWeight="800" fill={INK} stroke="none">T1</text>
          <rect x="170" y="58" width="32" height="22" rx="4" fill={ACCENT} />
          <text x="186" y="74" textAnchor="middle" fontSize="12" fontWeight="800" fill={ACCENT_INK} stroke="none">T2</text>
          <g className="a-drop">
            <rect x="170" y="38" width="32" height="20" rx="4" fill={ACCENT} />
            <text x="186" y="53" textAnchor="middle" fontSize="11" fontWeight="800" fill={ACCENT_INK} stroke="none">×2</text>
          </g>
        </g>
      </g>
      <circle cx="120" cy="38" r="6" fill={ACCENT} />
    </Canvas>
  );
}

/** A cue card, a ticking timer and a microphone that will not stop talking. */
function CueCardArt() {
  return (
    <Canvas label="A speaking cue card with a one-minute timer">
      <g className="a-fade">
        <g transform="rotate(-5 90 76)">
          <rect x="26" y="28" width="124" height="94" rx="8" fill={PAPER} />
          <path d="M40 48 h70" strokeWidth={4} />
          <path className="a-write" pathLength={1} d="M40 66 h92 M40 80 h80 M40 94 h88 M40 108 h60" opacity={0.45} />
        </g>
      </g>
      <g className="a-pulse">
        <rect x="160" y="22" width="56" height="28" rx="14" fill={ACCENT} />
        <text x="188" y="41" textAnchor="middle" fontSize="14" fontWeight="800" fill={ACCENT_INK} stroke="none">1:00</text>
      </g>
      <g className="a-chatter">
        <rect x="170" y="64" width="34" height="50" rx="17" fill={PAPER} />
        <circle cx="181" cy="84" r="2.5" fill={INK} stroke="none" />
        <circle cx="193" cy="84" r="2.5" fill={INK} stroke="none" />
        <ellipse className="a-talk" cx="187" cy="97" rx="6" ry="4" fill={INK} stroke="none" />
      </g>
      <path d="M162 98 a25 25 0 0 0 50 0 M187 124 v12 M175 138 h24" />
      {/* Words coming out. */}
      <path className="a-wave" d="M218 74 q6 8 0 16" />
      <path className="a-wave d2" d="M226 68 q10 14 0 28" />
    </Canvas>
  );
}

/** The red pen circles the typo, scratches at it, then the right spelling writes itself in. */
function SpellingArt() {
  return (
    <Canvas label="Accommodation spelt wrong, then right">
      <rect x="24" y="22" width="192" height="106" rx="10" fill={PAPER} />
      <text x="120" y="62" textAnchor="middle" fontSize="20" fontWeight="700" fill={INK} stroke="none" opacity={0.75}>
        acomodation
      </text>
      <ellipse
        className="a-draw"
        pathLength={1}
        cx="120"
        cy="56"
        rx="78"
        ry="20"
        stroke={ACCENT}
        strokeWidth={3}
        transform="rotate(-3 120 56)"
      />
      <path className="a-draw d2" pathLength={1} d="M190 34 l14 -10 M196 44 l16 -4" stroke={ACCENT} />
      <g className="a-type">
        <text x="120" y="108" textAnchor="middle" fontSize="20" fontWeight="800" fill={INK} stroke="none">
          accommodation
        </text>
      </g>
      <path d="M44 114 h152" strokeDasharray="2 6" opacity={0.4} />
    </Canvas>
  );
}

/** Three passages and a stopwatch spinning in a sweat, its ring running down. */
function ClockArt() {
  return (
    <Canvas label="Three passages and a stopwatch">
      {[0, 1, 2].map((i) => (
        <g key={i} className={`a-fade d${i}`}>
          <g transform={`translate(${30 + i * 18} ${36 - i * 10})`}>
            <rect width="78" height="96" rx="6" fill={i === 2 ? PAPER : "var(--deck-soft)"} />
            {i === 2 && <path d="M12 18 h40 M12 32 h54 M12 44 h48 M12 56 h54 M12 68 h36" opacity={0.45} />}
          </g>
        </g>
      ))}
      <g className="a-shake">
        <circle cx="178" cy="86" r="36" fill={PAPER} />
        <path d="M170 44 h16 M178 44 v6" strokeWidth={4} />
        <circle className="a-drain" cx="178" cy="86" r="28" stroke={ACCENT} strokeWidth={6} transform="rotate(-90 178 86)" />
        <path className="a-spin" d="M178 86 v-16" />
        <path d="M178 86 l10 8" />
      </g>
      <path className="a-drip" d="M216 62 q4 8 0 12 q-4 -4 0 -12z" fill={ACCENT} />
      <path className="a-drip d2" d="M140 54 q-3 6 0 9 q3 -3 0 -9z" fill={ACCENT} />
    </Canvas>
  );
}

/** A pencil scribbling for dear life, 249 crossed out, and 250+ popping in. */
function WordCountArt() {
  return (
    <Canvas label="A word counter showing 249 of 250">
      <rect x="26" y="20" width="118" height="112" rx="8" fill={PAPER} />
      <path className="a-write" pathLength={1} d="M40 40 h88 M40 56 h80 M40 72 h90 M40 88 h70 M40 104 h52" opacity={0.45} />
      <g className="a-scribble">
        <g transform="rotate(35 120 100)">
          <rect x="112" y="40" width="16" height="78" rx="3" fill={ACCENT} />
          <path d="M112 118 l8 16 l8 -16 z" fill={PAPER} />
          <path d="M112 52 h16" />
        </g>
      </g>
      <rect x="160" y="36" width="64" height="40" rx="10" fill={PAPER} />
      <text x="192" y="63" textAnchor="middle" fontSize="20" fontWeight="800" fill={INK} stroke="none">249</text>
      <path className="a-draw d2" pathLength={1} d="M166 66 L218 46" stroke={ACCENT} strokeWidth={3.5} />
      <g className="a-pop d3">
        <rect x="160" y="88" width="64" height="34" rx="10" fill={ACCENT} />
        <text x="192" y="111" textAnchor="middle" fontSize="17" fontWeight="800" fill={ACCENT_INK} stroke="none">250+</text>
      </g>
    </Canvas>
  );
}

/** The four skill bars grow in, the average pops out as 7.0, and its crown will not sit still. */
function BandArt() {
  const bars = [
    { label: "L", band: 7 },
    { label: "R", band: 7 },
    { label: "W", band: 6.5 },
    { label: "S", band: 6.5 },
  ];
  return (
    <Canvas label="Four band scores averaging 6.75, rounded to 7.0">
      <path d="M22 128 h196" />
      {bars.map((b, i) => {
        const h = (b.band / 9) * 92;
        const x = 30 + i * 30;
        return (
          <g key={b.label}>
            <rect className={`a-grow d${i}`} x={x} y={128 - h} width="20" height={h} rx="4" fill={PAPER} />
            <text x={x + 10} y={142} textAnchor="middle" fontSize="10" fontWeight="800" fill={INK} stroke="none">{b.label}</text>
            <text className={`a-fade d${i + 1}`} x={x + 10} y={122 - h} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={INK} stroke="none">
              {b.band.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path className="a-fade d3" d="M152 76 h12 m-5 -5 l5 5 l-5 5" />
      <g className="a-pop d4">
        <rect x="172" y="50" width="48" height="78" rx="6" fill={ACCENT} />
        <text x="196" y="86" textAnchor="middle" fontSize="20" fontWeight="800" fill={ACCENT_INK} stroke="none">7.0</text>
        <text x="196" y="104" textAnchor="middle" fontSize="9" fontWeight="700" fill={ACCENT_INK} stroke="none">OVERALL</text>
      </g>
      <path className="a-hop" d="M182 42 l3 -14 l7 7 l4 -10 l4 10 l7 -7 l3 14 z" fill={ACCENT} strokeWidth={2} />
    </Canvas>
  );
}
