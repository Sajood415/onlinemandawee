import { getDepartmentImage } from "@/lib/categories/storefront-departments";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { CategoryTranslations } from "@/lib/localization/category-content";

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  translations?: unknown;
};

export type PublicCategoryNode = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  translations?: CategoryTranslations | null;
  image?: string;
};

export type PublicCategoryDetail = PublicCategoryNode & {
  parent: PublicCategoryNode | null;
  children: PublicCategoryNode[];
};

export function serializePublicCategoryNode(
  category: CategoryRecord,
  options?: { image?: string }
): PublicCategoryNode {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    translations: (category.translations as CategoryTranslations | null | undefined) ?? null,
    image: options?.image ?? getDepartmentImage(category.slug),
  };
}

export function serializePublicCategoryDetail(
  category: CategoryRecord & {
    parent: CategoryRecord | null;
    children: CategoryRecord[];
  }
): PublicCategoryDetail {
  return {
    ...serializePublicCategoryNode(category),
    parent: category.parent ? serializePublicCategoryNode(category.parent) : null,
    children: category.children.map((child) => serializePublicCategoryNode(child)),
  };
}

export async function fetchPublicCategory(slug: string) {
  const res = await fetch(`/api/catalog/categories/${encodeURIComponent(slug)}`);
  return parseApiResponse<PublicCategoryDetail>(res);
}
