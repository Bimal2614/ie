import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMockSitting } from "@/app/actions/mock";
import { MockPlayer } from "@/components/mock/mock-player";

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

export const metadata: Metadata = { title: "Full mock · IELTSVega", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MockTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) redirect("/mock-tests");

  // A sitting under way is NEVER interrupted by a plan check. Starting one is
  // gated (see startMock, where nothing has been written yet); three hours in,
  // a lapsed subscription leaves the AI-scored modules unscored on the report
  // rather than throwing away the paper.
  const sitting = await getMockSitting(id);

  // A finished sitting has a report; one that is not this candidate's has
  // nothing. The two lead to different places, which is why the read
  // distinguishes them rather than returning a bare null.
  if (sitting.status === "finished") redirect(`/results/${id}`);
  if (sitting.status === "missing") redirect("/mock-tests");

  return (
    // The exam takes the whole screen. A timed paper sat inside the app's
    // sidebar and page padding is neither the real thing nor usable — the two
    // panes need the full height to scroll independently.
    <div className="fixed inset-0 z-50 bg-paper">
      <MockPlayer sitting={sitting.data} />
    </div>
  );
}
