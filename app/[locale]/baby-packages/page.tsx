import type { Metadata } from "next";

import { BabyPackagesShowcase } from "@/components/baby-packages/BabyPackagesShowcase";

export const metadata: Metadata = {
  title: "Baby Packages | Online Mandawee",
  description:
    "Shop newborn and baby-care package essentials with trusted products across the marketplace.",
};

export default function BabyPackagesPage() {
  return <BabyPackagesShowcase />;
}
