"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Baby,
  Cherry,
  Cookie,
  Croissant,
  ShoppingBag,
  Wine,
  X,
  ChevronRight,
} from "lucide-react";
import { useLocale } from "next-intl";

import {
  headerCopy,
  type HeaderCopy,
} from "@/components/layout/header/header-copy";
import type {
  MegaMenuBrowseMode,
  MegaMenuCategory,
} from "@/components/layout/header/CategoriesMegaMenu";
import { PortalOverlay } from "@/components/ui/PortalOverlay";
import { Link as LocaleLink } from "@/i18n/navigation";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { resolveCategoryFallbackImage } from "@/lib/categories/category-fallback-images";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type MobileCategoriesDrawerProps = {
  open: boolean;
  onClose: () => void;
};

function getCategoryIcon(slug: string, size = 18): ReactNode {
  const icons: Record<string, ReactNode> = {
    "breakfast-items": <Croissant size={size} />,
    food: <ShoppingBag size={size} />,
    snack: <Cookie size={size} />,
    beverages: <Wine size={size} />,
    fruits: <Cherry size={size} />,
    vegetables: <Cherry size={size} />,
    "baby-care": <Baby size={size} />,
  };
  return icons[slug] ?? <ShoppingBag size={size} />;
}

function formatCategoriesOf(template: string, name: string) {
  return template.includes("{name}")
    ? template.replace("{name}", name)
    : `${template} ${name}`;
}

function productHref(slug: string) {
  return `/products/${encodeURIComponent(slug)}`;
}

