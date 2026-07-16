import type { Metadata } from "next";

import { SupportShowcase } from "@/components/support/SupportShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { contactPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(contactPage);

export default function ContactPage() {
  return <SupportShowcase />;
}
