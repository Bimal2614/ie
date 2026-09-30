/**
 * Partner panel skeleton. Covers the nested student routes too — see
 * ../admin/loading.tsx for why one boundary per panel is enough.
 */
export default function PartnerLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading partner panel">
      <div className="space-y-2">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-8 w-56" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-paper-elev p-5 shadow-sm">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-paper-elev shadow-sm divide-y divide-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="skeleton size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-52" />
            </div>
            <div className="skeleton h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
