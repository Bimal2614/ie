/**
 * Paging, searching and sorting for the panel lists — the shared contract
 * between a server query and the table that renders it.
 *
 * URL-DRIVEN, NOT STATE-DRIVEN. Page, query, filter and sort all live in the
 * query string, so a screen is bookmarkable, shareable and survives a refresh —
 * and, more usefully, "the student I was looking at" is a link a partner can
 * paste into an email to us. It also means the list is a SERVER component that
 * re-queries, rather than a client component filtering an array it was handed,
 * which is what stops search from silently only searching the current page.
 *
 * OFFSET, NOT A CURSOR. These tables run to hundreds of rows, not millions: at
 * that size OFFSET is free, and it buys the two things an operator actually
 * wants — a total ("812 students") and the ability to jump to a page. A cursor
 * would be the right answer at a hundred thousand rows, and the wrong answer
 * for every screen in this app today.
 *
 * Pure and client-safe: the table components import the same clamps the queries
 * use, so a hand-typed `?pageSize=100000` is impossible on both sides.
 */

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 50;

/** Longest search we will run. Anything more is a paste, not a search. */
const MAX_QUERY = 80;

export type SortDir = "asc" | "desc";

/**
 * What a list screen was asked for, after clamping. Every field is safe to put
 * straight into a query — `sort` in particular is narrowed to a key the caller
 * declared, never a column name off the wire.
 */
export type PageRequest<Sort extends string = string, Filter extends string = string> = {
  page: number;
  pageSize: PageSize;
  /** Trimmed, lowercased search text. Empty string means "no search". */
  q: string;
  sort: Sort;
  dir: SortDir;
  filter: Filter;
};

/** One page of rows, plus what the pager needs to draw itself. */
export type Page<T> = {
  rows: T[];
  /** Rows matching the search and filter — NOT the size of the table. */
  total: number;
  page: number;
  pageSize: PageSize;
  /** Always at least 1, so "page 1 of 1" reads correctly on an empty list. */
  pages: number;
};

function toPageSize(value: unknown): PageSize {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n) ? (n as PageSize) : DEFAULT_PAGE_SIZE;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Read a list screen's query string.
 *
 * EVERYTHING IS CLAMPED HERE, once, because these values reach SQL: `page` and
 * `pageSize` become LIMIT/OFFSET, and `sort` picks an ORDER BY. Whitelisting
 * the sort and filter keys against what the caller declared is what makes the
 * ORDER BY safe to build by lookup — the wire can only ever name a key that
 * exists.
 */
export function parsePageRequest<Sort extends string, Filter extends string>(
  params: Record<string, string | string[] | undefined>,
  opts: {
    sorts: readonly Sort[];
    defaultSort: Sort;
    defaultDir?: SortDir;
    filters: readonly Filter[];
    defaultFilter: Filter;
  },
): PageRequest<Sort, Filter> {
  const rawPage = Number(first(params.page));
  const sort = first(params.sort);
  const filter = first(params.filter);

  return {
    // Page numbers are 1-based for the URL, because that is what the pager
    // shows. Non-numeric, zero and negative all mean "the first page".
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
    pageSize: toPageSize(first(params.pageSize)),
    q: (first(params.q) ?? "").trim().slice(0, MAX_QUERY),
    sort: opts.sorts.includes(sort as Sort) ? (sort as Sort) : opts.defaultSort,
    dir: first(params.dir) === "asc" ? "asc" : first(params.dir) === "desc" ? "desc" : (opts.defaultDir ?? "desc"),
    filter: opts.filters.includes(filter as Filter) ? (filter as Filter) : opts.defaultFilter,
  };
}

/** LIMIT/OFFSET for a request. Kept beside the parser so they cannot drift. */
export function limitOffset(req: PageRequest): { limit: number; offset: number } {
  return { limit: req.pageSize, offset: (req.page - 1) * req.pageSize };
}

/**
 * Wrap rows and a count into a page.
 *
 * A page number past the end is NOT an error — a list shrinks between the click
 * and the query — so it renders as an empty page whose pager still offers a way
 * back. `pages` floors at 1 so the pager never reads "page 1 of 0".
 */
export function toPage<T>(rows: T[], total: number, req: PageRequest): Page<T> {
  return {
    rows,
    total,
    page: req.page,
    pageSize: req.pageSize,
    pages: Math.max(1, Math.ceil(total / req.pageSize)),
  };
}

/**
 * The `%term%` a case-insensitive search compiles to.
 *
 * `%` and `_` are LIKE wildcards, so a `%` typed into the search box would
 * otherwise match every row — which reads as "search is broken".
 *
 * ESCAPED WITH `!`, DECLARED BY THE QUERY as `ilike ... escape ${LIKE_ESCAPE}`,
 * rather than with the SQL default of a backslash. A backslash would have to
 * survive a JavaScript string, a query parameter and LIKE itself, and getting
 * the count wrong at any of those three fails silently: the search still runs,
 * it just quietly matches the wrong rows. `!` passes through all three as
 * itself. It escapes itself too, so a literal `!` in a name still matches.
 */
export function likeTerm(q: string): string {
  return `%${q.replace(/[!%_]/g, (c) => `!${c}`)}%`;
}

/** The escape character `likeTerm` uses. Every ILIKE it feeds must declare it. */
export const LIKE_ESCAPE = "!";

/**
 * Build the query string for a list screen, dropping anything at its default so
 * the common case stays a clean URL.
 */
export function pageHref(
  base: string,
  req: PageRequest,
  patch: Partial<PageRequest> & { page?: number } = {},
): string {
  const next = { ...req, ...patch };
  const params = new URLSearchParams();
  // Any change to the shape of the list resets to the first page: staying on
  // page 7 of a result set that now has two pages shows an empty screen.
  const page = patch.page ?? (isSameShape(req, next) ? next.page : 1);
  if (page > 1) params.set("page", String(page));
  if (next.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(next.pageSize));
  if (next.q) params.set("q", next.q);
  if (next.sort !== req.sort || patch.sort) params.set("sort", next.sort);
  if (patch.sort || patch.dir || next.dir !== req.dir) params.set("dir", next.dir);
  if (next.filter !== req.filter || patch.filter) params.set("filter", next.filter);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function isSameShape(a: PageRequest, b: PageRequest): boolean {
  return a.q === b.q && a.filter === b.filter && a.sort === b.sort && a.dir === b.dir && a.pageSize === b.pageSize;
}
