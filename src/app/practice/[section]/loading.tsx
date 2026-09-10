/**
 * Section page skeleton — header (icon, title, meta chips) over the task-card
 * grid, in the same shape as page.tsx so the real cards settle in place.
 *
 * IT IS NOT ONLY A SPINNER. Without a loading boundary the App Router has
 * nothing to show until the whole RSC payload lands, so a click sat on the
 * PREVIOUS page for the length of a server round trip with no sign it had
 * registered — and `<Link>` prefetch, which for a dynamic route fetches only as
 * far as the nearest loading boundary, had nothing to fetch and did nothing.
 * With this file the navigation commits immediately and the prefetched shell is
 * already in the router cache when the click happens.
 */
export default function SectionLoading() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading practice tasks">
      {/* Header: icon + title + blurb + chips */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="skeleton h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-4 w-80 max-w-full" />
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="skeleton h-6 w-28 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
            <div className="skeleton h-6 w-32 rounded-full" />
          </div>
        </div>
      </div>

      {/* Task cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-full flex-col gap-3 rounded-xl border border-line bg-paper-elev p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-5 w-16 shrink-0 rounded-full" />
            </div>
            <div className="skeleton h-4 w-full" />
            <div className="flex flex-wrap gap-1">
              <div className="skeleton h-4 w-16 rounded-full" />
              <div className="skeleton h-4 w-20 rounded-full" />
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-1">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
