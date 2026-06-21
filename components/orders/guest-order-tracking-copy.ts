import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getGuestOrderTrackingCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    trackOrder: en ? "Track Order" : ps ? "امر تعقیب کړئ" : "پیگیری سفارش",
    lookupTitle: en ? "Track your order" : ps ? "خپل امر تعقیب کړئ" : "سفارش خود را پیگیری کنید",
    lookupSubtitle: en
      ? "Use the secure link in your confirmation email, or enter your order details below."
      : ps
        ? "په تایید برېښنالیک کې خوندي لینک وکاروئ، یا دلته خپل امر معلومات ولیکئ."
        : "از لینک امن ایمیل تأیید استفاده کنید، یا جزئیات سفارش را اینجا وارد کنید.",
    orderNumber: en ? "Order number" : ps ? "د امر شمېره" : "شماره سفارش",
    email: en ? "Email address" : ps ? "برېښنالیک" : "ایمیل",
    findOrder: en ? "Find order" : ps ? "امر ومومئ" : "یافتن سفارش",
    searching: en ? "Looking up order..." : ps ? "امر لټول کېږي..." : "در حال جستجوی سفارش...",
    lookupHelp: en
      ? "Use the same email address you entered at checkout."
      : ps
        ? "هغه برېښنالیک وکاروئ چې په پیرود کې مو کارولی."
        : "همان ایمیلی را که در پرداخت وارد کردید استفاده کنید.",
    notFound: en
      ? "No order found with that order number and email."
      : ps
        ? "د دغه امر شمېرې او برېښنالیک سره امر ونه موندل شو."
        : "سفارشی با این شماره و ایمیل پیدا نشد.",
    placed: en ? "Placed" : ps ? "ثبت شوی" : "ثبت شده",
    orderTotal: en ? "Order total" : ps ? "ټول امر" : "مجموع سفارش",
    payment: en ? "Payment" : ps ? "تادیه" : "پرداخت",
    delivery: en ? "Delivery" : ps ? "تحویل" : "تحویل",
    customer: en ? "Customer" : ps ? "پیرودونکی" : "مشتری",
    contact: en ? "Contact" : ps ? "اړیکه" : "تماس",
    vendor: en ? "Vendor" : ps ? "پلورونکی" : "فروشنده",
    items: en ? "Items" : ps ? "توکي" : "اقلام",
    qty: en ? "Qty" : ps ? "شمېر" : "تعداد",
    subtotal: en ? "Subtotal" : ps ? "فرعي مجموعه" : "جمع جزء",
    discount: en ? "Discount" : ps ? "تخفیف" : "تخفیف",
    accountPrompt: en ? "Want to manage refunds or saved addresses?"
      : ps ? "بیرته ورکړه یا خوندي پتې غواړئ؟"
      : "بازپرداخت یا آدرس‌های ذخیره‌شده می‌خواهید؟",
    accountCta: en ? "Sign in or create account" : ps ? "ننوتل یا حساب جوړ کړئ" : "ورود یا ساخت حساب",
    loading: en ? "Loading order..." : ps ? "امر پورته کېږي..." : "در حال بارگذاری سفارش...",
    loadError: en ? "We could not load this order." : ps ? "دا امر پورته نشو." : "بارگذاری این سفارش ممکن نشد.",
    invalidLink: en ? "This tracking link is invalid or expired." : ps ? "دا تعقیب لینک ناسم دی." : "این لینک پیگیری نامعتبر است.",
    cardPaid: en ? "Paid by card" : ps ? "د کارت له لارې تادیه شوی" : "پرداخت با کارت",
    privacyNote: en
      ? "Contact details and street address are partially masked on this public tracking page."
      : ps
        ? "په دې عامه تعقیب پاڼه کې اړیکې او پته جزوي پټ شوي."
        : "اطلاعات تماس و آدرس خیابان در این صفحه عمومی بخشی پنهان شده‌اند.",
  };
}

export const GUEST_VENDOR_STATUS_LABELS: Record<string, Record<SupportedLocale, string>> = {
  NEW: { en: "New", ps: "نوی", "fa-AF": "جدید" },
  PREPARING: { en: "Preparing", ps: "چمتو کېږي", "fa-AF": "در حال آماده‌سازی" },
  INBOUND_SHIPPED: {
    en: "Inbound Shipped",
    ps: "ګودام ته لېږل شوی",
    "fa-AF": "به انبار ارسال شد",
  },
  RECEIVED_AT_WAREHOUSE: {
    en: "Received At Warehouse",
    ps: "په ګودام کې ترلاسه شو",
    "fa-AF": "در انبار دریافت شد",
  },
  SHIPPED: { en: "Shipped", ps: "لېږل شوی", "fa-AF": "ارسال شده" },
  DELIVERED: { en: "Delivered", ps: "تحویل شوی", "fa-AF": "تحویل شده" },
  CANCELLED: { en: "Cancelled", ps: "لغوه شوی", "fa-AF": "لغو شده" },
};
