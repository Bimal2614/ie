import Link from "next/link";
import { Clock, CheckCircle, Activity } from "lucide-react";
import { SECTIONS, QUESTION_TYPES, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import type { DashboardStats } from "@/app/actions/dashboard";
import { LocalTime } from "@/components/history/local-time";
import { SectionHeading, DashEmpty, cardClass } from "./ui";
import { cn } from "@/lib/utils";

/** The last handful of attempts, each linking to its full review. */
export function RecentActivity({ items }: { items: DashboardStats["recentActivity"] }) {
  return (
    <section className="flex flex-col">
      <SectionHeading title="Recent activity" href="/history" cta="Full history" />
      {items.length > 0 ? (
        <div className={cn(cardClass, "flex-1 divide-y divide-line overflow-hidden")}>
          {items.slice(0, 6).map((a) => (
            <ActivityRow key={a.attemptId} attempt={a} />
          ))}
        </div>
      ) : (
        <DashEmpty className="flex-1" text="Your attempts will appear here." href="/practice" cta="Practise" />
      )}
    </section>
  );
}

function ActivityRow({ attempt: a }: { attempt: DashboardStats["recentActivity"][number] }) {
  const meta = QUESTION_TYPES[a.questionType as QuestionTypeKey];
  const secInfo = SECTIONS[a.section as SectionKey];
  const scored = a.graded > 0;
  const allRight = scored && a.correct === a.graded;

  return (
    <Link href={`/history/${a.attemptId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper-sunken">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          allRight ? "bg-green-soft text-green" : "bg-paper-sunken text-ink-muted",
        )}
      >
        {!scored ? <Clock className="size-4" /> : allRight ? <CheckCircle className="size-4" /> : <Activity className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{meta?.label ?? a.questionType}</p>
        <p className="truncate text-xs text-ink-muted">
          {secInfo?.label ?? a.section} · {a.questions} question{a.questions !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {scored ? (
          <span className="font-semibold text-lg tabular-nums text-ink">{a.correct}/{a.graded}</span>
        ) : a.avgBand !== null ? (
          <span className="font-semibold text-lg tabular-nums text-ink">{a.avgBand.toFixed(1)}</span>
        ) : (
          <span className="text-xs text-ink-muted">Pending</span>
        )}
        <p className="text-[10px] text-ink-muted">
          <LocalTime value={a.createdAt.toISOString()} options={{ hour: "2-digit", minute: "2-digit" }} />
        </p>
      </div>
    </Link>
  );
}
