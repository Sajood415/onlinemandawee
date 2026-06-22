import type { Metadata } from "next";

import { DealsPageClient } from "./DealsPageClient";

export const metadata: Metadata = {
  title: "Deals | Online Mandawee",
  description:
    "Discover featured marketplace deals and save on products from trusted vendors.",
};

export default function DealsPage() {
  return <DealsPageClient />;
}
