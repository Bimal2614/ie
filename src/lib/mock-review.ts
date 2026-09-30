import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  mockTests,
  mockTestAnswers,
  mockTestResults,
  mockTestSessions,
} from "@/db/schema";
import type { QuestionTypeKey, SectionKey } from "@/lib/ielts";
import { answerKey, shiftLayoutGaps, type SetLayout } from "@/lib/question-content";
import { openMockModule } from "@/lib/mock-tests";
import { mediaUrl } from "@/lib/media-urls";

/**
 * Reading back a finished sitting — the report's drill-down, and the list of
 * past papers.
 *
 * `server-only`, not `"use server"`, for the reason set out in
 * src/lib/section-grading.ts: a function that takes a user id cannot be exported
 * from a `"use server"` module, because every export there is a callable
 * endpoint whose arguments the client supplies — which would make these a read
 * of anyone's results by uuid. The website's Server Action and the JSON route
 * each resolve their own user and call in here.
 */

export type MockReviewItem = {
  key: string;
  /** The number printed on the paper's answer sheet. */
  number: number;
  prompt: string | null;
  content: unknown;
  correctAnswer: unknown;
  explanation: string | null;
  response: unknown;
  isCorrect: boolean | null;
  marks: number;
  earned: number;
  band: string | null;
  aiFeedback: unknown;
  timeSpentSec: number | null;
  /**
   * The candidate's own recording, as an app-relative playback path — never the
   * `s3://` location. Review of a speaking answer without the audio is a band
   * with nothing behind it.
   */
  audioUrl: string | null;
  /** What the scorer heard. Explains a band the candidate will not recognise. */
  transcript: string | null;
};

export type MockReviewPart = {
  sectionId: string;
  partNumber: number;
  title: string;
  instructions: string | null;
  questionType: QuestionTypeKey;
  passageText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  layout: SetLayout | null;
  startNumber: number;
  items: MockReviewItem[];
};

export type MockSectionReview = {
  section: SectionKey;
  parts: MockReviewPart[];
};

/**
 * One module of a finished sitting, with the candidate's answers and verdicts.
 *
 * The answer key is read from the CONTENT, not frozen into the answer row: the
 * paper is a fixed definition, so the key that marked it is the key that is
 * still there. Owner-scoped; unanswered items are included so a review shows
 * what was left blank rather than quietly omitting it.
 */
export async function mockSectionReviewFor(
  userId: string,
  sessionId: string,
  section: SectionKey,
): Promise<MockSectionReview | null> {
  const [session] = await db
    .select({ id: mockTestSessions.id, mockTestId: mockTestSessions.mockTestId })
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, userId)))
    .limit(1);
  if (!session) return null;

  const parts = await openMockModule(session.mockTestId, section);
  if (parts.length === 0) return null;

  const answered = await db
    .select()
    .from(mockTestAnswers)
    .where(and(eq(mockTestAnswers.sessionId, sessionId), eq(mockTestAnswers.section, section)))
    .orderBy(asc(mockTestAnswers.sheetNumber));

  const byItem = new Map(answered.map((a) => [answerKey(a.sectionId, a.sheetNumber), a]));

  return {
    section,
    parts: parts.flatMap((part) =>
      (part.questions?.groups ?? []).map((group) => ({
        sectionId: part.sectionId,
        partNumber: part.partNumber,
        title: part.title,
        instructions: group.instruction ?? part.instructions,
        questionType: group.questionType as QuestionTypeKey,
        passageText: part.passageText,
        audioUrl: part.audioUrl,
        imageUrl: part.imageUrl,
        // Shifted, because `item.number` below is the SHEET number: a layout
        // still saying `[[1]]` would bind its gap to the wrong item on any
        // module whose parts were renumbered.
        layout: shiftLayoutGaps(group.layout, part.numberOffset),
        startNumber: group.from + part.numberOffset,
        items: group.items.map((item) => {
          const number = item.n + part.numberOffset;
          const a = byItem.get(answerKey(part.sectionId, number));
          const marks = item.marks ?? 1;
          return {
            key: answerKey(part.sectionId, number),
            number,
            prompt: item.prompt ?? null,
            content:
              item.options || item.cueCard
                ? {
                    ...(item.options ? { options: item.options, selectCount: item.selectCount } : {}),
                    ...(item.cueCard ? { cueCard: item.cueCard } : {}),
                  }
                : null,
            correctAnswer: item.answer ?? null,
            explanation: item.explanation ?? null,
            response: a?.response ?? null,
            isCorrect: a?.isCorrect ?? null,
            marks,
            earned: a?.rawScore ?? 0,
            band: a?.band ?? null,
            aiFeedback: a?.aiFeedback ?? null,
            timeSpentSec: a?.timeSpentSec ?? null,
            // Keyed by the ANSWER row, not the item: the route re-checks that
            // this recording belongs to the caller before presigning it.
            audioUrl: a ? mediaUrl.recording(a.id, a.audioUrl) : null,
            transcript: a?.transcript ?? null,
          };
        }),
      })),
    ),
  };
}

export type MockResultSummary = {
  sessionId: string;
  title: string | null;
  module: "academic" | "general";
  overallBand: string | null;
  completedAt: Date | null;
};

/** Past completed sittings for one candidate, newest first. */
export async function mockResultsFor(userId: string): Promise<MockResultSummary[]> {
  const rows = await db
    .select({
      sessionId: mockTestResults.sessionId,
      module: mockTestResults.module,
      overallBand: mockTestResults.overallBand,
      completedAt: mockTestSessions.completedAt,
      title: mockTests.title,
    })
    .from(mockTestResults)
    .innerJoin(mockTestSessions, eq(mockTestResults.sessionId, mockTestSessions.id))
    .leftJoin(mockTests, eq(mockTestSessions.mockTestId, mockTests.id))
    .where(eq(mockTestResults.userId, userId))
    .orderBy(desc(mockTestSessions.completedAt));

  return rows.map((r) => ({
    sessionId: r.sessionId,
    title: r.title,
    module: r.module,
    overallBand: r.overallBand,
    completedAt: r.completedAt,
  }));
}
