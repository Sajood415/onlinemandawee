import type { Metadata } from "next";

import type { ContentPageDefinition } from "@/lib/content/types";

export function buildContentPageMetadata(page: ContentPageDefinition): Metadata {
  return {
    title: `${page.title} | Online Mandawee`,
    description: page.subtitle,
  };
}
