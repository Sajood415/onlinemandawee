import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { refundsPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(refundsPage);

export default function RefundPolicyPage() {
  return <ContentPageView page={refundsPage} />;
}
