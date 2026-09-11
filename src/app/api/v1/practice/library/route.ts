import { requireApiUser } from "@/lib/api/auth";
import { apiRoute, readQuery } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { guardGeneral } from "@/lib/security/rate-guard";
import { listBooks, listParts, listSources, type ModuleKind } from "@/lib/practice-sections";
import { booksQuery, partsQuery, sourcesQuery } from "@/lib/api/query-schemas";
import { invalid } from "@/lib/api/errors";
import { z } from "zod";

/**
 * GET /api/v1/practice/library — the section-wise browser, in one endpoint.
 *
 * Three steps (sources → books → parts) behind one route with a `step`
 * parameter, rather than three routes. They share their filters, their module
 * resolution and their rate guard, and the app walks them in a fixed order; as
 * separate routes the shared half was copied three times.
 *
 * MODULE. A candidate sits Academic or General Training, never both, so the
 * library is filtered to their profile by default. The module is resolved
 * SERVER-SIDE from the session; the optional parameter only lets the UI look at
 * the other module deliberately, and cannot widen what a filter returns.
 *
 * A NOTE ON EXPOSURE, because this used to be a REST route and was deliberately
 * moved to Server Actions to take the catalogue off a guessable URL. It is a URL
 * again — the app has no other option — but an AUTHENTICATED one, throttled per
 * user by `guardGeneral`. That is a weaker property than "no URL exists" and
 * worth knowing: scraping the catalogue now costs an account and stays inside
 * that account's rate limit.
 */
export const dynamic = "force-dynamic";

const stepSchema = z.enum(["sources", "books", "parts"]);

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(req);
  await guardGeneral(user.id);

  const url = new URL(req.url);
  const step = stepSchema.safeParse(url.searchParams.get("step"));
  if (!step.success) {
    throw invalid("Ask for step=sources, step=books or step=parts.", {
      step: ["Must be one of: sources, books, parts"],
    });
  }

  const moduleOf = (override?: string | null): ModuleKind =>
    (override ?? user.targetModule) === "general" ? "general" : "academic";

  switch (step.data) {
    case "sources": {
      const q = readQuery(req, sourcesQuery);
      return ok({ sources: await listSources(q.section ?? null, moduleOf(q.module)) });
    }
    case "books": {
      const q = readQuery(req, booksQuery);
      return ok({ books: await listBooks(q.source, q.section ?? null, moduleOf(q.module)) });
    }
    case "parts": {
      const q = readQuery(req, partsQuery);
      return ok({
        parts: await listParts(
          q.book,
          q.testNumber ?? null,
          q.section ?? null,
          moduleOf(q.module),
        ),
      });
    }
  }
});
