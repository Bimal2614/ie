/**
 * Mock catalogue skeleton — hero, the four section tiles, then the test cards.
 * See /section-practice/loading.tsx.
 */
export default function MockTestsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8" aria-busy aria-label="Loading mock tests">
      <div className="flex items-start gap-4">
        <div className="skeleton size-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-9 w-72 max-w-full" />
          <div className="skeleton h-4 w-full max-w-2xl" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-paper-elev p-5">
            <div className="skeleton size-7 rounded-md" />
            <div className="skeleton mt-3 h-5 w-24" />
            <div className="skeleton mt-2 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-line bg-paper-elev p-5">
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-52" />
              <div className="skeleton h-4 w-36" />
            </div>
            <div className="skeleton h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
