"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMessages } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type CategoryItem = {
  id: number;
  image: string;
  slug: string;
  fallbackTitle: string;
};

type CategoryMessages = {
  Homepage?: {
    categoryCarousel?: {
      title?: string;
      swipeHint?: string;
      swipeLabel?: string;
      items?: string[];
    };
  };
};

const categories: CategoryItem[] = [
  { id: 1, image: "/categories/breakfastItems.webp", slug: "breakfast", fallbackTitle: "Breakfast Items" },
  { id: 2, image: "/categories/edibleGrocery.webp", slug: "grocery", fallbackTitle: "Edible Grocery" },
  { id: 3, image: "/categories/snackBar.webp", slug: "snacks", fallbackTitle: "Snack Bar" },
  { id: 4, image: "/categories/beverages.webp", slug: "beverages", fallbackTitle: "Beverages" },
  { id: 5, image: "/categories/fruits.webp", slug: "fruits", fallbackTitle: "Fruits" },
  { id: 6, image: "/categories/vegetables.webp", slug: "vegetables", fallbackTitle: "Vegetables" },
  { id: 7, image: "/categories/dairyProducts.webp", slug: "dairy", fallbackTitle: "Dairy Products" },
  { id: 8, image: "/categories/cleaningProducts.webp", slug: "cleaning-products", fallbackTitle: "Cleaning Products" },
  { id: 9, image: "/categories/babyCare.webp", slug: "baby-care", fallbackTitle: "Baby Care" },
  { id: 10, image: "/categories/personalCare.webp", slug: "personal-care", fallbackTitle: "Personal Care" },
  { id: 11, image: "/categories/wheyProteins.webp", slug: "whey-proteins", fallbackTitle: "Whey Proteins" },
  { id: 12, image: "/categories/stationaryItems.webp", slug: "stationery-items", fallbackTitle: "Stationery Items" },
];

export default function Categories() {
  const messages = useMessages() as CategoryMessages;
  const carousel = messages.Homepage?.categoryCarousel;
  const labels = Array.isArray(carousel?.items) ? carousel.items : [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollToIndex = (targetIndex: number) => {
    const total = categories.length;
    if (total === 0) return;

    const normalized = (targetIndex + total) % total;
    setCurrentIndex(normalized);
    itemRefs.current[normalized]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let frame = 0;

    const syncCurrentFromScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const viewportCenter = containerRect.left + containerRect.width / 2;

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      itemRefs.current.forEach((item, index) => {
        if (!item) return;
        const rect = item.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setCurrentIndex(bestIndex);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncCurrentFromScroll);
    };

    syncCurrentFromScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncCurrentFromScroll);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncCurrentFromScroll);
    };
  }, []);

  return (
    <section className="py-16 sm:py-20" style={{ backgroundColor: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          className="text-center text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {carousel?.title ?? "Shop By Category"}
        </motion.h2>

        <div className="relative mt-10 sm:mt-12">
          <div className="absolute left-0 top-22.5 z-30 hidden -translate-x-1/2 md:block lg:top-16 cursor-pointer">
            <ArrowButton direction="left" onClick={() => scrollToIndex(currentIndex - 1)} />
          </div>
          <div className="absolute right-0 top-22.5 z-30 hidden translate-x-1/2 md:block lg:top-16 cursor-pointer">
            <ArrowButton direction="right" onClick={() => scrollToIndex(currentIndex + 1)} />
          </div>

          <div className="flex md:hidden items-center justify-center gap-4 mt-4">
            <ArrowButton direction="left" onClick={() => scrollToIndex(currentIndex - 1)} />
            <span className="text-xs text-gray-400 font-medium">
              {carousel?.swipeHint ?? "Swipe or tap to explore"}
            </span>
            <ArrowButton direction="right" onClick={() => scrollToIndex(currentIndex + 1)} />
          </div>

          <div
            ref={scrollRef}
            className="flex gap-0 overflow-x-auto px-0.5 pb-4 pt-2 scroll-smooth no-scrollbar sm:gap-0 md:gap-0.25 lg:px-1"
          >
            {categories.map((item, index) => {
              const label = labels[index] ?? item.fallbackTitle;

              return (
                <motion.div
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Link
                    href={`/category/${item.slug}`}
                    className="group block min-w-32 shrink-0 text-center sm:min-w-36 lg:min-w-40"
                  >
                    <motion.div
                      className="relative flex items-center justify-center overflow-hidden rounded-lg transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      style={{ width: "140px", height: "150px", margin: "0 auto" }}
                    >
                      <Image
                        src={item.image}
                        alt={label}
                        fill
                        className="object-cover p-2 transition-transform duration-300 group-hover:scale-110"
                      />
                    </motion.div>
                    <p className="mt-2 text-[8px] font-bold uppercase tracking-widest text-slate-900 sm:text-[9px]">
                      {label}
                    </p>
                  </Link>
                </motion.div>
              );
            })}

            <div className="md:hidden flex items-center shrink-0 ml-2 pr-4">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="animate-pulse"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wider rotate-90 whitespace-nowrap">
                  {carousel?.swipeLabel ?? "Swipe"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <motion.button
      onClick={onClick}
      aria-label={`Scroll ${direction}`}
      className="flex h-10 w-10 items-center justify-center rounded-full border transition-all bg-white text-slate-800 border-slate-200 cursor-pointer hover:bg-primary hover:text-white hover:border-slate-300"
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)" }}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon size={20} strokeWidth={2} />
    </motion.button>
  );
}
