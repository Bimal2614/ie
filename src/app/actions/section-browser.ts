"use server";

import { requireUser } from "@/lib/dal";
import { guardGeneral } from "@/lib/security/rate-guard";
import {
  isSectionKey,
  listBooks,
  listParts,
  listSources,
  type BookSummary,
  type ModuleKind,
  type PartSummary,
  type SourceSummary,
} from "@/lib/practice-sections";
import type { SectionKey } from "@/lib/ielts";

/**
 * The section-wise browser's three steps, as server actions.
 *
 * These were GET routes under /api/practice/*, which meant the whole library
 * had a stable, machine-readable address: `?source=cambridge` returned every
 * book as JSON, and walking that plus /parts enumerated the catalogue without
 * ever opening the app. Server actions are POST-only to an encrypted action id,
 * so there is no URL to guess, share, or crawl — and the Origin check Next
 * applies to actions rejects calls made from anywhere but this site.
 *
 * MODULE. A candidate sits Academic or General Training, never both, so the
 * library is filtered to their profile by default. The module is resolved
 * SERVER-SIDE from the session; the optional argument only lets the UI look at
 * the other module deliberately, and cannot widen what a filter would return.
 */

function section(raw: string | null | undefined): SectionKey | null {
  return isSectionKey(raw) ? raw : null;
}

function moduleOf(user: { targetModule: string }, override?: string | null): ModuleKind {
  const wanted = override ?? user.targetModule;
  return wanted === "general" ? "general" : "academic";
}

/** The module the browser should open on, from the candidate's profile. */
export async function getMyModule(): Promise<ModuleKind> {
  const user = await requireUser();
  return moduleOf(user);
}

export async function getSources(
  raw?: string | null,
  module?: string | null,
): Promise<SourceSummary[]> {
  const user = await requireUser();
  await guardGeneral(user.id);
  return listSources(section(raw), moduleOf(user, module));
}

export async function getBooks(
  source: string,
  raw?: string | null,
  module?: string | null,
): Promise<BookSummary[]> {
  const user = await requireUser();
  await guardGeneral(user.id);
  if (!source) return [];
  return listBooks(source, section(raw), moduleOf(user, module));
}

export async function getParts(
  book: string,
  testNumber: number | null,
  raw?: string | null,
  module?: string | null,
): Promise<PartSummary[]> {
  const user = await requireUser();
  await guardGeneral(user.id);
  if (!book) return [];
  return listParts(book, testNumber, section(raw), moduleOf(user, module));
}
