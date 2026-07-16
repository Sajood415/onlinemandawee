import type { Metadata } from "next";

import { HelpShowcase } from "@/components/help/HelpShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { helpPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(helpPage);

export default function HelpCenterPage() {
  return <HelpShowcase />;
}
