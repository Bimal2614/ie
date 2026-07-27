import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { PRIVACY } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy | IELTSAce",
  description: "How IELTSAce collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={PRIVACY} />
    </MarketingShell>
  );
}
