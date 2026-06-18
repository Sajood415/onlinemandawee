import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { howItWorksPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(howItWorksPage);

export default function HowItWorksPage() {
  return <ContentPageView page={howItWorksPage} />;
}
