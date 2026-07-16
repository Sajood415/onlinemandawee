import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getProductDetailCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    products: en ? "Products" : ps ? "محصولات" : "محصولات",
    visitStore: en ? "Visit the store" : ps ? "پلورنځی وګورئ" : "مشاهده فروشگاه",
    reviews: en ? "reviews" : ps ? "بیاکتنې" : "نظرات",
    beFirstReview: en
      ? "Be the first to review this product"
      : ps
        ? "لومړی بیاکتنه وکړئ"
        : "اولین نفر باشید که نظر می‌دهد",
    inStock: en ? "In stock" : ps ? "په ذخیره کې" : "موجود",
    soldOut: en ? "Sold out" : ps ? "پلورل شوی" : "ناموجود",
    stock: en ? "Stock" : ps ? "ذخیره" : "موجودی",
    shipsIn: en ? "Ships in" : ps ? "لېږل کېږي" : "ارسال در",
    shipsInValue: en ? "1–3 days" : ps ? "۱–۳ ورځې" : "۱–۳ روز",
    deliveryArea: en ? "Delivery area" : ps ? "د تحویل ساحه" : "محدوده تحویل",
    deliveryAreaValue: en ? "Nationwide" : ps ? "په ټول هیواد کې" : "سراسر کشور",
    shippedBy: en ? "Shipped by" : ps ? "لېږونکی" : "ارسال توسط",
    quantity: en ? "Quantity" : ps ? "مقدار" : "تعداد",
    variant: en ? "Variant" : ps ? "ډول" : "گونه",
    options: en ? "Options" : ps ? "انتخابونه" : "گزینه‌ها",
    addToCart: en ? "Add to cart" : ps ? "کارټ ته اضافه کړئ" : "افزودن به سبد",
    adding: en ? "Adding…" : ps ? "اضافه کېږي…" : "در حال افزودن…",
    addedToast: (qty: number) =>
      en
        ? `Added ${qty} item(s) to cart`
        : ps
          ? `کارټ ته ${qty} توکي اضافه شول`
          : `${qty} مورد به سبد اضافه شد`,
    addError: en
      ? "Failed to add to cart"
      : ps
        ? "کارټ ته اضافه کول ناکام شول"
        : "افزودن به سبد ناموفق بود",
    lineTotal: (qty: number, total: string) =>
      en ? `${qty} items: ${total}` : ps ? `${qty} توکي: ${total}` : `${qty} مورد: ${total}`,
    availableOffers: en ? "Available offers" : ps ? "وړاندیزونه" : "پیشنهادها",
    offerHint: en
      ? "Use this code at checkout for this product."
      : ps
        ? "د دې توکي لپاره په چک آوټ کې دا کوډ وکاروئ."
        : "این کد را در تسویه‌حساب برای این محصول وارد کنید.",
    soldOutLabel: en ? "Sold out" : ps ? "پلورل شوی" : "تمام شده",
    description: en ? "Description" : ps ? "توضیحات" : "توضیحات",
    reviewsTab: en ? "Reviews" : ps ? "بیاکتنې" : "نظرات",
    highlights: en ? "Product highlights" : ps ? "د محصول ځانګړتیاوې" : "نکات برجسته محصول",
    trustShipping: en ? "Fast shipping" : ps ? "چټک لېږد" : "ارسال سریع",
    trustShippingDesc: en ? "Shipped in 1–3 days" : ps ? "په ۱–۳ ورځو کې لېږل" : "ارسال در ۱–۳ روز",
    trustReturns: en ? "Easy returns" : ps ? "اسانه بیرته" : "بازگشت آسان",
    trustReturnsDesc: en ? "Free 7-day return" : ps ? "۷ ورځنی وړیا بیرته" : "بازگشت رایگان ۷ روزه",
    trustPayment: en ? "Secure payment" : ps ? "امنه تادیه" : "پرداخت امن",
    trustPaymentDesc: en
      ? "Card checkout protected"
      : ps
        ? "د کارت تادیه خوندي"
        : "پرداخت کارتی محافظت‌شده",
    trustSupport: en ? "Customer support" : ps ? "د پیرودونکي ملاتړ" : "پشتیبانی مشتری",
    notFound: en ? "Product not found" : ps ? "محصول ونه موندل شو" : "محصول یافت نشد",
    backToProducts: en
      ? "Back to products"
      : ps
        ? "بیرته محصولاتو ته"
        : "بازگشت به محصولات",
  };
}
