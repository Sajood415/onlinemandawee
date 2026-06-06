import productData from "@/data/product.json";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import type { CatalogRow } from "@/components/products/types";

const staticProducts = productData.featuredProducts as CatalogRow[];

export async function fetchRelatedProductsByCategory(
  categorySlug: string,
  excludeProductId: string,
  limit = 8
): Promise<CatalogRow[]> {
  let catalogProducts: PublicCatalogProduct[] = [];

  try {
    catalogProducts = await fetchPublicCatalogProducts({ category: categorySlug });
  } catch {
    catalogProducts = [];
  }

  const staticInCategory = staticProducts.filter(
    (product) => product.category === categorySlug && product.id !== excludeProductId
  );

  const catalogRelated = catalogProducts.filter((product) => product.id !== excludeProductId);

  const seen = new Set<string>();
  const merged: CatalogRow[] = [];

  for (const product of [...catalogRelated, ...staticInCategory]) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    merged.push(product);
  }

  return merged.slice(0, limit);
}
