"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  fetchActiveHomeBanners,
  type PublicHomeBanner,
} from "@/lib/home/fetch-home-banners";
import { HomeBannerContentOverlay } from "./HomeBannerContentOverlay";
import type { HeroSlide } from "./types";

const HERO_IMG_SIZES = "100vw";

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    image: "/banners/banner-1.webp",
    headline: "",
    sub: "",
    cta: "",
    href: "/products",
  },
  {
    image: "/banners/banner-2.webp",
    headline: "",
    sub: "",
    cta: "",
    href: "/deals",
  },
  {
    image: "/banners/banner-3.webp",
    headline: "",
    sub: "",
    cta: "",
    href: "/category/grocery",
  },
];

const sectionClass = "w-full min-w-0 bg-white";
const shellClass = "h-full w-full min-w-0";
const linkClass =
  "relative block h-[clamp(168px,24vw,380px)] w-full min-w-0 overflow-hidden bg-neutral-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#ec1b23]/40";

function mobileHeroSources(url: string): { src: string; srcSet: string } {
  const normalized = url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim();
  const base = normalized.replace(/[&?]width=\d+/, "").replace(/[?&]$/, "");
  const q = base.includes("?") ? "&" : "?";
  return {
    src: `${base}${q}width=750`,
    srcSet: `${base}${q}width=375 375w, ${base}${q}width=550 550w, ${base}${q}width=750 750w`,
  };
}

function bannerToSlide(banner: PublicHomeBanner): HeroSlide {
  return {
    image: banner.imageUrl,
    imageMobile: banner.imageMobileUrl ?? undefined,
    headline: banner.title,
    sub: banner.subtitle ?? "",
    cta: banner.ctaLabel ?? "Shop now",
    href: banner.href,
  };
}

function HeroSlideMedia({ slide, label }: { slide: HeroSlide; label: string }) {
  if (slide.imageMobile) {
    const m = mobileHeroSources(slide.imageMobile);
    return (
      <picture className="absolute inset-0 block h-full w-full">
        <source media="(min-width: 640px)" srcSet={slide.image} />
        <img
          src={m.src}
          srcSet={m.srcSet}
          sizes={HERO_IMG_SIZES}
          alt={label}
          className="h-full w-full object-cover object-center"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    );
  }

  return (
    <Image
      src={slide.image}
      alt={label}
      fill
      className="object-cover object-center"
      sizes={HERO_IMG_SIZES}
      priority
      draggable={false}
    />
  );
}

export function HomeHeroCarousel() {
  const [dynamicBanners, setDynamicBanners] = useState<PublicHomeBanner[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    void fetchActiveHomeBanners()
      .then((banners) => setDynamicBanners(banners.filter((b) => b.placement === "HERO")))
      .catch(() => setDynamicBanners([]));
  }, []);

  const dynamicSlides = useMemo(
    () => (dynamicBanners ?? []).map(bannerToSlide),
    [dynamicBanners]
  );
  const slides =
    dynamicSlides.length > 0 ? dynamicSlides : DEFAULT_HERO_SLIDES;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[activeIndex] ?? slides[0];
  const label =
    [slide.headline, slide.sub].filter(Boolean).join(". ") || "Mandawee";

  return (
    <section className={sectionClass} aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="sr-only">
        {label}
      </h1>
      <div className={shellClass}>
        <div className="relative h-full">
          <Link href={slide.href} className={linkClass}>
            <HeroSlideMedia slide={slide} label={label} />
            <HomeBannerContentOverlay
              title={slide.headline}
              subtitle={slide.sub}
              ctaLabel={slide.cta}
              variant="hero"
            />
          </Link>

          {slides.length > 1 ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-3 pb-3 sm:px-5 sm:pb-4">
                <div className="pointer-events-auto flex items-center gap-1.5">
                  {slides.map((item, index) => (
                    <button
                      key={`${item.href}-${index}`}
                      type="button"
                      aria-label={`Go to slide ${index + 1}`}
                      aria-current={index === activeIndex ? "true" : undefined}
                      onClick={() => setActiveIndex(index)}
                      className={`rounded-full transition-all duration-300 ${
                        index === activeIndex
                          ? "h-1.5 w-5 bg-white shadow-sm"
                          : "h-1.5 w-1.5 bg-white/50 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>

                <div className="pointer-events-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
                    }
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-600 shadow-sm transition hover:bg-white"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-600 shadow-sm transition hover:bg-white"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
