import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { aboutPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(aboutPage);

export default function AboutPage() {
  return <ContentPageView page={aboutPage} />;
}
