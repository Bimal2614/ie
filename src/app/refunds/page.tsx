import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { REFUNDS } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Refund Policy | IELTSVega",
  description: "When refunds are available for IELTSVega subscriptions and how to request one.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={REFUNDS} />
    </MarketingShell>
  );
}
