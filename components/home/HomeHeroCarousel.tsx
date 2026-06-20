"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  fetchActiveHomeBanners,
  type PublicHomeBanner,
} from "@/lib/home/fetch-home-banners";
import { HomeBannerContentOverlay } from "./HomeBannerContentOverlay";
import type { HeroSlide } from "./types";

const HERO_IMG_SIZES =
  "(max-width: 639px) 100vw, (max-width: 1023px) calc(100vw - 32px), 100vw";

const sectionClass = "w-full min-w-0 bg-white lg:bg-[#004795]";
const shellClass = "w-full min-w-0 px-0 sm:px-4 lg:px-0";
const linkClass =
  "relative block w-full min-w-0 overflow-hidden rounded-none bg-[#004795] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-white sm:rounded-2xl sm:shadow-[0_2px_12px_rgba(15,52,96,0.12)] lg:rounded-none lg:shadow-none";

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
      <div className="relative aspect-[100/66] w-full sm:aspect-[2048/820]">
        <picture className="absolute inset-0">
          <source media="(min-width: 640px)" srcSet={slide.image} />
          <img
            src={m.src}
            srcSet={m.srcSet}
            sizes={HERO_IMG_SIZES}
            alt={label}
            className="absolute inset-0 h-full w-full object-contain object-center"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>
    );
  }

  return (
    <div className="relative aspect-[2048/820] w-full">
      <Image
        src={slide.image}
        alt={label}
        fill
        className="object-contain object-center"
        sizes={HERO_IMG_SIZES}
        priority
        draggable={false}
      />
    </div>
  );
}

export function HomeHeroCarousel() {
  const t = useTranslations("Homepage.store");
  const [dynamicBanners, setDynamicBanners] = useState<PublicHomeBanner[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    void fetchActiveHomeBanners()
      .then((banners) => setDynamicBanners(banners.filter((b) => b.placement === "HERO")))
      .catch(() => setDynamicBanners([]));
  }, []);

  const fallbackSlides = (t.raw("heroSlides") as HeroSlide[]) ?? [];
  const dynamicSlides = useMemo(
    () => (dynamicBanners ?? []).map(bannerToSlide),
    [dynamicBanners]
  );
  const slides = dynamicSlides.length > 0 ? dynamicSlides : fallbackSlides;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (dynamicBanners === null && fallbackSlides.length === 0) return null;
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
        <div className="relative">
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
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
                }
                className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow sm:left-4"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
                className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow sm:right-4"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {slides.map((item, index) => (
                  <button
                    key={`${item.href}-${index}`}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 w-2 rounded-full transition ${
                      index === activeIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
