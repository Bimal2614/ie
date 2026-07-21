import { AlertTriangle } from "lucide-react";
import { PageHead } from "./marketing-shell";
import type { LegalDoc } from "@/lib/legal-content";

/** Renders a legal document (Terms/Privacy/Refunds) as readable prose. */
export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <PageHead eyebrow="Legal" title={doc.title} />
      <p className="mt-3 text-sm text-ink-muted">{doc.updated}</p>

      {/* Template disclaimer — remove once finalised with counsel. */}
      <div className="mt-6 flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-ink-soft">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>This is a starting template with placeholders (e.g. company name, jurisdiction). Have it reviewed by a qualified lawyer and complete your details before launch — it is not legal advice.</p>
      </div>

      <p className="mt-6 text-ink-soft">{doc.intro}</p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold text-ink">{s.heading}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-ink-soft">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-3 space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm text-ink-soft">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-muted/50" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
