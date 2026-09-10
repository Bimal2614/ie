/**
 * Practice hub skeleton — hero over the four section cards. Same purpose as the
 * boundaries a level down: commit the navigation now, and give `<Link>`
 * prefetch a shell to cache. See ./[section]/loading.tsx.
 */
export default function PracticeLoading() {
  return (
    <div className="space-y-10" aria-busy aria-label="Loading practice">
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-9 w-96 max-w-full" />
        <div className="skeleton h-5 w-full max-w-2xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-full flex-col rounded-xl border border-line bg-paper-elev p-6 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="skeleton h-11 w-11 rounded-xl" />
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
            <div className="skeleton mt-4 h-6 w-32" />
            <div className="skeleton mt-2 h-4 w-full" />
            <div className="skeleton mt-6 h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
