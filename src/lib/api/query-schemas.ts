import { z } from "zod";

import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import { isSectionKey } from "@/lib/practice-sections";
import type { SectionKey } from "@/lib/ielts";

/**
 * Query-string schemas.
 *
 * Everything in a URL is a string, so these do the coercion ONCE, in a named
 * place, instead of leaving `Number(searchParams.get("page")) || 1` scattered
 * across route handlers — where the `|| 1` quietly turns `page=0` into page one
 * and `page=-5` into page one as well, and nobody finds out until a candidate
 * reports that paging is stuck.
 *
 * They are also the schemas the OpenAPI spec is generated from, so a parameter
 * that is documented is by construction a parameter that is validated.
 */

/** A section key, validated against the real list rather than a free string. */
export const sectionParam = z
  .string()
  .refine(isSectionKey, "Unknown section")
  .transform((v) => v as SectionKey);

/** A question type, validated against the IELTS catalogue. */
export const questionTypeParam = z
  .string()
  .refine((v) => v in QUESTION_TYPES, "Unknown question type")
  .transform((v) => v as QuestionTypeKey);

/** Academic or General Training. Optional — it defaults to the candidate's own. */
export const moduleParam = z.enum(["academic", "general"]).optional();

/**
 * 1-indexed paging, clamped at both ends.
 *
 * The upper bound is not arithmetic tidiness: without it, `?page=1e9` becomes
 * an OFFSET that Postgres will honour by walking a billion rows.
 */
export const pageParam = z.coerce.number().int().min(1).max(10_000).default(1);

/** A list window. Capped so one request cannot ask for the whole table. */
export const limitParam = z.coerce.number().int().min(1).max(100).default(20);

export const setPageQuery = z.object({
  section: sectionParam,
  questionType: questionTypeParam,
  page: pageParam,
});

export const sourcesQuery = z.object({
  section: sectionParam.optional(),
  module: moduleParam,
});

export const booksQuery = z.object({
  source: z.string().trim().min(1, "Name a source").max(120),
  section: sectionParam.optional(),
  module: moduleParam,
});

export const partsQuery = z.object({
  book: z.string().trim().min(1, "Name a book").max(120),
  /** Absent means "every test in the book", which is a real and distinct ask. */
  testNumber: z.coerce.number().int().min(1).max(100).optional(),
  section: sectionParam.optional(),
  module: moduleParam,
});

export const historyQuery = z.object({
  limit: limitParam,
  /**
   * Minutes to SUBTRACT from UTC, exactly as `Date.prototype.getTimezoneOffset`
   * reports it — so India is -330, not +330.
   *
   * It has to come from the client because "today" is a question about where
   * the candidate is standing, and a server in another region would roll the
   * streak over at the wrong midnight. Bounded to the real range of UTC offsets
   * so it cannot be used to shift a day arbitrarily far and mine another day's
   * rows out of a "today" query.
   */
  tzOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
});
