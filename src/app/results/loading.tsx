/**
 * Mock results skeleton. See /section-practice/loading.tsx for why every
 * authenticated route wants one.
 */
export default function ResultsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6" aria-busy aria-label="Loading results">
      <div className="space-y-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-5 w-full max-w-lg" />
      </div>

      <div className="surface divide-y divide-line">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="skeleton size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton h-7 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
