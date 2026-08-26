const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=400&q=80`;

/** Default circular tile when a category has no admin-uploaded image in the DB. */
export const CATEGORY_FALLBACK_IMAGE_BY_SLUG: Record<string, string> = {
  breakfast: u("photo-1525351484163-7529414344d8"),
  grocery: u("photo-1542838132-92c53300491e"),
  snacks: u("photo-1566478989037-e57707812d8f"),
  beverages: u("photo-1544145945-f90425340c7e"),
  fruits: u("photo-1619566636850-adf874a44096"),
  vegetables: u("photo-1540420773420-3366772f4999"),
  dairy: u("photo-1628088062854-d1870b4553da"),
  "cleaning-products": u("photo-1581578731548-c64695cc6952"),
  "baby-care": u("photo-1515488042361-ee00e4ddd4e4"),
  "personal-care": u("photo-1596462502278-27bfdc403348"),
  "stationery-items": u("photo-1495446815901-a7297e633e8d"),
  "whey-proteins": u("photo-1593095948071-474c5cc2989d"),
  "fresh-fruits": u("photo-1610832958506-aa875681424e"),
  "dry-fruits-nuts": u("photo-1599599810769-bcde5a160d32"),
  "fresh-vegetables": u("photo-1512621776951-a57141f2eefd"),
  "leafy-greens": u("photo-1622206151226-996364331598"),
  "milk-yogurt": u("photo-1488477181946-6428a0291777"),
  "cheese-butter": u("photo-1452195100-68098d5668be"),
  "soft-drinks-juices": u("photo-1600271886742-f049cd5bbae8"),
  "water-hydration": u("photo-1548839140-5a516a9145a6"),
  "chips-crackers": u("photo-1566478989037-e57707812d8f"),
  "nuts-seeds": u("photo-1599599810769-bcde5a160d32"),
  "rice-grains": u("photo-1586201375761-83865001e31c"),
  "oils-spices": u("photo-1596040033229-a9821ebd058d"),
  "diapers-wipes": u("photo-1584464491033-06628f3a6b7b"),
  "baby-food-formula": u("photo-1578662996442-48f60103fc96"),
};

export function resolveCategoryFallbackImage(slug: string): string | undefined {
  return CATEGORY_FALLBACK_IMAGE_BY_SLUG[slug];
}
