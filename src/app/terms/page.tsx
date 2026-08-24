import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { TERMS } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms of Use | IELTSVega",
  description: "The terms governing your use of the IELTSVega IELTS practice platform.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={TERMS} />
    </MarketingShell>
  );
}
