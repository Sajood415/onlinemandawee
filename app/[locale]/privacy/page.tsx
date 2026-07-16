import type { Metadata } from "next";

import { LegalPageShowcase } from "@/components/content/LegalPageShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { privacyPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(privacyPage);

export default function PrivacyPolicyPage() {
  return <LegalPageShowcase pageKey="privacy" />;
}
