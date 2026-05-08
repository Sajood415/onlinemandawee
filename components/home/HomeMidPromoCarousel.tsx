"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { MidPromoSlide } from "./types";

export function HomeMidPromoCarousel() {
  const t = useTranslations("Homepage.store");
  const slides = t.raw("midPromoSlides") as MidPromoSlide[];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const tmr = setInterval(() => setI((x) => (x + 1) % slides.length), 8000);
    return () => clearInterval(tmr);
  }, [slides.length]);

  const s = slides[i] ?? slides[0];

  return (
    <section className="relative w-full min-w-0 max-w-full overflow-hidden rounded-none bg-gradient-to-br from-[#c41e3a] via-[#DC3545] to-[#991b1b] shadow-none sm:rounded-2xl sm:shadow-xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex w-full min-w-0 flex-col items-stretch gap-4 px-4 py-8 text-balance sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-12">
        <div className="w-full min-w-0 sm:max-w-xl">
          <span className="mb-2 inline-block rotate-[-3deg] bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-[#DC3545] shadow-md">
            {s.ribbon}
          </span>
          <h2 className="text-xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-2xl md:text-3xl">
            {s.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-snug text-white/90 sm:text-base">
            {s.subtitle}
          </p>
          <Link
            href={s.href}
            className="mt-5 inline-flex rounded-full border-2 border-white bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#DC3545] transition hover:bg-white/90 sm:px-7"
          >
            {s.cta}
          </Link>
        </div>
        <div className="relative mx-auto mt-2 h-36 w-36 shrink-0 sm:mx-0 sm:mt-0 sm:h-48 sm:w-48">
          <div className="absolute inset-0 rounded-full border-4 border-white/50 bg-white/10 shadow-inner" />
          <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white p-2">
            <Image
              key={s.imageKey}
              src={s.imageSrc}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 144px, 200px"
            />
          </div>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 pb-4">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-2 bg-white/40"}`}
              aria-label={`promo-${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
