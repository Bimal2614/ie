import Link from "next/link";
import { Trophy } from "lucide-react";
import type { DashboardStats } from "@/app/actions/dashboard";
import { LocalTime } from "@/components/history/local-time";
import { SectionHeading, DashEmpty, BandCell, cardClass } from "./ui";
import { cn } from "@/lib/utils";

/** Recent mock-test band reports. */
export function MockResults({ mocks }: { mocks: DashboardStats["recentMocks"] }) {
  return (
    <section className="flex flex-col">
      <SectionHeading title="Mock results" href="/results" cta="All" />
      {mocks.length > 0 ? (
        // One bordered card with divided rows — mirrors RecentActivity so both
        // columns fill the grid row to the same height whatever the row count.
        <div className={cn(cardClass, "flex-1 divide-y divide-line overflow-hidden")}>
          {mocks.slice(0, 3).map((m) => (
            <Link
              key={m.id}
              href={`/results/${m.id}`}
              className="block p-4 transition-colors hover:bg-paper-sunken"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="chip capitalize">{m.module}</span>
                {m.completedAt && (
                  <span className="text-xs text-ink-muted">
                    <LocalTime value={new Date(m.completedAt).toISOString()} options={{ day: "numeric", month: "short" }} />
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                <BandCell label="L" value={m.listeningBand} />
                <BandCell label="R" value={m.readingBand} />
                <BandCell label="W" value={m.writingBand} />
                <BandCell label="S" value={m.speakingBand} />
                <BandCell label="OA" value={m.overallBand} highlight />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <DashEmpty className="flex-1" text="No mock tests yet." href="/mock-tests" cta="Take a mock" icon={<Trophy className="size-5" />} />
      )}
    </section>
  );
}
