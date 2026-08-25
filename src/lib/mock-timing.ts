/**
 * The mock-test exam clock.
 *
 * A real IELTS is not four independent stopwatches — it is one sitting with a
 * running-order. The invigilator does not stop the clock because you left the
 * room, and Listening does not wait for you to come back. So a sitting is
 * planned ONCE, as absolute instants, and every later question ("what section
 * am I on?", "how long is left?", "is this paper over?") is answered by asking
 * that plan where `now` falls.
 *
 * This is what makes resume behave like the exam hall rather than like a paused
 * video: start a paper, close the laptop 5 minutes into Listening, come back 50
 * minutes later, and you are 10 minutes into Reading with Listening gone. No
 * client can argue with it, because the plan is stored server-side and `now` is
 * the server's.
 *
 * Pure functions with no DB or React imports, so the action layer, the seed
 * builder and the player can all share the same arithmetic.
 */

import { SECTION_ORDER, type SectionKey } from "@/lib/ielts";

/* ------------------------------------------------------------------ *
 * Durations
 * ------------------------------------------------------------------ */

/**
 * Minutes each module is allowed in a mock sitting.
 *
 * Deliberately NOT `SECTIONS[x].durationMin`, which is the officially quoted
 * figure used in marketing copy. Two of them differ from what a candidate
 * actually sits:
 *
 *  - Listening is quoted as 30 minutes because that is the length of the
 *    recording; the paper-based test then gives 10 minutes to transfer answers,
 *    so the module is 40.
 *  - Speaking is quoted as "11-14 minutes", so a fixed clock has to pick the
 *    top of the range plus a little, or a candidate mid-answer is cut off.
 */
export const MOCK_MODULE_MINUTES: Record<SectionKey, number> = {
  listening: 40, // 30 min recording + 10 min transfer
  reading: 60,
  writing: 60, // Task 1 ~20 + Task 2 ~40, sat as one 60-minute block
  speaking: 15, // an 11-14 minute interview, with a margin
};

/** One line of exam-hall guidance per module, shown before it starts. */
export const MOCK_MODULE_NOTE: Record<SectionKey, string> = {
  listening:
    "The recording plays once. The last 10 minutes are for checking and transferring your answers.",
  reading: "60 minutes for all three passages. No extra transfer time.",
  writing: "Spend about 20 minutes on Task 1 and 40 on Task 2. Task 2 is worth twice as much.",
  speaking: "Answer out loud and record each turn. Part 2 gives you 1 minute to prepare.",
};

export function moduleSeconds(section: SectionKey): number {
  return MOCK_MODULE_MINUTES[section] * 60;
}

/** Minutes for a whole paper made of these modules. */
export function totalMinutes(sections: SectionKey[]): number {
  return sections.reduce((n, s) => n + MOCK_MODULE_MINUTES[s], 0);
}

/* ------------------------------------------------------------------ *
 * The timeline
 * ------------------------------------------------------------------ */

/**
 * One module's slot in a sitting. Instants are ISO strings because this lives
 * in a jsonb column and travels through server actions — a `Date` would arrive
 * as a string on one side of that boundary and a Date on the other.
 */
export type MockModuleSlot = {
  section: SectionKey;
  /** Position in the paper, 0-based. */
  index: number;
  startsAt: string;
  endsAt: string;
};

export type MockTimeline = MockModuleSlot[];

/** Plan a sitting: each module follows the last, starting at `from`. */
export function buildTimeline(sections: SectionKey[], from: Date = new Date()): MockTimeline {
  let cursor = from.getTime();
  return sections.map((s, index) => {
    const startsAt = cursor;
    cursor += moduleSeconds(s) * 1000;
    return {
      section: s,
      index,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(cursor).toISOString(),
    };
  });
}

/**
 * Move every module from `fromIndex` onward to start at `at`.
 *
 * The ONE thing that shifts a plan, and only ever earlier: a candidate who
 * finishes Reading with 12 minutes to spare goes straight into Writing instead
 * of watching a clock run down. Their Writing hour is still an hour — an early
 * finish buys back the waiting, never extra time — and the modules behind it
 * move up with it, so the paper simply ends 12 minutes sooner.
 *
 * THE MODULE BEING LEFT IS CLOSED AT `at`. Without that its window still covers
 * the present, and since the windows are searched in order, `resolveTimeline`
 * would put the candidate straight back into the module they just handed in —
 * with the time they thought they had given up still on the clock. It is also
 * simply true: the module ended when they finished it.
 *
 * Earlier modules are otherwise left exactly as they were. They are history, and
 * rewriting them would rewrite how long the candidate actually had.
 */
