import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { privacyPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(privacyPage);

export default function PrivacyPolicyPage() {
  return <ContentPageView page={privacyPage} />;
}
