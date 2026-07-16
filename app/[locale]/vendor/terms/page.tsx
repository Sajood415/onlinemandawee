import type { Metadata } from "next";

import { LegalPageShowcase } from "@/components/content/LegalPageShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { vendorTermsPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(vendorTermsPage);

export default function VendorTermsPage() {
  return <LegalPageShowcase pageKey="vendorTerms" />;
}
