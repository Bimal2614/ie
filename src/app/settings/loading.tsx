/**
 * Settings skeleton — the profile and password cards.
 * See /section-practice/loading.tsx.
 */
export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6" aria-busy aria-label="Loading settings">
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-48" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface space-y-4 p-5">
          <div className="skeleton h-5 w-40" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
