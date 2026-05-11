"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { HeroSlide } from "./types";

export function HomeHeroCarousel() {
  const t = useTranslations("Homepage.store");
  const slide = (t.raw("heroSlides") as HeroSlide[])[0];
  const label = slide
    ? [slide.headline, slide.sub].filter(Boolean).join(". ")
    : "Mandawee";

  if (!slide) {
    return null;
  }

  return (
    <section className="w-full min-w-0 bg-[#004795]" aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="sr-only">
        {label}
      </h1>
      <Link
        href={slide.href}
        className="block w-full min-w-0 overflow-hidden bg-[#004795] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-white"
      >
        <Image
          src={slide.image}
          alt={label}
          width={2048}
          height={820}
          className="h-auto w-full object-contain object-top"
          sizes="100vw"
          priority
          draggable={false}
        />
        <span className="sr-only">
          {slide.cta} — {slide.headline}
        </span>
      </Link>
    </section>
  );
}
