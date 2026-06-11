import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getGiftsCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    title: en ? "Gift Sets" : ps ? "د ډالۍ بستې" : "بسته‌های هدیه",
    subtitle: en
      ? "Thoughtful picks for every occasion — curated gift-ready products from trusted vendors."
      : ps
        ? "د هر مناسبت لپاره غوره انتخابونه — د باوري پلورونکو څخه د ډالۍ لپاره چمتو توکي."
        : "انتخاب‌های مناسب برای هر مناسبت — محصولات آماده هدیه از فروشندگان معتبر.",
    badge: en ? "Curated gifts" : ps ? "غوره ډالۍ" : "هدایای منتخب",
    results: en ? "gift items" : ps ? "د ډالۍ توکي" : "قلم هدیه",
    noGifts: en ? "No gift items yet" : ps ? "تر اوسه د ډالۍ توکي نشته" : "هنوز قلم هدیه‌ای نیست",
    noGiftsHint: en
      ? "Browse all products or check back as vendors add more gift-ready items."
      : ps
        ? "ټول محصولات وګورئ یا وروسته بیا راشئ."
        : "همه محصولات را ببینید یا بعداً دوباره سر بزنید.",
    browseAll: en ? "Browse all products" : ps ? "ټول محصولات وګورئ" : "مشاهده همه محصولات",
    loading: en ? "Loading gift items..." : ps ? "د ډالۍ توکي پورته کېږي..." : "در حال بارگذاری هدایا...",
  };
}
