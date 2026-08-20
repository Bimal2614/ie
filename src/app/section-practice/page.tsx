import type { Metadata } from "next";
import { Library } from "lucide-react";
import { requireUser } from "@/lib/dal";
import { SectionBrowser } from "@/components/practice/section-browser";

export const metadata: Metadata = {
  title: "Section-wise practice · IELTSAce",
  description:
    "Sit a real IELTS exam part end to end — one recording or passage, every question type it asks, numbered exactly as the paper does.",
};

/**
 * Practice by SOURCE, its own area of the app.
 *
 * /practice drills by TASK TYPE ("give me table completions"). This drills by
 * the paper: a whole exam part as the book prints it, one recording answered
 * across the two or three task types it really mixes. It used to be a block at
 * the foot of /practice reached by a #hash, which meant the flow had no address
 * of its own and the player's way out pointed at an anchor.
 */
export default async function SectionPracticePage() {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            By source
          </p>
          <h1 className="display mt-1 text-2xl md:text-3xl">Section-wise practice</h1>
          <p className="mt-2 max-w-2xl text-base text-ink-soft">
            Sit a real exam part end to end — one recording or passage, every question type
            it asks, numbered exactly as the paper does.
          </p>
        </div>
        <span className="chip">
          <Library className="h-3.5 w-3.5" />
          Cambridge &amp; more
        </span>
      </div>

      <SectionBrowser />
    </div>
  );
}
