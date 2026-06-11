import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import type { CatalogRow } from "@/components/products/types";

export async function fetchRelatedProductsByCategory(
  categorySlug: string,
  excludeProductId: string,
  limit = 8
): Promise<CatalogRow[]> {
  try {
    const catalogProducts: PublicCatalogProduct[] = await fetchPublicCatalogProducts({
      category: categorySlug,
    });
    return catalogProducts
      .filter((product) => product.id !== excludeProductId)
      .slice(0, limit);
  } catch {
    return [];
  }
}
