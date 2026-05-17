"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { HeroSlide } from "./types";

const HERO_IMG_SIZES =
  "(max-width: 639px) 100vw, (max-width: 1023px) calc(100vw - 32px), 100vw";

const sectionClass =
  "w-full min-w-0 bg-white lg:bg-[#004795]";

const shellClass =
  "w-full min-w-0 px-0 pt-2 sm:px-4 sm:pt-3 lg:px-0 lg:pt-0";

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
  const slide = (t.raw("heroSlides") as HeroSlide[])[0];
  if (!slide) return null;

  const label =
    [slide.headline, slide.sub].filter(Boolean).join(". ") || "Mandawee";

  return (
    <section className={sectionClass} aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="sr-only">
        {label}
      </h1>
      <div className={shellClass}>
        <Link href={slide.href} className={linkClass}>
          <HeroSlideMedia slide={slide} label={label} />
          <span className="sr-only">
            {slide.cta} — {slide.headline}
          </span>
        </Link>
      </div>
    </section>
  );
}
