"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useMessages } from "next-intl";

import productCatalog from "@/data/product.json";
import { usePathname, useRouter } from "@/i18n/navigation";

type IconProps = {
  className?: string;
};

type IconKey =
  | "basket"
  | "gift"
  | "flower"
  | "cake"
  | "plate"
  | "sparkles"
  | "heartShield"
  | "device"
  | "rocket"
  | "deliveryTruck"
  | "storefront"
  | "lock"
  | "checkBadge"
  | "flash"
  | "refresh";

type Category = {
  title: string;
  description: string;
  iconKey: IconKey;
};

type Product = {
  id: string;
  name: string;
  price: string;
  vendor: string;
  image: string;
  badge: string;
};

type FeaturedProductSource = {
  id: string;
  price: string;
  vendor: string;
  image: string;
  name: { en: string; ps: string; "fa-AF": string };
  badge: { en: string; ps: string; "fa-AF": string };
};

function pickLocalized(
  field: FeaturedProductSource["name"],
  locale: string
): string {
  if (locale === "en" || locale === "ps" || locale === "fa-AF") {
    return field[locale];
  }
  return field.en;
}

function featuredProductsForLocale(locale: string): Product[] {
  const rows = productCatalog.featuredProducts as FeaturedProductSource[];
  return rows.map((row) => ({
    id: row.id,
    name: pickLocalized(row.name, locale),
    badge: pickLocalized(row.badge, locale),
    price: row.price,
    vendor: row.vendor,
    image: row.image,
  }));
}

type Vendor = {
  name: string;
  specialty: string;
  accent: string;
  metricLabel: string;
  metricValue: string;
};

type DeliveryOption = {
  title: string;
  description: string;
  eyebrow: string;
  iconKey: IconKey;
};

type TrustItem = {
  title: string;
  description: string;
  iconKey: IconKey;
};

type FooterColumn = {
  title: string;
  links: string[];
};

type LanguageOption = {
  code: string;
  label: string;
};

type HeroStat = {
  value: string;
  label: string;
};

type HomepageContent = {
  direction: "ltr" | "rtl";
  navbar: {
    searchPlaceholder: string;
    searchButton: string;
    languageLabel: string;
    currencyLabel: string;
    accountLabel: string;
    cartLabel: string;
    languages: LanguageOption[];
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    stats: HeroStat[];
    floatingTopEyebrow: string;
    floatingTopTitle: string;
    floatingBottomEyebrow: string;
    floatingBottomTitle: string;
  };
  categoriesSection: {
    eyebrow: string;
    title: string;
    description: string;
  };
  categories: Category[];
  featuredSection: {
    eyebrow: string;
    title: string;
    description: string;
    viewAll: string;
    addToCart: string;
  };
  vendorsSection: {
    eyebrow: string;
    title: string;
    description: string;
  };
  topVendors: Vendor[];
  deliverySection: {
    eyebrow: string;
    title: string;
    description: string;
  };
  deliveryOptions: DeliveryOption[];
  giftingBanner: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    addOnsTitle: string;
    addOnsDescription: string;
    collaborationTitle: string;
    collaborationDescription: string;
  };
  trustSection: {
    eyebrow: string;
    title: string;
    description: string;
  };
  trustItems: TrustItem[];
  footer: {
    tagline: string;
    description: string;
    columns: FooterColumn[];
    copyright: string;
  };
};

const iconMap: Record<IconKey, (props: IconProps) => React.JSX.Element> = {
  basket: BasketIcon,
  gift: GiftIcon,
  flower: FlowerIcon,
  cake: CakeIcon,
  plate: PlateIcon,
  sparkles: SparklesIcon,
  heartShield: HeartShieldIcon,
  device: DeviceIcon,
  rocket: RocketIcon,
  deliveryTruck: DeliveryTruckIcon,
  storefront: StorefrontIcon,
  lock: LockIcon,
  checkBadge: CheckBadgeIcon,
  flash: FlashIcon,
  refresh: RefreshIcon,
};

