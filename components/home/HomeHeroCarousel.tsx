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
    cta: banner.ctaLabel ?? "",
    href: banner.href,
  };
}

function slideSrc(slide: HeroSlide, forMobile: boolean) {
  if (forMobile && slide.imageMobile) return slide.imageMobile;
  return slide.image;
}

/** Digikala-style: image fills the fixed aspect card (object-cover). */
function HeroSlideMedia({
  slide,
  label,
  forMobile,
}: {
  slide: HeroSlide;
  label: string;
  forMobile?: boolean;
}) {
  const src = slideSrc(slide, Boolean(forMobile));

  if (forMobile && slide.imageMobile) {
    const m = mobileHeroSources(slide.imageMobile);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={m.src}
        srcSet={m.srcSet}
        sizes={HERO_IMG_SIZES}
        alt={label}
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={label}
      fill
      className="object-cover object-center"
      sizes={HERO_IMG_SIZES}
      priority
      draggable={false}
    />
  );
}

function PeekThumb({ slide, label }: { slide: HeroSlide; label: string }) {
  const src = slide.imageMobile || slide.image;
  return (
    <Image
      src={src}
      alt={label}
      fill
      className="object-cover object-center"
      sizes="40px"
      draggable={false}
    />
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

  const dynamicSlides = useMemo(
    () => (dynamicBanners ?? []).map(bannerToSlide),
    [dynamicBanners]
  );
  const slides =
    dynamicBanners === null
      ? DEFAULT_HERO_SLIDES
      : dynamicSlides.length > 0
        ? dynamicSlides
        : DEFAULT_HERO_SLIDES;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[activeIndex] ?? slides[0];
  const prevSlide = slides[(activeIndex - 1 + slides.length) % slides.length] ?? slide;
  const nextSlide = slides[(activeIndex + 1) % slides.length] ?? slide;
  const label =
    [slide.headline, slide.sub].filter(Boolean).join(". ") || t("hero.slideFallbackLabel");

  const goPrev = () =>
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  const goNext = () => setActiveIndex((current) => (current + 1) % slides.length);

  return (
    <section className="w-full min-w-0 bg-white pt-2 sm:pt-0" aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="sr-only">
        {label}
      </h1>

      {/* ── Mobile: Digikala card (inset, rounded, ~2:1, side peeks) ── */}
      <div className="sm:hidden">
        <div className="flex items-stretch gap-1.5 px-2">
          {slides.length > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              className="relative w-2.5 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
              aria-label={t("hero.previousSlide")}
            >
              <PeekThumb slide={prevSlide} label={label} />
            </button>
          ) : null}

          <div className="relative min-w-0 flex-1">
            <Link
              href={slide.href}
              className="relative block aspect-[2/1] w-full overflow-hidden rounded-2xl bg-neutral-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#ec1b23]/40"
            >
              <HeroSlideMedia slide={slide} label={label} forMobile />
              <HomeBannerContentOverlay
                title={slide.headline}
                subtitle={slide.sub}
                variant="hero"
              />
            </Link>

            {slides.length > 1 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
                {slides.map((item, index) => (
                  <button
                    key={`${item.href}-${index}`}
                    type="button"
                    aria-label={t("hero.goToSlide", { number: index + 1 })}
                    aria-current={index === activeIndex ? "true" : undefined}
                    onClick={() => setActiveIndex(index)}
                    className={`pointer-events-auto rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? "h-1.5 w-4 bg-white shadow-sm"
                        : "h-1.5 w-1.5 bg-white/55"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {slides.length > 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="relative w-2.5 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
              aria-label={t("hero.nextSlide")}
            >
              <PeekThumb slide={nextSlide} label={label} />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Desktop / tablet: full-bleed frame ── */}
      <div className="relative hidden sm:block">
        <Link
          href={slide.href}
          className="relative block h-[clamp(200px,26vw,360px)] w-full min-w-0 overflow-hidden bg-neutral-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#ec1b23]/40 lg:h-[clamp(240px,24vw,400px)]"
        >
          <HeroSlideMedia slide={slide} label={label} />
          <HomeBannerContentOverlay
            title={slide.headline}
            subtitle={slide.sub}
            variant="hero"
          />
        </Link>

        {slides.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 pb-4">
            <div className="pointer-events-auto flex items-center gap-1.5">
              {slides.map((item, index) => (
                <button
                  key={`${item.href}-${index}`}
                  type="button"
                  aria-label={t("hero.goToSlide", { number: index + 1 })}
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
                onClick={goPrev}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-600 shadow-sm transition hover:bg-white"
                aria-label={t("hero.previousSlide")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-600 shadow-sm transition hover:bg-white"
                aria-label={t("hero.nextSlide")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
