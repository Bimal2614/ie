import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { TERMS } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms of Use: IELTSVega IELTS Practice Platform",
  description: "The terms governing your use of IELTSVega: accounts and subscriptions, acceptable use, the status of AI band estimates, intellectual property and liability.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={TERMS} />
    </MarketingShell>
  );
}