export function Homepage() {
  const locale = useLocale();
  const messages = useMessages() as { Homepage: HomepageContent };
  const content = messages.Homepage;
  const featuredProducts = featuredProductsForLocale(locale);

  return (
    <div dir={content.direction} className="min-h-screen bg-white text-slate-900">
      <Navbar locale={locale} navbar={content.navbar} />

      <main>
        <HeroSection hero={content.hero} />

        <SectionShell className="py-16 sm:py-20">
          <SectionHeading
            eyebrow={content.categoriesSection.eyebrow}
            title={content.categoriesSection.title}
            description={content.categoriesSection.description}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {content.categories.map((category) => (
              <CategoryCard key={category.title} category={category} />
            ))}
          </div>
        </SectionShell>

        <SectionShell className="py-16 sm:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow={content.featuredSection.eyebrow}
              title={content.featuredSection.title}
              description={content.featuredSection.description}
            />
            <button className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:border-[#C1121F] hover:text-[#C1121F]">
              {content.featuredSection.viewAll}
            </button>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToCartLabel={content.featuredSection.addToCart}
              />
            ))}
          </div>
        </SectionShell>

        <SectionShell className="py-16 sm:py-20">
          <SectionHeading
            eyebrow={content.vendorsSection.eyebrow}
            title={content.vendorsSection.title}
            description={content.vendorsSection.description}
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {content.topVendors.map((vendor) => (
              <VendorCard key={vendor.name} vendor={vendor} />
            ))}
          </div>
        </SectionShell>

        <section className="bg-slate-50 py-16 sm:py-20">
          <SectionShell>
            <SectionHeading
              eyebrow={content.deliverySection.eyebrow}
              title={content.deliverySection.title}
              description={content.deliverySection.description}
            />

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {content.deliveryOptions.map((option) => (
                <InfoCard
                  key={option.title}
                  eyebrow={option.eyebrow}
                  title={option.title}
                  description={option.description}
                  iconKey={option.iconKey}
                />
              ))}
            </div>
          </SectionShell>
        </section>

        <SectionShell className="py-16 sm:py-20">
          <div className="overflow-hidden rounded-[28px] bg-linear-to-r from-[#1F2937] via-[#2A3441] to-[#C1121F] p-8 text-white shadow-[0_24px_80px_rgba(31,41,55,0.14)] sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div className="max-w-2xl">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/80">
                  {content.giftingBanner.eyebrow}
                </span>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {content.giftingBanner.title}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
                  {content.giftingBanner.description}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                    {content.giftingBanner.primaryCta}
                  </button>
                  <button className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10">
                    {content.giftingBanner.secondaryCta}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-white/70">{content.giftingBanner.addOnsTitle}</p>
                  <p className="mt-2 text-lg font-semibold">{content.giftingBanner.addOnsDescription}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-white/70">{content.giftingBanner.collaborationTitle}</p>
                  <p className="mt-2 text-lg font-semibold">{content.giftingBanner.collaborationDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionShell>

        <section className="bg-linear-to-b from-white to-slate-50 py-16 sm:py-20">
          <SectionShell>
            <SectionHeading
              eyebrow={content.trustSection.eyebrow}
              title={content.trustSection.title}
              description={content.trustSection.description}
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {content.trustItems.map((item) => (
                <InfoCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  iconKey={item.iconKey}
                />
              ))}
            </div>
          </SectionShell>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <SectionShell className="py-14">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="/onlinemandawee-logo.png"
                  alt="Mandawee logo"
                  width={140}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-900">Mandawee</p>
                  <p className="text-sm text-slate-500">{content.footer.tagline}</p>
                </div>
              </div>

              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">
                {content.footer.description}
              </p>
            </div>

            {content.footer.columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-slate-900">{column.title}</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="transition hover:text-[#C1121F]">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
            {content.footer.copyright}
          </div>
        </SectionShell>
      </footer>
    </div>
  );
}

function Navbar({
  locale,
  navbar,
}: {
  locale: string;
  navbar: HomepageContent["navbar"];
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <SectionShell className="py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <a href="#" className="flex items-center">
            <Image
              src="/onlinemandawee-logo.png"
              alt="Mandawee logo"
              width={220}
              height={64}
              className="h-12 w-auto object-contain lg:h-14"
              priority
            />
          </a>

          <div className="flex-1">
            <div className="flex h-14 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <SearchIcon className="h-5 w-5 text-slate-400" />
              <input
                aria-label="Search products"
                placeholder={navbar.searchPlaceholder}
                className="h-full w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <button className="inline-flex h-10 items-center justify-center rounded-full bg-[#C1121F] px-5 text-sm font-semibold text-white transition hover:bg-[#a90f1a]">
                {navbar.searchButton}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSelector
              locale={locale}
              languages={navbar.languages}
              languageLabel={navbar.languageLabel}
            />
            <Selector label={navbar.currencyLabel} />
            <IconButton ariaLabel={navbar.accountLabel}>
              <UserIcon className="h-5 w-5" />
            </IconButton>
            <IconButton ariaLabel={navbar.cartLabel} badge="2">
              <CartIcon className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
      </SectionShell>
    </header>
  );
}

function HeroSection({ hero }: { hero: HomepageContent["hero"] }) {
  return (
    <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(193,18,31,0.12),transparent_40%),linear-gradient(180deg,#fff_0%,#fff5f5_100%)]">
      <SectionShell className="py-10 sm:py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-[#C1121F]/10 bg-[#C1121F]/5 px-3 py-1 text-sm font-medium text-[#C1121F]">
              {hero.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              {hero.title}
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              {hero.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="inline-flex h-12 items-center justify-center rounded-full bg-[#C1121F] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(193,18,31,0.22)] transition hover:bg-[#a90f1a]">
                {hero.primaryCta}
              </button>
              <button className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                {hero.secondaryCta}
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {hero.stats.map((stat) => (
                <StatCard key={stat.label} value={stat.value} label={stat.label} />
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(193,18,31,0.2),transparent_45%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white p-3 shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
              <div
                aria-label="Family receiving gifts together"
                className="h-[420px] rounded-[28px] bg-cover bg-center sm:h-[520px]"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=80')",
                }}
              >
                <div className="h-full w-full bg-linear-to-t from-slate-900/10 via-transparent to-transparent" />
              </div>

              <div className="pointer-events-none absolute left-8 top-8 rounded-3xl bg-white/92 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  {hero.floatingTopEyebrow}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{hero.floatingTopTitle}</p>
              </div>

              <div className="pointer-events-none absolute bottom-8 right-8 rounded-3xl bg-slate-900 px-5 py-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.25)]">
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">{hero.floatingBottomEyebrow}</p>
                <p className="mt-2 text-xl font-semibold">{hero.floatingBottomTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>
    </section>
  );
}

function SectionShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C1121F]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-slate-600">{description}</p>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const Icon = iconMap[category.iconKey];

  return (
    <article className="group rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C1121F]/8 text-[#C1121F]">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-900">{category.title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{category.description}</p>
    </article>
  );
}

function ProductCard({
  product,
  addToCartLabel,
}: {
  product: Product;
  addToCartLabel: string;
}) {
  return (
    <article className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
      <div className="overflow-hidden">
        <div
          aria-label={product.name}
          className="h-64 w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url('${product.image}')` }}
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">
            {product.name}
          </h3>
          <span className="shrink-0 text-lg font-bold text-[#C1121F]">{product.price}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-flex rounded-full bg-[#C1121F]/8 px-3 py-1 font-medium text-[#C1121F]">
            {product.badge}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{product.vendor}</p>
        <button className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-[#C1121F]">
          {addToCartLabel}
        </button>
      </div>
    </article>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const initials = vendor.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className={`rounded-[24px] border border-slate-200 bg-linear-to-br ${vendor.accent} p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
          {initials}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{vendor.name}</h3>
          <p className="text-sm text-slate-600">{vendor.specialty}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">{vendor.metricLabel}</span>
        <span className="text-sm font-semibold text-slate-900">{vendor.metricValue}</span>
      </div>
    </article>
  );
}

function InfoCard({
  eyebrow,
  title,
  description,
  iconKey,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  iconKey: IconKey;
}) {
  const Icon = iconMap[iconKey];

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C1121F]/8 text-[#C1121F]">
        <Icon className="h-7 w-7" />
      </div>
      {eyebrow ? (
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#C1121F]">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-3 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </article>
  );
}

function Selector({ label }: { label: string }) {
  return (
    <button className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
      {label}
      <ChevronDownIcon className="h-4 w-4 text-slate-400" />
    </button>
  );
}

function LanguageSelector({
  locale,
  languages,
  languageLabel,
}: {
  locale: string;
  languages: LanguageOption[];
  languageLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const current = languages.find((l) => l.code === locale) ?? languages[0];

  useEffect(() => {
    function onPointerDown(ev: MouseEvent) {
      if (!wrapRef.current?.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={languageLabel}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 min-w-[7.5rem] items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
      >
        <span className="truncate">{current.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={languageLabel}
          className="absolute end-0 z-50 mt-2 min-w-[11rem] rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
        >
          {languages.map((language) => {
            const selected = language.code === locale;
            return (
              <li key={language.code} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center px-4 py-2.5 text-start text-sm font-medium transition hover:bg-slate-50 ${
                    selected ? "text-[#C1121F]" : "text-slate-700"
                  }`}
                  onClick={() => {
                    setOpen(false);
                    router.replace(pathname, {
                      locale: language.code as "en" | "ps" | "fa-AF",
                    });
                  }}
                >
                  {language.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function IconButton({
  children,
  badge,
  ariaLabel,
}: {
  children: React.ReactNode;
  badge?: string;
  ariaLabel: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-[#C1121F]"
    >
      {children}
      {badge ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C1121F] px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <p className="text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function BasketIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 10h14l-1.2 8.4a2 2 0 0 1-2 1.6H8.2a2 2 0 0 1-2-1.6L5 10Z" />
      <path d="m9 10 3-5 3 5" />
    </svg>
  );
}

function GiftIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 9h16v11H4z" />
      <path d="M12 9v11M4 13h16M7.5 9C6.1 9 5 7.9 5 6.5S6.1 4 7.5 4C10 4 12 9 12 9s2-5 4.5-5C17.9 4 19 5.1 19 6.5S17.9 9 16.5 9" />
    </svg>
  );
}

function FlowerIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 21V9" />
      <path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      <path d="M12 9c0-3-2-5-5-5 0 3 2 5 5 5Z" />
      <path d="M12 9c-3 0-5 2-5 5 3 0 5-2 5-5Z" />
      <path d="M12 9c3 0 5 2 5 5-3 0-5-2-5-5Z" />
    </svg>
  );
}

function CakeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 10h12v9H6z" />
      <path d="M4 19h16" />
      <path d="M8 10V7M12 10V5M16 10V7" />
    </svg>
  );
}

function PlateIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SparklesIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="m5 15 .8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15Z" />
      <path d="m19 13 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z" />
    </svg>
  );
}

function HeartShieldIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 21s7-3.5 7-10V5l-7-2-7 2v6c0 6.5 7 10 7 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DeviceIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="5" y="4" width="14" height="16" rx="2.5" />
      <path d="M10 17h4" />
    </svg>
  );
}

function RocketIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M14 4c4 0 6 4 6 6-2 0-6 2-8 6l-4-4c4-2 6-6 6-8Z" />
      <path d="M8 16 5 19M10 18l-3 3" />
    </svg>
  );
}

function DeliveryTruckIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 7h11v9H3zM14 10h3l4 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function StorefrontIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 10h16M6 10v9h12v-9M4 10l2-5h12l2 5" />
    </svg>
  );
}

function LockIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V8a4 4 0 1 1 8 0v2" />
    </svg>
  );
}

function CheckBadgeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m9 12 2 2 4-4" />
      <path d="m12 3 2.3 2.1 3.1-.3.9 3 2.7 1.7-1.3 2.8 1.3 2.8-2.7 1.7-.9 3-3.1-.3L12 21l-2.3-2.1-3.1.3-.9-3-2.7-1.7 1.3-2.8-1.3-2.8 2.7-1.7.9-3 3.1.3L12 3Z" />
    </svg>
  );
}

function FlashIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M20 6v6h-6" />
      <path d="M20 12a8 8 0 1 1-2.3-5.7L20 8" />
    </svg>
  );
}

function SearchIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function UserIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function CartIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 5h2l2.2 9.2a1 1 0 0 0 1 .8h7.9a1 1 0 0 0 1-.8L20 8H8" />
      <circle cx="10" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
