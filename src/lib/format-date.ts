/**
 * Formatting a timestamp for display, without trusting that it is a Date.
 *
 * WHY THIS IS NOT JUST `d.toLocaleDateString(...)`. These values cross a driver
 * boundary before they reach a page: most arrive as `Date` objects, but a raw
 * `sql` aggregate, a column whose type has been changed by hand, or a value
 * edited straight into the database can arrive as a string. Calling
 * `toLocaleDateString` on that throws `is not a function`, and because it
 * happens while rendering a list, ONE bad row takes down the whole screen —
 * which is exactly what it did to the partner panel.
 *
 * So the value is coerced, and anything that cannot become a real date returns
 * `null` for the caller to render as a dash. A missing date in one cell is a
 * blemish; an error page instead of a class's roster is an outage.
 *
 * Everything is formatted in UTC on purpose. These strings are produced on the
 * server and hydrated in the browser, and a formatter that read the viewer's
 * timezone would render one string on each side — a hydration mismatch.
 */

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  // Rejects both an unparseable string and Postgres's `infinity`, which does
  // become a Date but an invalid one — `toLocaleDateString` on it renders the
  // literal text "Invalid Date" into the page.
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "8 Sept 2026", or null when there is no usable date. */
export function formatDate(value: unknown): string | null {
  return (
    toDate(value)?.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }) ?? null
  );
}

/** "8 Sept 2026, 14:05", or null. */
export function formatDateTime(value: unknown): string | null {
  return (
    toDate(value)?.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) ?? null
  );
}
