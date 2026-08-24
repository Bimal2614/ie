import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { REFUNDS } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Refund Policy | IELTSVega",
  description: "When refunds are available for IELTSVega subscriptions and how to request one.",
  path: "/refunds",
});

export default function RefundsPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={REFUNDS} />
    </MarketingShell>
  );
}
