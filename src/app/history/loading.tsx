/**
 * History skeleton — filter row over the attempt list.
 *
 * See /section-practice/loading.tsx: the boundary is what lets the router
 * commit the navigation instead of holding the previous page through a cold
 * start.
 */
export default function HistoryLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" aria-busy aria-label="Loading history">
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-5 w-full max-w-xl" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>

      <div className="surface divide-y divide-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="skeleton size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-3 w-32" />
            </div>
            <div className="skeleton h-6 w-14 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
