import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { openSection, sectionNeighbours, toClientSection } from "@/lib/practice-sections";
import { SECTIONS, type SectionKey } from "@/lib/ielts";
import { SectionPlayer } from "@/components/practice/section-player";

/**
 * Room for the scoring that runs after the response.
 *
 * A submit from this page schedules AI band scoring with `after()`, which runs
 * inside THIS invocation once the response is out — so the route's duration is
 * what bounds it. A Speaking batch is tens of seconds per wave; at the platform
 * default of 15s that work was being killed halfway through, leaving answers
 * saved and band-less. 300s is the fluid-compute default, stated explicitly so a
 * lower project-level default cannot silently reintroduce that.
 *
 * It is a ceiling, not a reservation: nothing is billed for time not spent, and
 * anything this still cannot finish is picked up by /api/cron/scoring.
 */
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Section practice · IELTSVega",
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PracticeSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const section = await openSection(id);
  if (!section) notFound();

  // The rest of this book and test, so the player can offer the next part
  // without a trip back to the library. Listening and Speaking are stored once
  // for both modules, so the profile decides which paper those continue into.
  const neighbours = await sectionNeighbours(
    section,
    user.targetModule === "general" ? "general" : "academic",
  );

  const sec = SECTIONS[section.sectionType as SectionKey];
  // The answer key stays on the server; the client gets the redacted copy.
  const view = toClientSection(section);

  const paperTitle = [
    section.book,
    section.testNumber ? `Test ${section.testNumber}` : null,
    sec.label,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    // The exam takes the whole screen: a timed paper sat inside the app's
    // sidebar and page padding is neither the real thing nor usable, since the
    // two panes need the full height to scroll independently.
    <div className="fixed inset-0 z-50 bg-paper">
      <SectionPlayer
        // Moving to the next part re-renders this same component in place, and
        // without a key React would keep the last part's answers, flags and
        // score card mounted against the new paper.
        key={section.id}
        section={view}
        paperTitle={paperTitle || section.title}
        exitHref="/section-practice"
        neighbours={neighbours}
      />
    </div>
  );
}
