"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2, UserRound } from "lucide-react";

import { submitPartnerApplication } from "@/app/actions/partner-apply";
import { AuthField } from "@/components/auth/auth-ui";
import { PhoneField } from "@/components/auth/phone-field";
import { PARTNER_BATCH_SIZES } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * The partner application, as a form.
 *
 * IT ASKS FOR EXACTLY WHAT /admin/partners ASKS FOR, minus the login, because
 * whatever is missing here becomes an email exchange before a class can be
 * onboarded. The two sections mirror that form's two sections for the same
 * reason: an institute and the person who speaks for it are different things,
 * and the fields read as a pair of questions rather than a wall of inputs.
 *
 * NOTHING IS CREATED BY SUBMITTING IT — the action mails the lead — so the copy
 * never promises an account. It promises a reply, which is what actually
 * happens next, and the success panel hands back a reference so the applicant
 * has something to quote if they chase us.
 */

const selectClass =
  "h-11 w-full rounded-lg border border-line bg-paper-elev px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

const BATCH_LABELS: Record<(typeof PARTNER_BATCH_SIZES)[number], string> = {
  "1-25": "Up to 25 students",
  "26-100": "26 to 100 students",
  "101-300": "101 to 300 students",
  "300+": "More than 300 students",
};

const NEXT_STEPS = [
  { step: "1", body: "We read the application and check your details." },
  { step: "2", body: "We call or email you with your partner rate." },
  { step: "3", body: "We set up your panel and hand over the login." },
];

function SectionHead({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Building2;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper-sunken text-ink-soft">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
    </div>
  );
}

export function PartnerApplicationForm() {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  // The institute's name, kept for the success panel — the form is gone by then.
  const submittedName = useRef("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setErrors({});
    setError(null);

    startTransition(async () => {
      const result = await submitPartnerApplication({
        name: data.get("name"),
        location: data.get("location") ?? undefined,
        website: data.get("website") ?? undefined,
        contactName: data.get("contactName"),
        email: data.get("email"),
        phone: data.get("phone"),
        students: data.get("students") ?? undefined,
        message: data.get("message") ?? undefined,
        company: data.get("company") ?? undefined,
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error ?? null);
        return;
      }
      submittedName.current = String(data.get("name") ?? "");
      setReference(result.reference);
    });
  }

  if (reference) {
    return (
      <div className="rounded-2xl border border-line bg-paper-elev p-6 text-center sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-green/15 text-green">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="font-serif mt-5 text-2xl tracking-tight text-ink">Application received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Thanks — we have everything we need for{" "}
          <span className="font-medium text-ink">{submittedName.current}</span>. A confirmation is on
          its way to your inbox, and someone from our team will reply within one business day with
          your partner rate and the next steps.
        </p>

        <p className="font-mono mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-paper-sunken px-4 py-2 text-sm text-ink">
          <span className="text-ink-muted">Reference</span> {reference}
        </p>

        <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
          {NEXT_STEPS.map((s) => (
            <div key={s.step} className="rounded-xl border border-line bg-paper p-4">
              <span className="font-mono text-xs text-brand">Step {s.step}</span>
              <p className="mt-1.5 text-sm text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Back to the site <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative rounded-2xl border border-line bg-paper-elev p-6 sm:p-8"
    >
      <h2 className="font-serif text-2xl tracking-tight text-ink">Apply to partner with us</h2>
      <p className="mt-1.5 text-sm text-ink-muted">Takes a minute. We reply within one business day.</p>

      {error && (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      {/* ── The institute ── */}
      <div className="mt-7 space-y-4">
        <SectionHead
          icon={Building2}
          title="Your institute"
          hint="How your class appears to us and to your students."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="Institute name"
            id="p-name"
            name="name"
            placeholder="ILDS Classes"
            autoComplete="organization"
            required
            error={errors.name?.[0]}
          />
          <AuthField
            label="Location"
            id="p-location"
            name="location"
            placeholder="Ahmedabad, IN"
            autoComplete="address-level2"
            error={errors.location?.[0]}
          />
          <AuthField
            label="Website"
            id="p-website"
            name="website"
            placeholder="ildsclasses.com"
            autoComplete="url"
            error={errors.website?.[0]}
          />
          <div>
            <label htmlFor="p-students" className="mb-1.5 block text-xs font-medium text-ink-soft">
              Students per batch
            </label>
            <select id="p-students" name="students" defaultValue="" className={selectClass}>
              <option value="">Not sure yet</option>
              {PARTNER_BATCH_SIZES.map((b) => (
                <option key={b} value={b}>
                  {BATCH_LABELS[b]}
                </option>
              ))}
            </select>
            {errors.students?.[0] && (
              <p className="mt-1 text-xs text-danger">{errors.students[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── The person ── */}
      <div className="mt-7 space-y-4 rounded-xl border border-line bg-paper-sunken p-5">
        <SectionHead
          icon={UserRound}
          title="Who we'll speak to"
          hint="We confirm your rate on this email and number."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="Your name"
            id="p-contact"
            name="contactName"
            placeholder="Alex Morgan"
            autoComplete="name"
            required
            error={errors.contactName?.[0]}
          />
          <AuthField
            label="Email address"
            id="p-email"
            name="email"
            type="email"
            placeholder="you@ildsclasses.com"
            autoComplete="email"
            required
            error={errors.email?.[0]}
          />
          <div className="sm:col-span-2">
            <PhoneField id="p-phone" error={errors.phone?.[0]} />
          </div>
        </div>
      </div>

      {/* ── Anything else ── */}
      <div className="mt-5">
        <label htmlFor="p-message" className="mb-1.5 block text-xs font-medium text-ink-soft">
          Anything we should know? <span className="text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="p-message"
          name="message"
          rows={4}
          maxLength={1000}
          placeholder="How you teach, when your next batch starts, what you need from us…"
          className={cn(selectClass, "h-auto resize-y py-2.5 placeholder:text-ink-muted")}
        />
        {errors.message?.[0] && <p className="mt-1 text-xs text-danger">{errors.message[0]}</p>}
      </div>

      {/*
        Honeypot. Hidden from people (and from assistive tech, via aria-hidden +
        tabIndex) and left visible to the bots that fill every input they find.
        Deliberately NOT `display:none` — the crudest scripts skip those; an
        off-screen, zero-size field they do not.
      */}
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] size-0 overflow-hidden">
        <label htmlFor="p-company">Company</label>
        <input id="p-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Sending your application…" : "Submit application"}
        {!pending && <ArrowRight className="size-4" />}
      </button>

      <p className="mt-3 text-center text-xs text-ink-muted">
        No payment now, and no commitment. By applying you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
