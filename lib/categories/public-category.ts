import { parseApiResponse } from "@/lib/http/parse-api-response";

export type PublicCategoryDetail = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  image?: string;
  parent: { id: string; name: string; slug: string } | null;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    image?: string;
  }>;
};

export async function fetchPublicCategory(slug: string) {
  const res = await fetch(`/api/catalog/categories/${encodeURIComponent(slug)}`);
  return parseApiResponse<PublicCategoryDetail>(res);
}
