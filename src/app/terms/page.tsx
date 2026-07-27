import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { TERMS } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Use | IELTSAce",
  description: "The terms governing your use of the IELTSAce IELTS practice platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={TERMS} />
    </MarketingShell>
  );
}
