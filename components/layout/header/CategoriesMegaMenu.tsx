"use client";

import Image from "next/image";
import { ChevronRight, ShoppingBag, X } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import type { HeaderCopy } from "@/components/layout/header/header-copy";
import { Link as LocaleLink } from "@/i18n/navigation";

export type MegaMenuCategory = {
  id: string;
  slug: string;
  href: string;
  label: string;
  image?: string;
  children: {
    id: string;
    slug: string;
    href: string;
    label: string;
    image?: string;
  }[];
};

type CategoriesMegaMenuProps = {
  categories: MegaMenuCategory[];
  activeCategory: MegaMenuCategory | null;
  onSelectCategory: (slug: string) => void;
  onClose: () => void;
  isRtl: boolean;
  copy: HeaderCopy;
  getCategoryIcon: (slug: string, size?: number) => ReactNode;
  variants: Variants;
};

function formatCategoriesOf(template: string, name: string) {
  return template.includes("{name}")
    ? template.replace("{name}", name)
    : `${template} ${name}`;
}

function MegaThumb({
  image,
  label,
  fallback,
  sizeClass,
}: {
  image?: string;
  label: string;
  fallback: ReactNode;
  sizeClass: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f4f6f9] ring-1 ring-black/5 ${sizeClass}`}
    >
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          className="object-contain object-center p-0.5"
          sizes="40px"
        />
      ) : (
        <span className="text-[#0F3460]/70" aria-hidden>
          {fallback}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function SubcategoryCircle({
  href,
  label,
  image,
  fallback,
  onClick,
}: {
  href: string;
  label: string;
  image?: string;
  fallback: ReactNode;
  onClick: () => void;
}) {
  return (
    <LocaleLink
      href={href}
      onClick={onClick}
      className="group flex w-[92px] flex-col items-center gap-2.5 sm:w-[104px]"
    >
      <span className="relative flex h-[76px] w-[76px] items-center justify-center sm:h-[88px] sm:w-[88px]">
        <span
          className="absolute inset-0 rounded-full bg-white shadow-[0_6px_18px_rgba(15,52,96,0.08)] ring-1 ring-gray-100 transition duration-200 group-hover:shadow-[0_10px_24px_rgba(236,27,35,0.12)] group-hover:ring-[#ec1b23]/20"
          aria-hidden
        />
        <span className="relative z-1 flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full bg-[#f7f8fb] sm:h-[72px] sm:w-[72px]">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-contain object-center p-1.5 transition-transform duration-300 group-hover:scale-105"
              sizes="72px"
            />
          ) : (
            <span className="text-[#0F3460]/65 transition-colors group-hover:text-[#ec1b23]">
              {fallback}
            </span>
          )}
        </span>
      </span>
      <span className="line-clamp-2 text-center text-[12px] font-medium leading-snug text-neutral-700 transition-colors group-hover:text-[#0F3460] sm:text-[13px]">
        {label}
      </span>
    </LocaleLink>
  );
}

export function CategoriesMegaMenu({
  categories,
  activeCategory,
  onSelectCategory,
  onClose,
  isRtl,
  copy,
  getCategoryIcon,
  variants,
}: CategoriesMegaMenuProps) {
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
    : copy.exploreCategories;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute inset-x-0 top-full z-[9999] px-2 pt-1 sm:px-3 lg:px-4"
    >
      <div
        className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_18px_50px_rgba(15,52,96,0.14)]"
        style={{
          height: "min(480px, calc(100dvh - var(--header-height) - 12px))",
        }}
      >
        <div
          className={`flex h-full min-h-0 ${isRtl ? "flex-row-reverse" : ""}`}
        >
          <aside
            className={`h-full w-[220px] shrink-0 overflow-y-auto bg-[#fbfcfe] py-2 sm:w-[240px] ${
              isRtl ? "border-s border-gray-100" : "border-e border-gray-100"
            }`}
          >
            {categories.map((category) => {
              const isActive = activeCategory?.slug === category.slug;
              return (
                <button
                  key={category.id}
                  type="button"
                  onMouseEnter={() => onSelectCategory(category.slug)}
                  onFocus={() => onSelectCategory(category.slug)}
                  onClick={() => onSelectCategory(category.slug)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isRtl ? "flex-row-reverse text-right" : "text-left"
                  } ${
                    isActive
                      ? `bg-white font-semibold text-[#0F3460] ${
                          isRtl
                            ? "shadow-[inset_-3px_0_0_#ec1b23]"
                            : "shadow-[inset_3px_0_0_#ec1b23]"
                        }`
                      : "text-neutral-600 hover:bg-white hover:text-neutral-900"
                  }`}
                >
                  <span className="min-w-0 flex-1 line-clamp-1">
                    {category.label}
                  </span>
                  <MegaThumb
                    image={category.image}
                    label={category.label}
                    fallback={getCategoryIcon(category.slug, 16)}
                    sizeClass="h-9 w-9"
                  />
                </button>
              );
            })}
          </aside>

          <div className="relative min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
                  {panelTitle}
                </h3>
                {activeCategory ? (
                  <LocaleLink
                    href={activeCategory.href}
                    onClick={onClose}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#0F3460] transition-colors hover:text-[#ec1b23]"
                  >
                    <span>
                      {copy.megaAllIn} {activeCategory.label}
                    </span>
                    <ChevronRight
                      size={14}
                      className={isRtl ? "rotate-180" : undefined}
                    />
                  </LocaleLink>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200"
                aria-label={copy.close}
              >
                <X size={16} />
              </button>
            </div>

            {panelItems.length > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-5 sm:gap-x-6 sm:gap-y-6">
                {panelItems.map((item) => (
                  <SubcategoryCircle
                    key={item.id}
                    href={item.href}
                    label={item.label}
                    image={item.image}
                    fallback={getCategoryIcon(item.slug, 22) ?? (
                      <ShoppingBag size={22} />
                    )}
                    onClick={onClose}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">{copy.megaNoSubcategories}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
