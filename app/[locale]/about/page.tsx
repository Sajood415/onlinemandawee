import type { Metadata } from "next";

import { AboutShowcase } from "@/components/about/AboutShowcase";
import { buildContentPageMetadata } from "@/lib/content/metadata";
import { aboutPage } from "@/lib/content/pages";

export const metadata: Metadata = buildContentPageMetadata(aboutPage);

export default function AboutPage() {
  return <AboutShowcase />;
}
