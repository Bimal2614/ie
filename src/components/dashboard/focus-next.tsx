import Link from "next/link";
import { ArrowRight, ArrowUpRight, Target, Trophy } from "lucide-react";
import { SECTIONS, QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import type { FocusRecommendation } from "@/lib/dashboard";
import { SECTION_META, SectionHeading, cardClass } from "./ui";
import { cn } from "@/lib/utils";

/**
 * "What to do next" — a recommended-focus card driven by the learner's weakest
 * areas, beside the always-present mock-test call to action.
 */
export function FocusNext({ focus }: { focus: FocusRecommendation }) {
  return (
    <section>
      <SectionHeading title="What to do next" />
      <div className="grid gap-4 lg:grid-cols-3">
        <FocusCard focus={focus} />
        <MockCard />
      </div>
    </section>
  );
}

function FocusCard({ focus }: { focus: FocusRecommendation }) {
  const { weakestSection, weakTypes } = focus;

  return (
    <div className={cn(cardClass, "p-6 lg:col-span-2")}>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Recommended focus</p>

      {weakestSection ? (
        <>
          <div className="mt-4 flex items-center gap-4">
            <span className={cn("grid size-14 place-items-center rounded-2xl", SECTION_META[weakestSection.key].tile)}>
              <SectionIcon sectionKey={weakestSection.key} />
            </span>
            <div>
              <p className="font-semibold text-2xl text-ink">{SECTIONS[weakestSection.key].label} needs work</p>
              <p className="text-sm text-ink-muted">
                Your lowest accuracy — {weakestSection.accuracy}% across {weakestSection.attempted} questions.
              </p>
            </div>
          </div>

          {weakTypes.length > 0 && (
            <div className="mt-5 space-y-1.5">
              {weakTypes.map((t) => (
                <Link
                  key={`${t.section}-${t.questionType}`}
                  href={`/practice/${t.section}/${t.questionType}`}
                  className="flex items-center justify-between rounded-lg border border-line bg-paper px-3 py-2 text-sm transition-colors hover:bg-paper-sunken"
                >
                  <span className="text-ink-soft">
                    {QUESTION_TYPES[t.questionType as QuestionTypeKey]?.label ?? t.questionType}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-ink-muted">{t.accuracy}%</span>
                    <ArrowUpRight className="size-4 text-ink-muted" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href={`/practice/${weakestSection.key}`}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition-transform hover:scale-[1.02]"
          >
            Practise {SECTIONS[weakestSection.key].label} <ArrowRight className="size-4" />
          </Link>
        </>
      ) : (
        <div className="mt-4">
          <p className="font-semibold text-2xl text-ink">Start with a quick practice</p>
          <p className="mt-1 text-sm text-ink-muted">
            Do a set in any skill and we&apos;ll point you at your weakest areas next.
          </p>
          <Link
            href="/practice"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition-transform hover:scale-[1.02]"
          >
            Browse practice <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Mock-test CTA — the solid green accent card (design-token classes, no inline
 * colour), styled like the auth showcase's accent card: solid fill, dark ink
 * text, a dark inset button. The one bold colour on a monochrome dashboard.
 */
function MockCard() {
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl bg-green p-6 text-green-ink">
      <div>
        <span className="grid size-11 place-items-center rounded-2xl bg-green-ink/10">
          <Trophy className="size-5" />
        </span>
        <p className="mt-4 text-2xl font-semibold leading-tight">Sit a full mock test</p>
        <p className="mt-2 text-sm text-green-ink/75">
          All four sections, real 2026 timing, a complete AI band report.
        </p>
      </div>
      <Link
        href="/mock-tests"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-green-ink px-5 py-2.5 text-sm font-semibold text-green transition-transform hover:scale-[1.02]"
      >
        <Target className="size-4" /> Start mock test
      </Link>
    </div>
  );
}

function SectionIcon({ sectionKey }: { sectionKey: keyof typeof SECTION_META }) {
  const { Icon } = SECTION_META[sectionKey];
  return <Icon className="size-7" />;
}
