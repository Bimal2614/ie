import { requireApiUser } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { notFound } from "@/lib/api/errors";
import { guardGeneral } from "@/lib/security/rate-guard";
import { openSection, toClientSection } from "@/lib/practice-sections";

/**
 * GET /api/v1/practice/sections/{sectionId} — one exam part, ready to sit.
 *
 * THE STEP /api/v1/practice/library WAS MISSING. That route walks
 * sources → books → parts and then stops; this is what opens the part it just
 * listed. Every Cambridge book on the platform lives in `practice_sections`, so
 * without this the library is browsable and unusable.
 *
 * ONE PART IS ONE STIMULUS AND SEVERAL GROUPS. A Cambridge part is a single
 * recording or passage answered against two or three different task types —
 * C21 Test 1 Listening Part 1 is a table completion for 1–6 and a note
 * completion for 7–10 off one 7-minute audio. The client renders the groups
 * against the one stimulus; it must not expect a part to have a single type.
 *
 * THE ANSWER KEY IS STRIPPED, by `toClientSection`, which rebuilds each item
 * field by field rather than spreading and deleting `answer`. A spread would
 * silently carry any future answer-bearing field into the response; this fails
 * to compile instead. Same function the website's player is handed, so the two
 * cannot be given different things to render.
 *
 * `transcript` never leaves the server either — it is review-only material and,
 * for a listening part, it is the answer key in prose. `openSection` does not
 * even select it.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req, ctx: { params: Promise<{ sectionId: string }> }) => {
  const user = await requireApiUser(req);
  await guardGeneral(user.id);

  const { sectionId } = await ctx.params;

  // `openSection` filters on is_active, so a part an admin has pulled is
  // indistinguishable from one that never existed — which is the intent.
  const section = await openSection(sectionId);
  if (!section) throw notFound("No such practice section.");

  return ok(toClientSection(section));
});
