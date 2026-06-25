/** Top-level storefront departments — slugs match homepage category tiles. */
export const STOREFRONT_DEPARTMENTS = [
  { name: "Breakfast", slug: "breakfast", sortOrder: 1, image: "/categories/breakfastItems.webp" },
  { name: "Food / Edible Grocery", slug: "grocery", sortOrder: 2, image: "/categories/edibleGrocery.webp" },
  { name: "Snacks", slug: "snacks", sortOrder: 3, image: "/categories/snackBar.webp" },
  { name: "Beverages", slug: "beverages", sortOrder: 4, image: "/categories/beverages.webp" },
  { name: "Fruits", slug: "fruits", sortOrder: 5, image: "/categories/fruits.webp" },
  { name: "Vegetables", slug: "vegetables", sortOrder: 6, image: "/categories/vegetables.webp" },
  { name: "Dairy Products", slug: "dairy", sortOrder: 7, image: "/categories/dairyProducts.webp" },
  { name: "Cleaning Products", slug: "cleaning-products", sortOrder: 8, image: "/categories/cleaningProducts.webp" },
  { name: "Baby Care", slug: "baby-care", sortOrder: 9, image: "/categories/babyCare.webp" },
  { name: "Personal Care", slug: "personal-care", sortOrder: 10, image: "/categories/personalCare.webp" },
  { name: "Stationery Items", slug: "stationery-items", sortOrder: 11, image: "/categories/stationaryItems.webp" },
  { name: "Whey Protein", slug: "whey-proteins", sortOrder: 12, image: "/categories/wheyProteins.webp" },
] as const;

export function getDepartmentImage(slug: string): string | undefined {
  return STOREFRONT_DEPARTMENTS.find((department) => department.slug === slug)?.image;
}
