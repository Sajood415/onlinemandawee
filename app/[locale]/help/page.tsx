import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { helpPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(helpPage);

export default function HelpCenterPage() {
  return <ContentPageView page={helpPage} />;
}
