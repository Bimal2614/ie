"use client";

import { useState } from "react";
import { AlertCircle, X, Loader2, CheckCircle2 } from "lucide-react";
import { reportQuestion } from "@/app/actions/report";
import { cn } from "@/lib/utils";

const REASONS: { value: string; label: string }[] = [
  { value: "wrong_answer", label: "The answer key looks wrong" },
  { value: "typo_unclear", label: "Typo or unclear wording" },
  { value: "media_problem", label: "Audio / image problem" },
  { value: "other", label: "Something else" },
];

/** A small "Report a problem" control + modal for a single question. */
export function ReportQuestionButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong_answer");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setState("sending");
    setError(null);
    const res = await reportQuestion({ questionId, reason, note });
    if (res.ok) {
      setState("done");
      setTimeout(() => setOpen(false), 1200);
    } else {
      setState("error");
      setError(res.error ?? "Couldn't send. Please try again.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report a problem with this question"
        aria-label="Report a problem"
        className="grid size-7 place-items-center rounded-md text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
      >
        <AlertCircle className="size-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-line bg-paper-elev p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Report a problem</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </div>

            {state === "done" ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                <CheckCircle2 className="size-5 text-green" /> Thanks — we&apos;ll review this question.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                        reason === r.value ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-soft hover:bg-paper-sunken",
                      )}
                    >
                      <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="sr-only" />
                      <span className={cn("size-3.5 rounded-full border", reason === r.value ? "border-4 border-brand" : "border-line-strong")} />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  placeholder="Anything else we should know? (optional)"
                  className="mt-3 h-20 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
                {error && <p className="mt-2 text-xs text-danger">{error}</p>}
                <button
                  type="button"
                  onClick={submit}
                  disabled={state === "sending"}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                >
                  {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Send report
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
