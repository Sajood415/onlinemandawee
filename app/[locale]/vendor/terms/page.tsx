import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { vendorTermsPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(vendorTermsPage);

export default function VendorTermsPage() {
  return <ContentPageView page={vendorTermsPage} />;
}
