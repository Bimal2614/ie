import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { SECTIONS, QUESTION_TYPES, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import { SECTION_META } from "./ui";
import { cn } from "@/lib/utils";

/** How long ago, in plain words — "just now", "3h ago", "yesterday". */
function timeAgo(date: Date): string {
  const secs = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * "Continue where you left off" — a one-line resume banner pointing at the last
 * question type the learner practised. The player restores their last passage.
 */
export function ContinueCard({
  last,
}: {
  last: { section: string; questionType: string; setTitle: string | null; createdAt: Date };
}) {
  const section = last.section as SectionKey;
  const meta = SECTION_META[section];
  if (!meta) return null;

  const sectionLabel = SECTIONS[section]?.label ?? last.section;
  const typeLabel = QUESTION_TYPES[last.questionType as QuestionTypeKey]?.label ?? last.questionType;
  const { Icon } = meta;

  return (
    <Link
      href={`/practice/${last.section}/${last.questionType}`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-paper-elev p-4 transition-colors hover:border-brand/50 hover:bg-brand-soft"
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", meta.tile)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          <History className="size-3.5" /> Continue where you left off
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-ink">
          {sectionLabel} · {typeLabel}
        </p>
        <p className="truncate text-xs text-ink-muted">
          {last.setTitle ? `${last.setTitle} · ` : ""}
          {timeAgo(last.createdAt)}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-transform group-hover:scale-[1.03]">
        Resume <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
