/**
 * Section-wise skeleton — hero, filter row, then the source list.
 *
 * Without a boundary here the router holds the OLD page until this one is
 * rendered, so a cold function (measured at 9–19 s against ~300 ms warm) looked
 * like a dead click. The boundary lets the navigation commit at once and gives
 * `<Link>` prefetch a shell to cache. Same reason as the /practice tree's.
 */
export default function SectionPracticeLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" aria-busy aria-label="Loading section-wise practice">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-8 w-72 max-w-full" />
          <div className="skeleton h-5 w-full max-w-2xl" />
        </div>
        <div className="skeleton h-7 w-40 rounded-full" />
      </div>

      {/* Section filter chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-28 rounded-full" />
        ))}
      </div>

      {/* Source rows */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-line bg-paper-elev p-5">
            <div className="skeleton size-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="skeleton h-8 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
