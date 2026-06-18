import type { Metadata } from "next";

import { ContentPageView } from "@/components/content/ContentPageView";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { contactPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(contactPage);

export default function ContactPage() {
  return <ContentPageView page={contactPage} />;
}
