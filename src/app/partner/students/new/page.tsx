import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EnrolForm } from "@/components/partner/enrol-form";
import { RateCard } from "@/components/partner/plan-picker";
import { quotesFor } from "@/lib/partner-pricing";
import { partnerContext } from "@/lib/partners";
import { DEFAULT_CURRENCY } from "@/lib/plans";

export default async function EnrolStudentPage() {
  const { partner, rate } = await partnerContext();
  const quotes = quotesFor(DEFAULT_CURRENCY, rate);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/partner"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Students
        </Link>
        <h1 className="display mt-2 text-2xl text-ink">Enrol a student</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Create the account, hand over the credentials, and pay for their plan. No email is sent and
          nothing needs verifying — they can sign in the moment you are done.
        </p>
      </div>

      <RateCard quotes={quotes} />

      <EnrolForm quotes={quotes} canEnrol={partner.status === "active"} />
    </div>
  );
}
