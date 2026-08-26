/**
 * The only place an app media URL is written.
 *
 * WHY THIS MODULE EXISTS. Media is stored as `s3://bucket/<key>` in a private
 * bucket, so nothing on the client can load it directly — every read goes
 * through a route that re-checks the session first. (Listening audio goes
 * further: those routes stream the bytes themselves rather than handing over a
 * presigned URL, so no link that plays without a session ever exists — see
 * src/lib/protected-media.ts.) That means each read shape needed a `stored value ? path : null` mapping,
 * and those mappings were hand-written in fifteen places across five files.
 *
 * Predictably, some were missed: raw `s3://bucket/<prefix>/<userId>/<uuid>.wav`
 * values reached the browser from five of them, publishing the bucket name, its
 * folder layout and another user's id. The mapping is one line, which is exactly
 * why it kept being retyped slightly differently instead of shared.
 *
 * Every builder takes the ROW ID, never the stored location, so it is impossible
 * to accidentally pass one through. And each returns null for a row with no
 * media, so callers keep the `null` that means "nothing to play".
 *
 * Paths must match the route files under src/app/api/. Changing one means
 * changing the other; keeping them in a single module is what makes that a
 * findable edit rather than a grep across the codebase.
 */

/** No media on the row → no URL. Keeps `null` meaning "nothing to play". */
function pathIf(stored: string | null | undefined, path: string): string | null {
  return stored ? path : null;
}

export const mediaUrl = {
  /** Listening audio for a `question_sets` row. → /api/media/[setId] */
  setAudio: (setId: string, stored: string | null | undefined) =>
    pathIf(stored, `/api/media/${setId}`),

  /** Figure for a `question_sets` row. → /api/media/[setId]/image */
  setImage: (setId: string, stored: string | null | undefined) =>
    pathIf(stored, `/api/media/${setId}/image`),

  /** Listening audio for a `practice_sections` row. → /api/practice/audio/[id] */
  sectionAudio: (sectionId: string, stored: string | null | undefined) =>
    pathIf(stored, `/api/practice/audio/${sectionId}`),

  /** Figure for a `practice_sections` row. → /api/practice/image/[id] */
  sectionImage: (sectionId: string, stored: string | null | undefined) =>
    pathIf(stored, `/api/practice/image/${sectionId}`),

  /**
   * A candidate's OWN speaking recording. → /api/practice/recording/[id]
   *
   * Keyed by the ANSWER row's id — a `user_responses` id for practice, a
   * `mock_test_answers` id for a mock — because the route re-checks that the
   * recording belongs to the caller before presigning it. Unlike the others
   * above, this is private to one person rather than published content.
   */
  recording: (answerRowId: string, stored: string | null | undefined) =>
    pathIf(stored, `/api/practice/recording/${answerRowId}`),
} as const;
