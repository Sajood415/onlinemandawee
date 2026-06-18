import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { termsPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(termsPage);

export default function TermsOfServicePage() {
  return <ContentPageView page={termsPage} />;
}
