import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getProductsCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    allProducts: en ? "All Products" : ps ? "ټول محصولات" : "همه محصولات",
    shopSubtitle: en
      ? "Curated essentials from trusted local vendors"
      : ps
        ? "د با باور پلورونکو څخه غوره توکي"
        : "انتخاب‌های برتر از فروشندگان معتبر",
    results: en ? "results" : ps ? "پایلې" : "نتایج",
    withFilters: en
      ? "with filters applied"
      : ps
        ? "د فلټرونو سره"
        : "با فیلترهای اعمال شده",
    searchPlaceholder: en
      ? "Search products, brands, categories..."
      : ps
        ? "محصولات، برانډونه، کټګورۍ..."
        : "جستجوی محصولات، برندها، دسته‌ها...",
    searchResults: en ? "Search Results" : ps ? "د لټون پایلې" : "نتایج جستجو",
    searchResultsFor: (query: string) =>
      en
        ? `Showing products matching "${query}" across all vendor listings`
        : ps
          ? `د "${query}" سره سم محصولات له ټولو پلورونکو څخه`
          : `نمایش محصولات مطابق «${query}» از همه فروشندگان`,
    noSearchResults: en ? "No matching products" : ps ? "هیڅ محصول ونه موندل شو" : "محصولی یافت نشد",
    noSearchResultsHint: en
      ? "Try a different keyword or browse all products."
      : ps
        ? "بل کلمه وکارېږئ یا ټول محصولات وګورئ."
        : "کلمه دیگری امتحان کنید یا همه محصولات را ببینید.",
    filter: en ? "Filters" : ps ? "فلټرونه" : "فیلترها",
    filterShort: en ? "Filter" : ps ? "فلټر" : "فیلتر",
    sortFeatured: en ? "Best match" : ps ? "غوره تطابق" : "بهترین تطابق",
    sortPriceLow: en ? "Price: Low to High" : ps ? "قیمت: کم به زیاد" : "قیمت: کم به زیاد",
    sortPriceHigh: en ? "Price: High to Low" : ps ? "قیمت: زیاد به کم" : "قیمت: زیاد به کم",
    sortRating: en ? "Top rated" : ps ? "ترټولو ښه" : "بالاترین امتیاز",
    noReviews: en ? "No reviews yet" : ps ? "تر اوسه بیاکتنه نشته" : "هنوز نظری ثبت نشده",
    clearAll: en ? "Clear all" : ps ? "ټول پاک کړئ" : "پاک کردن همه",
    category: en ? "Category" : ps ? "کټګوري" : "دسته",
    price: en ? "Price" : ps ? "قیمت" : "قیمت",
    brand: en ? "Brand" : ps ? "برانډ" : "برند",
    maxPrice: en ? "Up to" : ps ? "تر" : "تا",
    showProducts: en ? "Show" : ps ? "ښودل" : "نمایش",
    products: en ? "products" : ps ? "محصولات" : "محصول",
    noProducts: en ? "No products found" : ps ? "هیڅ محصول ونه موندل شو" : "محصولی یافت نشد",
    noProductsHint: en
      ? "Try adjusting your search or filters to discover more items."
      : ps
        ? "د نورو توکو لپاره لټون یا فلټرونه بدل کړئ."
        : "برای یافتن موارد بیشتر، جستجو یا فیلترها را تغییر دهید.",
    clearFilters: en
      ? "Clear all filters"
      : ps
        ? "ټول فلټرونه پاک کړئ"
        : "پاک کردن همه فیلترها",
    quantity: en ? "Quantity" : ps ? "مقدار" : "تعداد",
    addToCart: en ? "Add to cart" : ps ? "کارټ ته اضافه کړئ" : "افزودن به سبد",
    chooseOptions: en ? "Choose options" : ps ? "انتخابونه وټاکئ" : "انتخاب گزینه‌ها",
    addedToCart: en ? "Added to cart!" : ps ? "کارټ ته اضافه شو!" : "به سبد اضافه شد!",
    addToCartFailed: en
      ? "Failed to add to cart"
      : ps
        ? "کارټ ته اضافه کول ناکام شول"
        : "افزودن به سبد ناموفق بود",
    was: en ? "Was" : ps ? "و" : "بود",
    loadingProducts: en
      ? "Loading products..."
      : ps
        ? "محصولات پورته کېږي..."
        : "در حال بارگذاری محصولات...",
    relatedTitle: en ? "You may also like" : ps ? "تاسو ته به دا هم خوښ شي" : "شاید این‌ها را هم بپسندید",
    relatedSubtitle: (category: string) =>
      en
        ? `More items from ${category}`
        : ps
          ? `نور توکي له ${category} څخه`
          : `موارد بیشتر از ${category}`,
    viewCategory: en ? "View category" : ps ? "کټګوري وګورئ" : "مشاهده دسته",
  };
}
