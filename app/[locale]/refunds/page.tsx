import type { Metadata } from "next";

import { LegalPageShowcase } from "@/components/content/LegalPageShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { refundsPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(refundsPage);

export default function RefundPolicyPage() {
  return <LegalPageShowcase pageKey="refunds" />;
}
