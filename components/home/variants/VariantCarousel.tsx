"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Variant = "v1" | "v2" | "v3";

type Props = {
  variant: Variant;
};

const heroImages = {
  v1: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=1200&q=80",
  v2: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&q=80",
  v3: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1200&q=80",
} as const;

export function VariantCarousel({ variant }: Props) {
  const t = useTranslations("Homepage.HomeVariants");
  const title = t(`${variant}.heroTitle`);
  const cta = t(`${variant}.heroCta`);

  if (variant === "v1") {
    return (
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pt-6 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div className="relative col-span-2 h-64 overflow-hidden rounded-2xl sm:h-80">
          <Image src={heroImages.v1} alt={title} fill className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(220,53,69,0.82),rgba(0,0,0,0.35))] p-6 text-white sm:p-8">
            <h1 className="max-w-lg text-2xl font-bold sm:text-4xl">{title}</h1>
            <Link href="/products" className="mt-5 inline-flex rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold">
              {cta}
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--secondary)]">{t("common.vendorSpotlight")}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("common.vendorName")}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--primary)]">{t("common.fastDelivery")}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("common.sameDayZones")}</p>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "v2") {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative h-72 overflow-hidden rounded-3xl sm:h-96">
          <Image src={heroImages.v2} alt={title} fill className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-r from-[var(--secondary)]/85 to-black/25 p-6 text-white sm:p-10">
            <h1 className="max-w-xl text-3xl font-bold sm:text-5xl">{title}</h1>
            <Link href="/products" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--secondary)]">
              {cta}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative h-72 overflow-hidden rounded-2xl lg:col-span-2">
          <Image src={heroImages.v3} alt={title} fill className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.72),rgba(224,178,82,0.28))] p-6 text-white sm:p-8">
            <h1 className="max-w-lg text-3xl font-bold sm:text-4xl">{title}</h1>
            <Link href="/products" className="mt-6 inline-flex rounded-full bg-[var(--yellow)] px-6 py-3 text-sm font-semibold text-black">
              {cta}
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase text-[var(--primary)]">{t("common.flashSale")}</p>
            <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{t("common.flashSaleDesc")}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase text-[var(--secondary)]">{t("common.becomeVendor")}</p>
            <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{t("common.startSelling")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
