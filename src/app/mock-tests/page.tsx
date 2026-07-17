import type { Metadata } from "next";
import { Headphones, BookOpen, PenLine, Mic, Clock, Trophy, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/dal";
import { startMock } from "@/app/actions/mock";
import { SECTIONS, SECTION_ORDER, type SectionKey } from "@/lib/ielts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mock Tests · IELTSAce", robots: { index: false } };

const SECTION_ICON: Record<SectionKey, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

const SECTION_TILE: Record<SectionKey, string> = {
  listening: "chip-listening",
  reading: "chip-reading",
  writing: "chip-writing",
  speaking: "chip-speaking",
};

export default async function MockTestsPage() {
  const user = await requireUser();
  const totalMin = SECTION_ORDER.reduce((n, s) => n + SECTIONS[s].durationMin, 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="grid size-12 place-items-center rounded-xl chip-accent">
          <Trophy className="size-6" />
        </div>
        <div>
          <h1 className="display text-3xl">Full mock test</h1>
          <p className="mt-1 text-sm text-ink-muted">
            One sitting, all four sections, real exam timing. You&apos;ll get a band report at the end.
          </p>
        </div>
      </div>

      {/* Section breakdown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTION_ORDER.map((s) => {
          const sec = SECTIONS[s];
          const Icon = SECTION_ICON[s];
          return (
            <div key={s} className="rounded-xl border border-line bg-paper-elev p-4">
              <div className={cn("mb-3 grid size-9 place-items-center rounded-lg", SECTION_TILE[s])}>
                <Icon className="size-4.5" />
              </div>
              <p className="text-sm font-semibold text-ink">{sec.label}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-muted">
                <Clock className="size-3" /> {sec.durationMin} min
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{sec.details}</p>
            </div>
          );
        })}
      </div>

      {/* Start form — module choice + submit, all server-side. */}
      <form action={startMock} className="space-y-5 rounded-xl border border-line bg-paper-elev p-6">
        <div>
          <p className="text-sm font-semibold text-ink">Which module?</p>
          <p className="text-xs text-ink-muted">
            Defaults to the one on your profile ({user.targetModule}). Academic and General differ in
            Reading and Writing Task 1.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ModuleRadio
            value="academic"
            title="Academic"
            desc="For university and professional registration."
            defaultChecked={user.targetModule === "academic"}
          />
          <ModuleRadio
            value="general"
            title="General Training"
            desc="For migration, work, and secondary education."
            defaultChecked={user.targetModule === "general"}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
            <Clock className="size-4" /> About {Math.round(totalMin / 60)} hours end to end
          </p>
          <Button type="submit" size="lg" className="btn-lift">
            <Sparkles className="size-4" /> Start full mock
          </Button>
        </div>
      </form>

      <p className="text-xs text-ink-muted">
        Listening and Reading are scored automatically. Writing and Speaking are marked
        &ldquo;awaiting AI band score&rdquo; until AI scoring is switched on, so your overall band is
        indicative for now.
      </p>
    </div>
  );
}

/** A selectable module card backed by a hidden radio, styled via peer state. */
function ModuleRadio({
  value,
  title,
  desc,
  defaultChecked,
}: {
  value: string;
  title: string;
  desc: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="group relative block cursor-pointer">
      <input
        type="radio"
        name="module"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <div className="rounded-xl border border-line p-4 transition-colors peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 hover:bg-paper-sunken">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{desc}</p>
      </div>
    </label>
  );
}
