import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMockSitting } from "@/app/actions/mock";
import { MockPlayer } from "@/components/mock/mock-player";

export const metadata: Metadata = { title: "Full mock · IELTSVega", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MockTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) redirect("/mock-tests");

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
