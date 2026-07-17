import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMockSession } from "@/app/actions/mock";
import { MockPlayer, type MockSection } from "@/components/mock/mock-player";
import type { Answer } from "@/lib/question-content";

export const metadata: Metadata = { title: "Full Mock · IELTSAce", robots: { index: false } };

export default async function MockTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getMockSession(id);

  // Not found or not this user's → back to the mock hub.
  if (!session) redirect("/mock-tests");
  // A completed/abandoned session has nothing to answer — show its report.
  if (session.status !== "in_progress") redirect(`/results/${id}`);

  const sections: MockSection[] = session.sections.map((s) => ({
    section: s.section,
    set: s.set,
    questions: s.questions,
    // Exam numbers for this section's questions, in order — drives the palette.
    numbers: s.questions.map((_, i) => s.set.startNumber + i),
  }));

  return (
    <MockPlayer
      sessionId={id}
      sections={sections}
      initialIndex={session.currentSectionIndex}
      initialRemaining={session.remainingSeconds}
      initialAnswers={session.draftAnswers as Record<string, Answer>}
      initialTimings={session.draftTimings}
    />
  );
}
