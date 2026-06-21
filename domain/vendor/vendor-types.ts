export const businessTypes = ["INDIVIDUAL", "REGISTERED_BUSINESS"] as const;
export const kycDocumentTypes = [
  "PASSPORT",
  "DRIVERS_LICENSE",
  "NATIONAL_ID",
] as const;
export const payoutMethodTypes = ["BANK", "STRIPE"] as const;
export const sellerTypes = ["PLATFORM", "THIRD_PARTY"] as const;
export const industryTypes = [
  "BAKERY",
  "CLOTHING",
  "ELECTRONICS",
  "FLORISTS",
  "DRIED_FRUITS",
  "CARPETS",
  "FOOD_BEVERAGES",
  "JEWELRY",
  "HEALTH_BEAUTY",
  "HOME_FURNITURE",
  "SPORTS_OUTDOORS",
  "BOOKS_STATIONERY",
  "TOYS_GAMES",
  "AUTOMOTIVE",
  "HANDICRAFTS",
  "AGRICULTURE",
  "OTHER",
] as const;

export const industryTypeLabels: Record<IndustryType, string> = {
  BAKERY: "Bakery",
  CLOTHING: "Clothing & Apparel",
  ELECTRONICS: "Electronics",
  FLORISTS: "Florists",
  DRIED_FRUITS: "Dried Fruits & Nuts",
  CARPETS: "Carpets & Rugs",
  FOOD_BEVERAGES: "Food & Beverages",
  JEWELRY: "Jewelry & Accessories",
  HEALTH_BEAUTY: "Health & Beauty",
  HOME_FURNITURE: "Home & Furniture",
  SPORTS_OUTDOORS: "Sports & Outdoors",
  BOOKS_STATIONERY: "Books & Stationery",
  TOYS_GAMES: "Toys & Games",
  AUTOMOTIVE: "Automotive",
  HANDICRAFTS: "Handicrafts & Artisan",
  AGRICULTURE: "Agriculture & Farming",
  OTHER: "Other",
};

export type BusinessType = (typeof businessTypes)[number];
export type KycDocumentType = (typeof kycDocumentTypes)[number];
export type PayoutMethodType = (typeof payoutMethodTypes)[number];
export type SellerType = (typeof sellerTypes)[number];
export type IndustryType = (typeof industryTypes)[number];
