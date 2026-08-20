"use server";

import { requireUser } from "@/lib/dal";
import { guardGeneral } from "@/lib/security/rate-guard";
import {
  isSectionKey,
  listBooks,
  listParts,
  listSources,
  type BookSummary,
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
 * What this does NOT claim: a signed-in candidate can always read what is
 * rendered to them, and no client-side measure changes that. The point is that
 * taking the catalogue now costs a real session driving the real UI under a
 * rate limit, instead of one scripted request.
 */

function section(raw: string | null | undefined): SectionKey | null {
  return isSectionKey(raw) ? raw : null;
}

export async function getSources(raw?: string | null): Promise<SourceSummary[]> {
  const user = await requireUser();
  await guardGeneral(user.id);
  return listSources(section(raw));
}

export async function getBooks(
  source: string,
  raw?: string | null,
): Promise<BookSummary[]> {
  const user = await requireUser();
  await guardGeneral(user.id);
  if (!source) return [];
  return listBooks(source, section(raw));
}

export async function getParts(
  book: string,
  testNumber: number | null,
  raw?: string | null,
): Promise<PartSummary[]> {
  const user = await requireUser();
  await guardGeneral(user.id);
  if (!book) return [];
  return listParts(book, testNumber, section(raw));
}
