import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { PRIVACY } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy: How IELTSVega Handles Your Data",
  description: "How IELTSVega collects, uses, stores and protects your personal data, including practice answers and voice recordings, and the rights you hold over it.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={PRIVACY} />
    </MarketingShell>
  );
}
