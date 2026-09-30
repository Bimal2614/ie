import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readQuery } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { notFound } from "@/lib/api/errors";
import { guardGeneral } from "@/lib/security/rate-guard";
import { sectionParam } from "@/lib/api/query-schemas";
import { mockSectionReviewFor } from "@/lib/mock-review";

/**
 * GET /api/v1/mock/sessions/{sessionId}/review?section= — one module of a
 * finished paper, answer by answer.
 *
 * ONE MODULE AT A TIME, for the same reason the player loads one: a full paper
 * is three reading passages, both writing prompts and every recording, and a
 * review screen opens on one of them.
 *
 * THE KEY IS READ FROM THE CONTENT, not from the answer row. A mock is a fixed
 * definition, so the key that marked the paper is still there — which is also
 * why UNANSWERED ITEMS ARE INCLUDED. A review that quietly omitted them would
 * hide exactly the thing a candidate most needs to see, and the marks they cost
 * are already in the denominator.
 *
 * Numbers are this paper's ANSWER-SHEET numbers, and the layouts have had their
 * `[[n]]` gaps shifted to match, so a review renders with the same numbering
 * the candidate sat.
 *
 * Owner-scoped inside the read, so another candidate's sitting is
 * indistinguishable from one that does not exist.
 */
export const dynamic = "force-dynamic";

const query = z.object({ section: sectionParam });

export const GET = apiRoute(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  const user = await requireApiCandidate(req);
  await guardGeneral(user.id);

  const { sessionId } = await ctx.params;
  const q = readQuery(req, query);

  const review = await mockSectionReviewFor(user.id, sessionId, q.section);

  // Covers three cases on purpose: no such sitting, not this candidate's, and a
  // paper that has no parts for that module. All three are "there is nothing
  // here for you to review", and telling them apart would confirm which session
  // ids are real.
  if (!review) throw notFound("No review for that sitting and section.");

  return ok(review);
});