export function rebaseTimeline(
  timeline: MockTimeline,
  fromIndex: number,
  at: Date = new Date(),
): MockTimeline {
  const now = at.getTime();
  let cursor = now;
  return timeline.map((slot) => {
    if (slot.index < fromIndex - 1) return slot;
    if (slot.index === fromIndex - 1) {
      // Truncate, never extend: a module whose bell already went keeps the end
      // it had, or an advance arriving late would hand back time.
      const ends = Math.min(Date.parse(slot.endsAt), now);
      return { ...slot, endsAt: new Date(Math.max(ends, Date.parse(slot.startsAt))).toISOString() };
    }
    const startsAt = cursor;
    cursor += moduleSeconds(slot.section) * 1000;
    return {
      ...slot,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(cursor).toISOString(),
    };
  });
}

export type TimelinePosition = {
  /** Index into the timeline of the module the clock is in. */
  index: number;
  section: SectionKey;
  /** Seconds left in that module. 0 only when the whole paper is over. */
  remainingSeconds: number;
  /** The clock has run past the last module — the paper is finished. */
  expired: boolean;
};

/**
 * Where the clock is now.
 *
 * Not "where the candidate left off": a module whose window has passed is gone
 * whether or not it was answered, which is the whole point of a fixed timeline.
 * Which modules that cost them is a separate question — it needs to know where
 * they were, not just where the clock is — and is answered by `skippedBetween`.
 */
export function resolveTimeline(
  timeline: MockTimeline,
  now: Date = new Date(),
): TimelinePosition | null {
  if (timeline.length === 0) return null;
  const t = now.getTime();

  const last = timeline[timeline.length - 1];
  if (t >= Date.parse(last.endsAt)) {
    return {
      index: last.index,
      section: last.section,
      remainingSeconds: 0,
      expired: true,
    };
  }

  // Before the first module's start (clock skew, or a plan built a moment
  // ahead): the sitting has not begun, so it is at module 0 with its full time.
  const first = timeline[0];
  if (t < Date.parse(first.startsAt)) {
    return {
      index: first.index,
      section: first.section,
      remainingSeconds: moduleSeconds(first.section),
      expired: false,
    };
  }

  const at = timeline.find((s) => t >= Date.parse(s.startsAt) && t < Date.parse(s.endsAt));
  // Gaps are impossible by construction (each slot starts where the last ended),
  // but a hand-edited plan should degrade to "the next module that hasn't ended"
  // rather than throwing a candidate out of their exam.
  const slot = at ?? timeline.find((s) => t < Date.parse(s.endsAt)) ?? last;

  return {
    index: slot.index,
    section: slot.section,
    remainingSeconds: Math.max(0, Math.round((Date.parse(slot.endsAt) - t) / 1000)),
    expired: false,
  };
}

/**
 * The modules whose time ran out rather than being handed in.
 *
 * `from` is where the sitting was last recorded as being, `to` is where the
 * clock is now: everything in between closed on the bell. Handing a module in
 * moves the recorded position with it, so a candidate working through the paper
 * in order always gets an empty list — and someone who closed their laptop
 * during Listening and came back an hour later is told exactly what it cost.
 *
 * Deliberately NOT "every module before the current one": that is equally true
 * of a normal sitting, and would leave a warning about lost time on screen for
 * the rest of the paper.
 */
export function lapsedBetween(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(0, from); i < to; i++) out.push(i);
  return out;
}

/** When the whole paper ends — the last module's deadline. */
export function timelineEnd(timeline: MockTimeline): Date | null {
  if (timeline.length === 0) return null;
  return new Date(Date.parse(timeline[timeline.length - 1].endsAt));
}

/**
 * Read a stored `timeline` column back, discarding anything that isn't a plan
 * we recognise. A session written before a schema change, or by hand, must fail
 * closed to "no plan" rather than produce a timeline with NaN deadlines.
 */
export function parseTimeline(raw: unknown): MockTimeline {
  if (!Array.isArray(raw)) return [];
  const out: MockTimeline = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const s = v as Record<string, unknown>;
    if (!SECTION_ORDER.includes(s.section as SectionKey)) continue;
    if (typeof s.startsAt !== "string" || typeof s.endsAt !== "string") continue;
    if (Number.isNaN(Date.parse(s.startsAt)) || Number.isNaN(Date.parse(s.endsAt))) continue;
    out.push({
      section: s.section as SectionKey,
      index: typeof s.index === "number" ? s.index : out.length,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
    });
  }
  return out.sort((a, b) => a.index - b.index);
}
