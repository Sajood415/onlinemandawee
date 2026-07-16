import type { Metadata } from "next";

import { LegalPageShowcase } from "@/components/content/LegalPageShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { termsPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(termsPage);

export default function TermsOfServicePage() {
  return <LegalPageShowcase pageKey="terms" />;
}
