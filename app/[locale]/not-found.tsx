"use client";

import { AlertTriangle, Baby, Home, PackageSearch, Tag } from "lucide-react";
import { useLocale } from "next-intl";

import { Link } from "@/i18n/navigation";

type SupportedLocale = "en" | "ps" | "fa-AF";

const copy: Record<
  SupportedLocale,
  {
    badge: string;
    title: string;
    description: string;
    home: string;
    products: string;
    deals: string;
    babyPackages: string;
  }
> = {
  en: {
    badge: "Page Not Found",
    title: "We could not find this page",
    description:
      "The link may be outdated or the page has moved. Continue shopping from one of the main marketplace sections.",
    home: "Home",
    products: "Products",
    deals: "Deals",
    babyPackages: "Baby Packages",
  },
  ps: {
    badge: "پاڼه ونه موندل شوه",
    title: "دا پاڼه ونه موندل شوه",
    description:
      "کېدای شي لینک زوړ شوی وي يا پاڼه بل ځای ته لېږدول شوې وي. له لاندې اصلي برخو څخه پېرود ته دوام ورکړئ.",
    home: "کور",
    products: "محصولات",
    deals: "تخفیفونه",
    babyPackages: "د ماشوم کڅوړې",
  },
  "fa-AF": {
    badge: "صفحه پیدا نشد",
    title: "این صفحه پیدا نشد",
    description:
      "ممکن است لینک قدیمی شده باشد یا صفحه منتقل شده باشد. خرید خود را از یکی از بخش های اصلی بازار ادامه دهید.",
    home: "خانه",
    products: "محصولات",
    deals: "تخفیف ها",
    babyPackages: "بسته های نوزاد",
  },
};

export default function LocalizedNotFoundPage() {
  const locale = useLocale();
  const safeLocale: SupportedLocale = locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const t = copy[safeLocale];

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-[70vh] bg-[#f6f8fc] px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#0f3460]/10 bg-white shadow-[0_20px_60px_rgba(15,52,96,0.08)]">
        <div className="bg-linear-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] px-6 py-10 text-white sm:px-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <AlertTriangle className="h-4 w-4" />
            {t.badge}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/90 sm:text-base">{t.description}</p>
        </div>

        <div className="px-6 py-8 sm:px-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2847]"
            >
              <Home className="h-4 w-4" />
              {t.home}
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0f3460]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0f3460] transition hover:bg-[#0f3460]/5"
            >
              <PackageSearch className="h-4 w-4" />
              {t.products}
            </Link>
            <Link
              href="/deals"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0f3460]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0f3460] transition hover:bg-[#0f3460]/5"
            >
              <Tag className="h-4 w-4" />
              {t.deals}
            </Link>
            <Link
              href="/baby-packages"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0f3460]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0f3460] transition hover:bg-[#0f3460]/5"
            >
              <Baby className="h-4 w-4" />
              {t.babyPackages}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
