/**
 * The one UUID shape-check, because a malformed id is a 404 and not a 500.
 *
 * WHY THIS MATTERS. Every id in this app addresses a Postgres `uuid` column.
 * Passing "abc" to one is not an empty result — it is `22P02 invalid input
 * syntax for type uuid`, a driver error that escapes the page and is served as
 * a 500. So a route that reads an id from the URL and hands it straight to a
 * query turns a typo, a stale bookmark or a truncated shared link into a crash,
 * and into an error-rate figure that looks like a real fault.
 *
 * `src/lib/protected-media.ts` already worked this out for the media routes —
 * it shape-checks before calling `locate()`, "a malformed id is a 404, not a
 * query, and certainly not a cast error surfacing as a 500". That reasoning was
 * right and was simply never carried across to the page routes, five of which
 * were still passing raw params to the database. The regex had also been
 * retyped in eight files, which is exactly how the sixth route forgets it.
 *
 * SO IT LIVES HERE, in one module with no `server-only` marker, because both
 * pages and route handlers need it and neither should be copying a regex.
 *
 * This is a SHAPE check, not an authorization check. It says "this could be an
 * id", never "you may read it". Ownership is still proved by the query — see
 * `loadAttempt`, which scopes on `userId`, and `partnerStudentDetail`, which
 * scopes on the partner.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` can be passed to a `uuid` column without a cast error. */
export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
