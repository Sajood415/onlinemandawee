import type { CatalogRow } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { localizedRecordSearchValues } from "@/lib/localization/product-content";

function getGiftSearchText(product: CatalogRow) {
  return [
    product.name.en,
    product.name.ps,
    product.name["fa-AF"],
    product.category,
    ...localizedRecordSearchValues(
      "categoryName" in product ? product.categoryName : undefined
    ),
    "description" in product ? product.description?.en : undefined,
    "description" in product ? product.description?.ps : undefined,
    "description" in product ? product.description?.["fa-AF"] : undefined,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isGiftProduct(product: CatalogRow) {
  if (product.category === "gifts") return true;
  return getGiftSearchText(product).includes("gift");
}

export function filterGiftProducts(products: CatalogRow[], _locale: SupportedLocale) {
  return products.filter((product) => isGiftProduct(product));
}
