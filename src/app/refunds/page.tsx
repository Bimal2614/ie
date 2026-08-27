import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { REFUNDS } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Refund Policy for IELTSVega Subscriptions",
  description: "When a refund is available on an IELTSVega subscription, how to request one, how long it takes, and what happens to your practice history afterwards.",
  path: "/refunds",
});

export default function RefundsPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={REFUNDS} />
    </MarketingShell>
  );
}
