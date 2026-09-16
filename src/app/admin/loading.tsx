/**
 * Admin panel skeleton — stat tiles over a table.
 *
 * ONE boundary for the whole panel: a `loading.tsx` covers its segment and
 * every segment below it, so /admin/students, /admin/transactions and the rest
 * inherit this instead of each needing a copy. The panel is the lowest-traffic
 * part of the app, which is exactly why it is the most likely to meet a cold
 * function — measured at 19 s on /admin against ~320 ms once warm — and
 * without a boundary all of that is spent on the page the admin just left.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading admin">
      <div className="space-y-2">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-8 w-52" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-paper-elev p-5 shadow-sm">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-7 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-paper-elev shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <div className="skeleton h-5 w-40" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="skeleton size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-44" />
                <div className="skeleton h-3 w-56" />
              </div>
              <div className="skeleton h-6 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
