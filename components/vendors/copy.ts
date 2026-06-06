import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getVendorsCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    title: en ? "Browse Vendors" : ps ? "پلورونکي وګورئ" : "مرور فروشندگان",
    subtitle: en
      ? "Discover trusted stores by industry — bakery, clothing, electronics, florists, and more."
      : ps
        ? "د صنعت له مخې باوري پلورنځي ومومئ — بیکري، جامې، بریښنایی توکي، ګلان او نور."
        : "فروشگاه‌های معتبر را بر اساس صنعت کشف کنید — نانوایی، پوشاک، الکترونیک، گل‌فروشی و بیشتر.",
    allIndustries: en ? "All industries" : ps ? "ټول صنعتونه" : "همه صنایع",
    featuredIndustries: en ? "Popular industries" : ps ? "مشهور صنعتونه" : "صنایع پرطرفدار",
    moreIndustries: en ? "More industries" : ps ? "نور صنعتونه" : "صنایع بیشتر",
    results: en ? "vendors" : ps ? "پلورونکي" : "فروشنده",
    noVendors: en ? "No vendors found" : ps ? "هیڅ پلورونکی ونه موندل شو" : "فروشنده‌ای یافت نشد",
    noVendorsHint: en
      ? "Try another industry or check back as new stores join the marketplace."
      : ps
        ? "بل صنعت وکارېږئ یا وروسته بیا راشئ."
        : "صنعت دیگری را امتحان کنید یا بعداً دوباره سر بزنید.",
    viewStore: en ? "Visit store" : ps ? "پلورنځی وګورئ" : "مشاهده فروشگاه",
    products: en ? "products" : ps ? "محصولات" : "محصول",
    product: en ? "product" : ps ? "محصول" : "محصول",
    clearFilter: en ? "Show all vendors" : ps ? "ټول پلورونکي وښایئ" : "نمایش همه فروشندگان",
    loading: en ? "Loading vendors..." : ps ? "پلورونکي پورته کېږي..." : "در حال بارگذاری فروشندگان...",
  };
}
