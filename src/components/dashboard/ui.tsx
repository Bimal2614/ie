import Link from "next/link";
import { Headphones, BookOpen, PenLine, Mic, ArrowRight, type LucideIcon } from "lucide-react";
import { type SectionKey } from "@/lib/ielts";
import { cn } from "@/lib/utils";

/**
 * Shared dashboard building blocks. One home for the card surface, section
 * heading, stat tile, band cell, and the section presentation map — so the page
 * composes these instead of repeating class strings and colour lookups.
 *
 * Section colour comes from the design tokens; the classes are spelled out in
 * full (never `chip-${key}`) because Tailwind only keeps classes it can read
 * literally in the source.
 */

// The single colour accent (green) lives in the design tokens as `--green`,
// used via `bg-green` / `text-green` / `text-green-ink` classes — never an
// inline colour. Everything else on the dashboard stays monochrome.

// Minimal light dashboard: section tiles are monochrome.
const tile = "bg-paper-sunken text-ink-soft";
export const SECTION_META: Record<SectionKey, { Icon: LucideIcon; tile: string }> = {
  listening: { Icon: Headphones, tile },
  reading: { Icon: BookOpen, tile },
  writing: { Icon: PenLine, tile },
  speaking: { Icon: Mic, tile },
};

/**
 * Base card surface — light, hairline border + a soft shadow for depth (reads
 * as "premium/distinguishable" without heavy boxy borders). `cardInteractive`
 * deepens the shadow on hover for clickable cards.
 */
export const cardClass = "rounded-2xl border border-line bg-paper-elev shadow-sm";
export const cardInteractive = cn(cardClass, "transition-shadow hover:shadow-lg");

/** Section heading with an optional "see all" link. */
export function SectionHeading({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-semibold text-lg text-ink">{title}</h2>
      {href && cta && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          {cta} <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn(cardClass, "p-5")}>
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">
        {icon} {label}
      </span>
      <p className="mt-2 font-semibold text-3xl tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}

/** Graceful placeholder for a panel with no data yet (never a blank hole). */
export function DashEmpty({
  text,
  href,
  cta,
  icon,
  className,
}: {
  text: string;
  href: string;
  cta: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(cardClass, "flex min-h-40 flex-col items-center justify-center gap-3 border-dashed p-6 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
        {icon ?? <ArrowRight className="size-5" />}
      </span>
      <p className="text-sm text-ink-muted">{text}</p>
      <Link href={href} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper-elev px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken">
        {cta} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

/** A single band score in a mock-result grid. */
export function BandCell({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg py-2", highlight ? "bg-brand-soft" : "bg-paper-sunken")}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className={cn("font-semibold text-base tabular-nums", highlight ? "text-brand" : "text-ink", !value && "text-ink-muted")}>
        {value ?? "—"}
      </p>
    </div>
  );
}
