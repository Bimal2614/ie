/**
 * Player skeleton — the chrome of <PracticeSession/> (top bar, body, footer)
 * while the first set and the attempted-set list are fetched.
 *
 * Same reason as the section page's boundary: it is what lets the router commit
 * the navigation at once, and what gives `<Link>` prefetch something to put in
 * the cache before the click. See ../loading.tsx.
 */
export default function PracticeTypeLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl" aria-busy aria-label="Loading practice">
      <div className="surface pb-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="skeleton h-2.5 w-32" />
            <div className="skeleton h-4 w-44" />
          </div>
          <div className="skeleton h-8 w-24 rounded-md" />
        </div>

        {/* Instruction bar */}
        <div className="border-b border-line px-4 py-3">
          <div className="skeleton h-4 w-2/3 max-w-lg" />
        </div>

        {/* Body */}
        <div className="space-y-3 px-4 py-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-4" style={{ width: `${92 - (i % 4) * 9}%` }} />
          ))}
          <div className="pt-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`q${i}`} className="rounded-lg border border-line p-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton mt-3 h-9 w-full rounded-md" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
