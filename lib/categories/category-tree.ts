export type CategoryTreeNode = {
  id: string;
  slug: string;
  parentId?: string | null;
};

/** Collect slug for a category and all active descendants. */
export function collectCategorySlugTree(
  categories: CategoryTreeNode[],
  selectedSlug: string
): Set<string> {
  const selected = categories.find((category) => category.slug === selectedSlug);
  if (!selected) return new Set([selectedSlug]);

  const slugs = new Set<string>();
  const visit = (id: string) => {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    slugs.add(category.slug);
    for (const child of categories) {
      if (child.parentId === id) visit(child.id);
    }
  };

  visit(selected.id);
  return slugs;
}
