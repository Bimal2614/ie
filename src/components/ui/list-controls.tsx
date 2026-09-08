"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { pageHref, type Page, type PageRequest } from "@/lib/pagination";
import { cn } from "@/lib/utils";

/**
 * The controls every paged list in the panel shares: a search box, filter
 * chips, a sort picker and a pager.
 *
 * THEY ONLY EVER CHANGE THE URL. The list itself is a server component that
 * re-queries from the query string, so nothing here filters or sorts anything —
 * which is the whole point. A client-side filter can only ever see the page it
 * was handed, and quietly tells a class that a student they can see in the next
 * page does not exist.
 */

const CONTROL =
  "h-9 rounded-lg border border-line bg-paper-elev px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

export function ListControls<S extends string, F extends string>({
  basePath,
  req,
  filters,
  sorts,
  placeholder = "Search",
}: {
  basePath: string;
  req: PageRequest<S, F>;
  filters: ReadonlyArray<{ key: F; label: string }>;
  sorts: ReadonlyArray<{ key: S; label: string }>;
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(req.q);

  // The box follows the URL, so Back and a cleared filter both leave the input
  // showing what is actually being searched for.
  useEffect(() => setQ(req.q), [req.q]);

  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(pageHref(basePath, req, { q, page: 1 }));
        }}
        className="relative flex-1"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(CONTROL, "w-full pl-9")}
        />
        {/* Submitted on Enter. No debounce and no keystroke queries: a search
            that fires per character is a query per character, on a table this
            screen is already counting. */}
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={pageHref(basePath, req, { filter: f.key, page: 1 })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              req.filter === f.key
                ? "bg-brand-soft text-brand"
                : "text-ink-soft hover:bg-paper-sunken hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}

        <select
          value={`${req.sort}:${req.dir}`}
          onChange={(e) => {
            const [sort, dir] = e.target.value.split(":");
            router.push(pageHref(basePath, req, { sort: sort as S, dir: dir as "asc" | "desc", page: 1 }));
          }}
          aria-label="Sort"
          className={cn(CONTROL, "ml-1")}
        >
          {sorts.flatMap((s) => [
            <option key={`${s.key}:desc`} value={`${s.key}:desc`}>
              {s.label} ↓
            </option>,
            <option key={`${s.key}:asc`} value={`${s.key}:asc`}>
              {s.label} ↑
            </option>,
          ])}
        </select>
      </div>
    </div>
  );
}

/**
 * Prev / next and the honest total.
 *
 * The count is what the old 500-row cap could not give: a class at the cap saw
 * a truncated list with nothing saying so, searched for a student who was cut
 * off, and was told they did not exist.
 */
export function Pager({
  basePath,
  req,
  page,
  noun = "row",
}: {
  basePath: string;
  req: PageRequest;
  page: Page<unknown>;
  /** Singular; pluralised with an "s". */
  noun?: string;
}) {
  if (page.total === 0) return null;

  const from = (page.page - 1) * page.pageSize + 1;
  const to = Math.min(page.page * page.pageSize, page.total);
  const step = (delta: number) => pageHref(basePath, req, { page: page.page + delta });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-muted">
      <span className="tabular-nums">
        {page.total <= page.pageSize ? (
          <>
            {page.total} {noun}
            {page.total === 1 ? "" : "s"}
          </>
        ) : (
          <>
            {from}–{to} of {page.total} {noun}
            {page.total === 1 ? "" : "s"}
          </>
        )}
      </span>

      {page.pages > 1 && (
        <span className="flex items-center gap-1">
          <PagerLink href={step(-1)} disabled={page.page <= 1} label="Previous">
            <ChevronLeft className="size-4" />
          </PagerLink>
          <span className="px-2 tabular-nums">
            Page {page.page} of {page.pages}
          </span>
          <PagerLink href={step(1)} disabled={page.page >= page.pages} label="Next">
            <ChevronRight className="size-4" />
          </PagerLink>
        </span>
      )}
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const base = "inline-flex size-8 items-center justify-center rounded-lg border border-line";
  if (disabled) {
    return (
      <span aria-disabled className={cn(base, "opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(base, "transition-colors hover:bg-paper-sunken hover:text-ink")}>
      {children}
    </Link>
  );
}
