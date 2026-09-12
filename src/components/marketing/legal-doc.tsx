import { Info } from "lucide-react";
import { PageHead } from "./marketing-shell";
import { sectionId, type LegalDoc, type LegalSection, type LegalTable } from "@/lib/legal-content";

/**
 * Renders a legal document (Terms/Privacy/Refunds).
 *
 * These documents are long by necessity, so the two affordances that matter are
 * a contents list that links into them and a stable `id` on every section — a
 * support reply can then point at /privacy#retention rather than "section 9".
 * `sectionId` derives those ids from the same data, so a heading and its anchor
 * cannot drift apart.
 *
 * Section parts render in a fixed order (paragraphs → table → bullets → note →
 * callout) because the order is a property of the document, not of the markup;
 * see LegalSection.
 */
export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <PageHead eyebrow="Legal" title={doc.title} lead={doc.lead} />

      <p className="mt-4 text-sm text-ink-muted">
        Last updated: {doc.updated}
        {doc.effective !== doc.updated ? ` · In effect from: ${doc.effective}` : null}
      </p>

      <p className="mt-6 text-ink-soft">{doc.intro}</p>

      {/* Contents. Plain anchors — no JS, and they survive with scroll-mt below. */}
      <nav aria-label="Contents" className="mt-8 rounded-2xl border border-line bg-paper-sunken p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Contents</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {doc.sections.map((s) => (
            <li key={s.heading}>
              <a
                href={`#${sectionId(s)}`}
                className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {doc.sections.map((s) => (
          <Section key={s.heading} section={s} />
        ))}
      </div>
    </>
  );
}

function Section({ section: s }: { section: LegalSection }) {
  return (
    /* scroll-mt keeps the heading clear of the sticky nav when linked to. */
    <section id={sectionId(s)} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-ink">{s.heading}</h2>

      {s.paragraphs?.map((p) => (
        <p key={p} className="mt-2 text-sm leading-relaxed text-ink-soft">
          {p}
        </p>
      ))}

      {s.table && <Table table={s.table} caption={s.heading} />}

      {s.bullets && (
        <ul className="mt-3 space-y-2">
          {s.bullets.map((b) => (
            <li key={b} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
              <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-ink-muted/50" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {s.note?.map((p) => (
        <p key={p} className="mt-3 text-sm leading-relaxed text-ink-soft">
          {p}
        </p>
      ))}

      {s.callout && (
        <div className="mt-4 flex gap-3 rounded-xl border border-line bg-paper-sunken p-4 text-sm text-ink-soft">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          <p>{s.callout}</p>
        </div>
      )}
    </section>
  );
}

/**
 * The sub-processor, cookie and retention disclosures are genuinely tabular, and
 * flattening them into prose is how a reader loses track of which provider gets
 * what. Wrapped in its own scroll container so a three-column table cannot make
 * the page itself scroll sideways on a phone.
 */
function Table({ table, caption }: { table: LegalTable; caption: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-paper-sunken">
            {table.columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]} className="border-t border-line align-top">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={
                    i === 0
                      ? "px-4 py-3 font-medium text-ink"
                      : "px-4 py-3 leading-relaxed text-ink-soft"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
