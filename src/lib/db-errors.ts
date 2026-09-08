/**
 * Postgres error inspection, shared by every writer that expects a collision.
 *
 * Lives outside the actions that use it because more than one of them now
 * inserts a `users` row — signup, and a partner enrolling a student — and both
 * have to tell "this email is taken" apart from a genuine failure.
 */

/**
 * True for a Postgres unique_violation (23505) — on `users`, a duplicate email
 * on the users_email_normalized_uq index.
 *
 * The code has to be hunted down the cause chain: Drizzle wraps driver errors
 * in a DrizzleQueryError, so `err.code` is undefined and only `err.cause.code`
 * carries 23505. Checking the top-level error alone silently misses every
 * duplicate and rethrows as a 500 that dumps the INSERT — bcrypt hash
 * included — into the response.
 */
export function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e != null; e = (e as { cause?: unknown }).cause) {
    if (typeof e === "object" && "code" in e && (e as { code?: unknown }).code === "23505") {
      return true;
    }
  }
  return false;
}
