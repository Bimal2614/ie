/**
 * Dashboard loading skeleton — mirrors the real layout (greeting, stat row,
 * focus + mock, section grid, activity) so content settles in place rather than
 * popping. Shown by Next's route-level Suspense while stats are fetched.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading dashboard">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-9 w-72" />
        </div>
        <div className="skeleton h-9 w-28 rounded-full" />
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-paper-elev shadow-sm p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-8 w-16" />
            <div className="skeleton mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Focus + mock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-elev shadow-sm p-6 lg:col-span-2">
          <div className="skeleton h-3 w-32" />
          <div className="mt-4 flex items-center gap-4">
            <div className="skeleton size-14 rounded-2xl" />
            <div className="space-y-2">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-3 w-64" />
            </div>
          </div>
          <div className="skeleton mt-6 h-10 w-44 rounded-xl" />
        </div>
        <div className="skeleton h-56 rounded-2xl" />
      </div>

      {/* Section grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-paper-elev shadow-sm p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="skeleton size-10 rounded-xl" />
              <div className="skeleton h-8 w-14" />
            </div>
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-3 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
