import type { IndustryType } from "@/domain/vendor/vendor-types";
import { industryTypeLabels, industryTypes } from "@/domain/vendor/vendor-types";

/** Industries highlighted in the vendor browse experience. */
export const featuredIndustryTypes: IndustryType[] = [
  "BAKERY",
  "CLOTHING",
  "ELECTRONICS",
  "FLORISTS",
  "DRIED_FRUITS",
  "CARPETS",
];

export function getIndustryLabel(type: IndustryType) {
  return industryTypeLabels[type];
}

export function getAllIndustryTypes() {
  return industryTypes;
}

export function getSecondaryIndustryTypes() {
  const featured = new Set<IndustryType>(featuredIndustryTypes);
  return industryTypes.filter((type) => !featured.has(type) && type !== "OTHER");
}
