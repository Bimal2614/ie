import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { PRIVACY } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy | IELTSVega",
  description: "How IELTSVega collects, uses and protects your personal data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={PRIVACY} />
    </MarketingShell>
  );
}
