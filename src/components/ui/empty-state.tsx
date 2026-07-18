import Link from "next/link";

/**
 * A premium empty state — a soft illustrated mark, a serif line, supporting
 * copy, and a primary action. Reusable across dashboard / practice / history so
 * "no data yet" always feels intentional, never blank.
 *
 * The illustration is inline SVG (crisp at any size, theme-aware via
 * currentColor, no asset to load). Pass a different `art` per surface.
 */
export function EmptyState({
  art,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: {
  art?: React.ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-paper-elev/50 px-6 py-16 text-center">
      <div className="text-brand">{art ?? <RisingChartArt />}</div>
      <h3 className="mt-6 text-2xl tracking-tight text-ink" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">{description}</p>
      {(actionHref || secondaryHref) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-hover"
            >
              {actionLabel}
            </Link>
          )}
          {secondaryHref && secondaryLabel && (
            <Link
              href={secondaryHref}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper-elev px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** A rising-bars-to-target line illustration, in the brand colour. */
export function RisingChartArt() {
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden>
      <circle cx="56" cy="56" r="54" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
      <circle cx="56" cy="56" r="40" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" strokeDasharray="4 6" />
      {/* rising bars */}
      <rect x="38" y="62" width="8" height="18" rx="3" fill="currentColor" fillOpacity="0.35" />
      <rect x="52" y="52" width="8" height="28" rx="3" fill="currentColor" fillOpacity="0.55" />
      <rect x="66" y="40" width="8" height="40" rx="3" fill="currentColor" />
      {/* trend line + arrowhead */}
      <path d="M34 60 L48 50 L60 54 L78 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 34 L78 34 L78 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