export function MobileCategoriesDrawer({ open, onClose }: MobileCategoriesDrawerProps) {
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const copy: HeaderCopy = headerCopy[safeLocale];

  const [browseMode, setBrowseMode] = useState<MegaMenuBrowseMode>("platform");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [platformCategories, setPlatformCategories] = useState<MegaMenuCategory[]>([]);
  const [vendorCategories, setVendorCategories] = useState<MegaMenuCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);

    const load = async () => {
      try {
        const [catRes, vendorRes] = await Promise.all([
          fetch("/api/catalog/categories"),
          fetch(`/api/catalog/vendor-categories?locale=${safeLocale}`),
        ]);

        if (catRes.ok) {
          const data = await parseApiResponse<
            Array<{
              id: string;
              name: string;
              slug: string;
              image?: string;
              translations?: unknown;
              children?: Array<{
                id: string;
                name: string;
                slug: string;
                image?: string;
                translations?: unknown;
              }>;
            }>
          >(catRes);
          if (mounted) {
            setPlatformCategories(
              data.map((category) => ({
                id: category.id,
                slug: category.slug,
                href: productHref(category.slug),
                label: resolveCategoryLabel(
                  category.slug,
                  category.name,
                  safeLocale,
                  category.translations,
                ),
                image: category.image || resolveCategoryFallbackImage(category.slug),
                children: (category.children ?? []).map((child) => ({
                  id: child.id,
                  slug: child.slug,
                  href: productHref(child.slug),
                  label: resolveCategoryLabel(
                    child.slug,
                    child.name,
                    safeLocale,
                    child.translations,
                  ),
                  image: child.image,
                })),
              })),
            );
          }
        }

        if (vendorRes.ok) {
          const data = await parseApiResponse<
            Array<{
              id: string;
              slug: string;
              name: string;
              href: string;
              image?: string;
              children: Array<{
                id: string;
                slug: string;
                name: string;
                image?: string;
                href: string;
              }>;
            }>
          >(vendorRes);
          if (mounted) {
            setVendorCategories(
              data.map((category) => ({
                id: category.id,
                slug: category.slug,
                href: category.href,
                label: category.name,
                image: category.image,
                children: category.children.map((child) => ({
                  id: child.id,
                  slug: child.slug,
                  href: child.href,
                  label: child.name,
                  image: child.image,
                })),
              })),
            );
          }
        }
      } catch {
        // keep whatever we already have
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [open, safeLocale]);

  const categories =
    browseMode === "platform" ? platformCategories : vendorCategories;

  useEffect(() => {
    if (!open || categories.length === 0) return;
    setActiveSlug((current) => {
      if (current && categories.some((c) => c.slug === current)) return current;
      return categories[0].slug;
    });
  }, [browseMode, categories, open]);

  const activeCategory = useMemo(() => {
    if (categories.length === 0) return null;
    return categories.find((c) => c.slug === activeSlug) ?? categories[0];
  }, [activeSlug, categories]);

  const panelItems =
    activeCategory && activeCategory.children.length > 0
      ? activeCategory.children.map((child) => ({
          ...child,
          image: child.image || activeCategory.image,
        }))
      : categories.filter((item) => item.slug !== activeCategory?.slug);

  const panelTitle = activeCategory
    ? activeCategory.children.length > 0
      ? formatCategoriesOf(copy.megaCategoriesOf, activeCategory.label)
      : copy.megaRelatedCategories
    : browseMode === "vendor"
      ? copy.megaBrowseVendors
      : copy.exploreCategories;

  const allInLabel =
    browseMode === "vendor"
      ? `${copy.megaAllShopsIn} ${activeCategory?.label ?? ""}`
      : `${copy.megaAllIn} ${activeCategory?.label ?? ""}`;

  return (
    <PortalOverlay open={open}>
      <div className="fixed inset-0 z-[10040] md:hidden" dir={isRtl ? "rtl" : "ltr"}>
        <button
          type="button"
          aria-label={copy.close}
          className="absolute inset-0 bg-black/45"
          onClick={onClose}
        />

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-12px_40px_rgba(15,52,96,0.18)]"
              role="dialog"
              aria-modal="true"
              aria-label={copy.categories}
            >
              <div className="flex shrink-0 justify-center pt-2.5 pb-1" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-neutral-300" />
              </div>

              <div
                className="flex shrink-0 items-center gap-1 border-b border-neutral-100 px-2 ps-3"
                role="tablist"
                aria-label={copy.categories}
              >
                {(
                  [
                    { mode: "platform" as const, label: copy.megaBrowseMandawee },
                    { mode: "vendor" as const, label: copy.megaBrowseVendors },
                  ] as const
                ).map(({ mode, label }) => {
                  const isActive = browseMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setBrowseMode(mode)}
                      className={`relative min-w-0 flex-1 px-2 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "font-semibold text-secondary"
                          : "text-neutral-500"
                      }`}
                    >
                      <span className="line-clamp-1">{label}</span>
                      {isActive ? (
                        <span
                          className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={onClose}
                  className="ms-1 me-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
                  aria-label={copy.close}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {loading && categories.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-neutral-500">…</p>
                ) : categories.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-neutral-500">
                    {copy.megaNoSubcategories}
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2 overflow-x-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {categories.map((category) => {
                        const selected = activeCategory?.slug === category.slug;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setActiveSlug(category.slug)}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                              selected
                                ? "border-secondary bg-secondary text-white"
                                : "border-neutral-200 bg-white text-neutral-700"
                            }`}
                          >
                            <span className="relative h-7 w-7 overflow-hidden rounded-full bg-neutral-100">
                              {category.image ? (
                                <Image
                                  src={category.image}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="28px"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-secondary/70">
                                  {getCategoryIcon(category.slug, 14)}
                                </span>
                              )}
                            </span>
                            <span className="max-w-[9rem] truncate font-medium">
                              {category.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="px-4 pb-2">
                      <h3 className="text-base font-semibold text-neutral-900">{panelTitle}</h3>
                      {activeCategory ? (
                        <LocaleLink
                          href={activeCategory.href}
                          onClick={onClose}
                          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-secondary"
                        >
                          <span>{allInLabel}</span>
                          <ChevronRight
                            size={14}
                            className={isRtl ? "rotate-180" : undefined}
                          />
                        </LocaleLink>
                      ) : null}
                    </div>

                    {panelItems.length > 0 ? (
                      <div className="grid grid-cols-3 gap-x-3 gap-y-5 px-4 pb-6 min-[400px]:grid-cols-4">
                        {panelItems.map((item) => (
                          <LocaleLink
                            key={item.id}
                            href={item.href}
                            onClick={onClose}
                            className="flex flex-col items-center gap-2"
                          >
                            <span className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-[#f7f8fb] ring-1 ring-black/5">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="72px"
                                />
                              ) : (
                                <span className="text-secondary/65">
                                  {getCategoryIcon(item.slug, 22)}
                                </span>
                              )}
                            </span>
                            <span className="line-clamp-2 text-center text-[12px] font-medium leading-snug text-neutral-700">
                              {item.label}
                            </span>
                          </LocaleLink>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 pb-6 text-sm text-neutral-500">
                        {copy.megaNoSubcategories}
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </PortalOverlay>
  );
}
