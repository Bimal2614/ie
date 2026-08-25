import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, Headphones, Mic, PenLine, Trophy } from "lucide-react";
import { requireUser } from "@/lib/dal";
import { getMockCatalogue } from "@/app/actions/mock";
import { SECTIONS, SECTION_ORDER, type SectionKey } from "@/lib/ielts";
import { MOCK_MODULE_MINUTES, MOCK_MODULE_NOTE, totalMinutes } from "@/lib/mock-timing";
import { MockCatalogue } from "@/components/mock/mock-catalogue";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mock tests · IELTSVega", robots: { index: false } };

const SECTION_ICON: Record<SectionKey, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

/**
 * The mock hub.
 *
 * Papers are listed for the candidate's own module — a General Training
 * candidate never sees an Academic paper by default, because they will never sit
 * one. The other stream is one link away for anyone who wants to look, and the
 * module is still resolved server-side, so the link widens what is *shown*, not
 * what a filter would allow.
 */
export default async function MockTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const user = await requireUser();
  const { module: requested } = await searchParams;
  const { module, tests } = await getMockCatalogue(requested ?? null);

  const total = totalMinutes(SECTION_ORDER);
  const isTheirs = module === user.targetModule;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl chip-accent">
          <Trophy className="size-6" />
        </div>
        <div className="min-w-0">
          <h1 className="display text-3xl">Full mock tests</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Complete Cambridge papers, sat end to end on the real exam clock. Every test is fixed —
            the same four modules, in the book&apos;s own order, every time you take it.
          </p>
        </div>
      </div>

      {/* Module switch. The candidate's own stream is the default. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-line bg-paper-elev p-0.5">
          {(["academic", "general"] as const).map((m) => (
            <Link
              key={m}
              href={m === user.targetModule ? "/mock-tests" : `/mock-tests?module=${m}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                module === m ? "bg-brand text-white" : "text-ink-soft hover:text-ink",
              )}
            >
              {m === "academic" ? "Academic" : "General Training"}
            </Link>
          ))}
        </div>
        {!isTheirs && (
          <p className="text-xs text-ink-muted">
            You&apos;re studying for {user.targetModule === "general" ? "General Training" : "Academic"}.
            <Link href="/settings" className="ml-1 text-brand underline-offset-2 hover:underline">
              Change your target
            </Link>
          </p>
        )}
      </div>

      {/* How a sitting runs — the clock rules, stated before it starts. */}
      <div className="rounded-xl border border-line bg-paper-elev p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">How a sitting runs</p>
          <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <Clock className="size-3.5" /> {Math.floor(total / 60)}h {total % 60}m end to end
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SECTION_ORDER.map((s) => {
            const sec = SECTIONS[s];
            const Icon = SECTION_ICON[s];
            return (
              <div key={s} className="rounded-lg border border-line p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("grid size-7 place-items-center rounded-md", `chip-${sec.accent}`)}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-ink">{sec.label}</span>
                  <span className="ml-auto text-[11px] tabular-nums text-ink-muted">
                    {MOCK_MODULE_MINUTES[s]}m
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-ink-muted">{MOCK_MODULE_NOTE[s]}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 rounded-lg bg-paper-sunken px-3 py-2 text-xs leading-relaxed text-ink-muted">
          <strong className="font-semibold text-ink-soft">The clock does not stop.</strong> Modules
          run back to back on a timeline fixed when you start, exactly as they do in a test hall.
          Close the tab 5 minutes into Listening and come back 50 minutes later and you&apos;ll be 10
          minutes into Reading — Listening will be over. Finish a module early and the next one
          starts straight away.
        </p>
      </div>

      <MockCatalogue tests={tests} module={module} />
    </div>
  );
}
