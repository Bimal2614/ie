/**
 * Exam-part player skeleton — the <ExamShell/> chrome while the part loads.
 * See ../loading.tsx.
 */
export default function SectionPartLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl" aria-busy aria-label="Loading exam part">
      <div className="surface pb-0">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="skeleton h-2.5 w-36" />
            <div className="skeleton h-4 w-52" />
          </div>
          <div className="skeleton h-8 w-24 rounded-md" />
        </div>

        <div className="border-b border-line px-4 py-3">
          <div className="skeleton h-4 w-2/3 max-w-lg" />
        </div>

        <div className="space-y-3 px-4 py-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-4" style={{ width: `${94 - (i % 5) * 8}%` }} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
