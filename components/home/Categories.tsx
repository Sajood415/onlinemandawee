"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type CategoryItem = {
  id: number;
  title: string;
  image: string;
  slug: string;
  cardClassName: string;
  imageClassName?: string;
};

const categories: CategoryItem[] = [
  {
    id: 1,
    title: "Breakfast Items",
    image: "/categories/breakfastItems.webp",
    slug: "breakfast",
    cardClassName: "bg-linear-to-br from-[#ffd86b] via-[#ffe08a] to-[#fff2c9]",
    imageClassName: "scale-[1.18]",
  },
  {
    id: 2,
    title: "Edible Grocery",
    image: "/categories/edibleGrocery.webp",
    slug: "grocery",
    cardClassName: "bg-linear-to-br from-[#dca56d] via-[#e7bc8d] to-[#f6e0c8]",
    imageClassName: "scale-[1.06]",
  },
  {
    id: 3,
    title: "Snack Bar",
    image: "/categories/snackBar.webp",
    slug: "snacks",
    cardClassName: "bg-linear-to-br from-[#ffe09b] via-[#ffe9b9] to-[#fff6de]",
    imageClassName: "scale-[1.08]",
  },
  {
    id: 4,
    title: "Beverages",
    image: "/categories/beverages.webp",
    slug: "beverages",
    cardClassName: "bg-linear-to-br from-[#ffb276] via-[#ffc18f] to-[#ffe2c2]",
    imageClassName: "scale-[1.03]",
  },
  {
    id: 5,
    title: "Fruits",
    image: "/categories/fruits.webp",
    slug: "fruits",
    cardClassName: "bg-linear-to-br from-[#ffb300] via-[#ffc227] to-[#ffe39b]",
    imageClassName: "scale-[1.16]",
  },
  {
    id: 6,
    title: "Vegetables",
    image: "/categories/vegetables.webp",
    slug: "vegetables",
    cardClassName: "bg-linear-to-br from-[#efe34a] via-[#f7ef7d] to-[#fff7be]",
    imageClassName: "scale-[1.12]",
  },
  {
    id: 7,
    title: "Dairy Products",
    image: "/categories/dairyProducts.webp",
    slug: "dairy",
    cardClassName: "bg-linear-to-br from-[#fafafa] via-[#f0f0f0] to-[#d8d8d8]",
    imageClassName: "scale-[1.12]",
  },
  {
    id: 8,
    title: "Cleaning Products",
    image: "/categories/cleaningProducts.webp",
    slug: "cleaning-products",
    cardClassName: "bg-linear-to-br from-[#b9d4e5] via-[#cee0ec] to-[#edf4f8]",
    imageClassName: "scale-[1.01]",
  },
  {
    id: 9,
    title: "Baby Care",
    image: "/categories/babyCare.webp",
    slug: "baby-care",
    cardClassName: "bg-linear-to-br from-[#6fc0c0] via-[#8dd1d0] to-[#d7f1f0]",
    imageClassName: "scale-[1.01]",
  },
  {
    id: 10,
    title: "Personal Care",
    image: "/categories/personalCare.webp",
    slug: "personal-care",
    cardClassName: "bg-linear-to-br from-[#76e0df] via-[#9be9e7] to-[#dcfbfa]",
    imageClassName: "scale-[1.01]",
  },
  {
    id: 11,
    title: "Whey Proteins",
    image: "/categories/wheyProteins.webp",
    slug: "whey-proteins",
    cardClassName: "bg-linear-to-br from-[#def5cf] via-[#e7f8dc] to-[#f6fdf0]",
    imageClassName: "scale-[1.03]",
  },
  {
    id: 12,
    title: "Stationery Items",
    image: "/categories/stationaryItems.webp",
    slug: "stationery-items",
    cardClassName: "bg-linear-to-br from-[#e4d7ff] via-[#efe7ff] to-[#faf7ff]",
    imageClassName: "scale-[1.12]",
  },
];

export default function Categories() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    });
  };

  return (
    <section
      className="py-16 sm:py-20"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          className="text-center text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Shop By Category
        </motion.h2>

        <div className="relative mt-10 sm:mt-12">
          {/* Gradient fade masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-linear-to-r from-white to-transparent hidden md:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-linear-to-l from-white to-transparent hidden md:block" />

          {/* Desktop Navigation arrows */}
          <div className="absolute left-0 top-22.5 z-30 hidden -translate-x-1/2 md:block lg:top-16 cursor-pointer">
            <ArrowButton
              direction="left"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
            />
          </div>
          <div className="absolute right-0 top-22.5 z-30 hidden translate-x-1/2 md:block lg:top-16 cursor-pointer">
            <ArrowButton
              direction="right"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
            />
          </div>

          {/* Mobile Navigation arrows - below the scroll area */}
          <div className="flex md:hidden items-center justify-center gap-4 mt-4">
            <ArrowButton
              direction="left"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
            />
            <span className="text-xs text-gray-400 font-medium">
              Swipe or tap to explore
            </span>
            <ArrowButton
              direction="right"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
            />
          </div>

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto px-4 pb-4 pt-2 scroll-smooth no-scrollbar sm:gap-8 md:px-4 lg:px-8"
          >
            {categories.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link
                  href={`/category/${item.slug}`}
                  className="group block min-w-30 shrink-0 text-center sm:min-w-35 lg:min-w-40"
                >
                  {/* Image container with hover border radius change */}
                  <motion.div
                    className="relative flex items-center justify-center overflow-hidden rounded-2xl  transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    style={{
                      width: "130px",
                      height: "130px",
                      margin: "0 auto",
                    }}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover p-2 transition-transform duration-300 group-hover:scale-110"
                    />
                  </motion.div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-900 sm:text-sm">
                    {item.title}
                  </p>
                </Link>
              </motion.div>
            ))}
            
            {/* Mobile swipe indicator */}
            <div className="md:hidden flex items-center shrink-0 ml-2 pr-4">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wider rotate-90 whitespace-nowrap">Swipe</span>
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
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Scroll ${direction}`}
      className={`flex h-10 w-10 cursor-pointer hover:bg-primary hover:text-white items-center justify-center rounded-full border transition-all ${
        disabled
          ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
          : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
      }`}
      style={{
        boxShadow: disabled
          ? "none"
          : "0 4px 20px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)",
      }}
      whileHover={disabled ? {} : { scale: 1.1, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      <Icon
        size={20}
        strokeWidth={2}
        className={disabled ? "opacity-40" : ""}
      />
    </motion.button>
  );
}
