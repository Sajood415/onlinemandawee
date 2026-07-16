import type { Metadata } from "next";

import { HowItWorksShowcase } from "@/components/how-it-works/HowItWorksShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { howItWorksPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(howItWorksPage);

export default function HowItWorksPage() {
  return <HowItWorksShowcase />;
}
