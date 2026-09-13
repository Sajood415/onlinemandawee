import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getProductDetailCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    breadcrumb: en ? "Breadcrumb" : ps ? "لارښود" : "مسیر صفحه",
    products: en ? "Products" : ps ? "محصولات" : "محصولات",
    visitStore: en ? "Visit shop" : ps ? "پلورنځی وګورئ" : "مشاهده فروشگاه",
    reviews: en ? "reviews" : ps ? "بیاکتنې" : "نظرات",
    noReviews: en ? "No reviews" : ps ? "بیاکتنه نشته" : "بدون نظر",
    inStock: en ? "In stock" : ps ? "په ذخیره کې" : "موجود",
    soldOut: en ? "Sold out" : ps ? "پلورل شوی" : "ناموجود",
    lowStock: (n: number) =>
      en
        ? `Only ${n} left in stock`
        : ps
          ? `یوازې ${n} په ذخیره کې پاتې دي`
          : `فقط ${n} عدد باقی مانده`,
    stock: en ? "Stock" : ps ? "ذخیره" : "موجودی",
    shipsIn: en ? "Ships in" : ps ? "لېږل کېږي" : "ارسال در",
    shipsInValue: en ? "1–3 days" : ps ? "۱–۳ ورځې" : "۱–۳ روز",
    deliveryArea: en ? "Delivery area" : ps ? "د تحویل ساحه" : "محدوده تحویل",
    deliveryAreaValue: en ? "Nationwide" : ps ? "په ټول هیواد کې" : "سراسر کشور",
    shippedBy: en ? "Shipped by" : ps ? "لېږونکی" : "ارسال توسط",
    quantity: en ? "Quantity" : ps ? "مقدار" : "تعداد",
    variant: en ? "Option" : ps ? "ډول" : "گزینه",
    selectOption: en ? "Select an option" : ps ? "یو اختیار وټاکئ" : "یک گزینه انتخاب کنید",
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
    highlights: en ? "Highlights" : ps ? "ځانګړتیاوې" : "نکات برجسته",
    itemDetails: en ? "Item details" : ps ? "د توکي جزئیات" : "جزئیات کالا",
    deliveryReturns: en
      ? "Delivery and return policies"
      : ps
        ? "د تحویل او بیرته ورکولو تګلارې"
        : "سیاست‌های ارسال و بازگشت",
    returnsAccepted: en
      ? "Returns & exchanges accepted"
      : ps
        ? "بیرته راګرځول او تبادله منل کېږي"
        : "بازگشت و تعویض پذیرفته می‌شود",
    returnsPolicy: en
      ? "Free 7-day return on eligible items."
      : ps
        ? "د وړ توکو لپاره ۷ ورځنی وړیا بیرته راګرځول."
        : "بازگشت رایگان ۷ روزه برای کالاهای واجد شرایط.",
    estimatedDelivery: en
      ? "Order today for delivery in 1–3 days"
      : ps
        ? "نن امر وکړئ او په ۱–۳ ورځو کې تحویل ترلاسه کړئ"
        : "امروز سفارش دهید و ظرف ۱–۳ روز تحویل بگیرید",
    sentFrom: en ? "Sold by" : ps ? "پلورونکی" : "فروشنده",
    secureCheckout: en ? "Secure checkout" : ps ? "امنه تادیه" : "پرداخت امن",
    secureCheckoutDesc: en
      ? "Your payment is protected at checkout."
      : ps
        ? "ستاسو تادیه په چک آوټ کې خوندي ده."
        : "پرداخت شما در تسویه‌حساب محافظت می‌شود.",
    previousImage: en ? "Previous image" : ps ? "پخوانی انځور" : "تصویر قبلی",
    nextImage: en ? "Next image" : ps ? "بل انځور" : "تصویر بعدی",
    addToWishlist: en ? "Add to favorites" : ps ? "خوښو ته اضافه کړئ" : "افزودن به علاقه‌مندی‌ها",
    removeFromWishlist: en
      ? "Remove from favorites"
      : ps
        ? "له خوښو لرې کړئ"
        : "حذف از علاقه‌مندی‌ها",
    meetSeller: en ? "Meet your seller" : ps ? "خپل پلورونکی وپیژنئ" : "فروشنده را بشناسید",
    viewShop: en ? "View shop" : ps ? "پلورنځی وګورئ" : "مشاهده فروشگاه",
    ownedByMandawee: en ? "Official Mandawee shop" : ps ? "رسمي مانداوي پلورنځی" : "فروشگاه رسمی مانداوی",
    shopReviews: en
      ? "Reviews for this item"
      : ps
        ? "د دې توکي بیاکتنې"
        : "نظرات این کالا",
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
