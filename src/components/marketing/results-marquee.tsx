import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { STUDENT_RESULTS, initials, type StudentResult } from "@/lib/student-results";
import { cn } from "@/lib/utils";

/**
 * ResultsMarquee — two rails of student band jumps, looping in opposite
 * directions, forever. Replaces the three-card grid in the #results section.
 *
 * DELIBERATELY NOT A CLIENT COMPONENT. The whole effect is CSS (see the
 * marquee block in globals.css), so this ships zero JavaScript and the rail is
 * already looping in the server-rendered HTML. Marquees that measure their own
 * width in `useEffect` and set a pixel offset are the usual approach, and they
 * share the same two bugs: a flash of unlooped content before hydration, and a
 * re-measure storm on resize. Duplicating the group and translating -50%
 * avoids both — the loop point is a ratio, so it holds at every width with no
 * measurement at all.
 *
 * The card keeps the page's existing language (rounded-2xl, hairline border,
 * elevated surface, shadow on hover) so the rail reads as part of the same
 * design rather than as a widget dropped into it.
 */

/** Seconds for one full loop; longer is slower. Row two is deliberately not a
 *  multiple of row one, so the two rails never resynchronise and the pairing
 *  between them stays invisible. */
const ROW_ONE_DURATION = 72;
const ROW_TWO_DURATION = 88;

export function ResultsMarquee() {
  // Split down the middle: 14 students becomes 7 and 7. An odd count puts the
  // extra card in the top row, which is the one the eye lands on first.
  const half = Math.ceil(STUDENT_RESULTS.length / 2);
  const rowOne = STUDENT_RESULTS.slice(0, half);
  const rowTwo = STUDENT_RESULTS.slice(half);

  return (
    <div
      className="marquee"
      // Declared once here so the visual gap between cards and the gap the
      // loop maths depends on can never drift apart — the trailing padding on
      // each group reads this same variable.
      style={{ "--marquee-gap": "1.25rem" } as React.CSSProperties}
    >
      <Rail items={rowOne} duration={ROW_ONE_DURATION} />
      <Rail items={rowTwo} duration={ROW_TWO_DURATION} reverse className="mt-5" />
    </div>
  );
}

function Rail({
  items,
  duration,
  reverse = false,
  className,
}: {
  items: StudentResult[];
  duration: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("marquee-row", reverse && "marquee-row-reverse", className)}
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
    >
      <ul className="marquee-group">
        {items.map((s) => (
          <ResultCard key={s.name} student={s} />
        ))}
      </ul>
      {/* The seam-filler: identical markup, hidden from the accessibility tree
          so each student is announced exactly once. Under reduced motion the
          CSS drops it and the rail becomes a plain scrollable list. */}
      <ul className="marquee-group" aria-hidden="true">
        {items.map((s) => (
          <ResultCard key={`${s.name}-loop`} student={s} />
        ))}
      </ul>
    </div>
  );
}

/**
 * The student's face if there is one, their initials if there is not.
 *
 * Both branches render the SAME 72px disc, so a rail that is only half
 * photographed still has a straight edge down the left of every card — which
 * is what makes filling these in gradually safe. Keep the two in sync: if the
 * disc changes size here it must change in both branches, and the card's fixed
 * height in ResultCard has to absorb the difference.
 *
 * ON THE EMPTY ALT. The student's name sits immediately to the right of this
 * image as real text. An alt of "Priya S." would make a screen reader announce
 * the name twice in a row, and the photo carries nothing a non-sighted reader
 * needs beyond that name, so it is marked presentational. This is the one
 * place on the page where empty alt is the correct answer rather than a
 * shortcut — the score-report screenshots elsewhere all carry real alt text.
 */
function Avatar({ student: s }: { student: StudentResult }) {
  if (s.photo) {
    return (
      <Image
        src={s.photo}
        alt=""
        width={144}
        height={144}
        // 72px on every breakpoint, so state it and let Next serve the 2x
        // variant instead of assuming 100vw and shipping a full-width image
        // into a disc. The rail renders each student twice, but both copies
        // request the identical URL, so it is one fetch per student.
        sizes="72px"
        className="size-18 shrink-0 rounded-full object-cover ring-1 ring-line"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-18 shrink-0 place-items-center rounded-full bg-brand-soft text-base font-bold tracking-wide text-brand"
    >
      {initials(s.name)}
    </span>
  );
}

function ResultCard({ student: s }: { student: StudentResult }) {
  const gain = s.to - s.from;

  return (
    // Fixed width AND fixed height. A rail of ragged-height cards is the
    // fastest way to make an otherwise clean marquee look unfinished, so the
    // quote clamps to three lines rather than the card growing to fit it.
    // The height carries the 72px avatar: it is the tallest thing in the
    // header row, so it — not the name/place stack — sets that row's height.
    <li className="h-[15.5rem] w-[19.5rem] shrink-0 sm:w-[21.5rem]">
      <figure className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-5 transition-shadow hover:shadow-lg">
        {/* The name gets this row to itself. At 72px the avatar leaves about
            114px beside it on the narrow (19.5rem) card, and these are real
            full names — "Rushikesh Kakadiya" truncated to "Rushikesh Kaka…"
            in a testimonial reads as a bug. The module tag moved to the
            footer, where it sits next to the band it describes. */}
        <div className="flex items-center gap-3">
          <Avatar student={s} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
            <p className="truncate text-xs text-ink-muted">{s.place}</p>
          </div>
        </div>

        <blockquote className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-soft">
          &ldquo;{s.quote}&rdquo;
        </blockquote>

        <figcaption className="mt-auto flex items-center gap-2.5 border-t border-line pt-3.5">
          <span className="text-sm tabular-nums text-ink-muted line-through">{s.from.toFixed(1)}</span>
          <ArrowRight aria-hidden className="size-3.5 shrink-0 text-ink-muted" />
          <span className="font-serif text-2xl leading-none tabular-nums text-green">{s.to.toFixed(1)}</span>
          <span className="ml-auto shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand">
            {s.module}
          </span>
          <span className="shrink-0 rounded-full bg-green-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-green-ink">
            +{gain.toFixed(1)}
          </span>
        </figcaption>
      </figure>
    </li>
  );
}
