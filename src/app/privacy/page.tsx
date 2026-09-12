import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { PRIVACY } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy: How IELTSVega Handles Your Data",
  description: "What IELTSVega collects, every provider we send it to, the cookies we set, how long data is kept, and how to get a copy, a correction or deletion.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={PRIVACY} />
    </MarketingShell>
  );
}
