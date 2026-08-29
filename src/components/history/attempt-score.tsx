import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * An attempt's headline score: "3 / 4" for objective sets, a band for
 * AI-scored ones. A single tick would be a lie for a 4-gap table.
 *
 * Lives on its own because both the History day view and the in-player history
 * panel print it, and a candidate comparing the two must not have to work out
 * whether two differently-shaped chips mean the same thing.
 */
export function AttemptScoreChip({
  correct,
  graded,
  avgBand,
  className,
}: {
  correct: number;
  graded: number;
  /** Mean band across AI-scored answers, or null when none are scored yet. */
  avgBand: number | null;
  className?: string;
}) {
  if (graded === 0) {
    return avgBand !== null ? (
      <span
        className={cn(
          "rounded bg-info-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-info",
          className,
        )}
      >
        Band {avgBand.toFixed(1)}
      </span>
    ) : (
      <span className={cn("rounded bg-paper-elev px-1.5 py-0.5 text-[11px] text-ink-muted", className)}>
        Awaiting score
      </span>
    );
  }
  const all = correct === graded;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
        all ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
        className,
      )}
    >
      {all ? <Check className="size-3" /> : <X className="size-3" />}
      {correct}/{graded}
    </span>
  );
}
