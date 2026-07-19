import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getGuestOrderTrackingCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    breadcrumb: en ? "Breadcrumb" : ps ? "لارښود" : "مسیر صفحه",
    eyebrow: en ? "Order tracking" : ps ? "د امر تعقیب" : "پیگیری سفارش",
    heroImageAlt: en
      ? "Mandawee order tracking"
      : ps
        ? "د Mandawee امر تعقیب"
        : "پیگیری سفارش Mandawee",
    trackingNumber: en ? "Tracking number" : ps ? "د تعقیب شمېره" : "شماره پیگیری",
    trackingPending: en
      ? "Tracking number will appear here when your package ships."
      : ps
        ? "کله چې ستاسو بسته ولیږل شي دلته د تعقیب شمېره ښکاري."
        : "شماره پیگیری پس از ارسال بسته اینجا نشان داده می‌شود.",
    trackOrder: en ? "Track order" : ps ? "امر تعقیب کړئ" : "پیگیری سفارش",
    lookupTitle: en ? "Track your order" : ps ? "خپل امر تعقیب کړئ" : "سفارش خود را پیگیری کنید",
    lookupSubtitle: en
      ? "Enter your order number and the email used at checkout to see status and delivery progress."
      : ps
        ? "د امر شمېره او هغه برېښنالیک ولیکئ چې په پیرود کې مو کارولی ترڅو وضعیت او تحویل وګورئ."
        : "شماره سفارش و ایمیلی که هنگام پرداخت وارد کردید را بنویسید تا وضعیت و پیشرفت تحویل را ببینید.",
    formBadge: en ? "Secure lookup" : ps ? "خوندي لټون" : "جستجوی امن",
    formTitle: en ? "Find your order" : ps ? "خپل امر ومومئ" : "سفارش خود را پیدا کنید",
    formSubtitle: en
      ? "We’ll match your order number with the checkout email."
      : ps
        ? "موږ به ستاسو د امر شمېره د پیرود برېښنالیک سره سمون ورکړو."
        : "شماره سفارش را با ایمیل پرداخت مطابقت می‌دهیم.",
    required: en ? "Required" : ps ? "اړین" : "الزامی",
    sectionDetails: en ? "Order details" : ps ? "د امر جزئیات" : "جزئیات سفارش",
    orderNumber: en ? "Order number" : ps ? "د امر شمېره" : "شماره سفارش",
    orderNumberPlaceholder: "OM-XXXXXXXXXX",
    email: en ? "Email address" : ps ? "برېښنالیک" : "آدرس ایمیل",
    findOrder: en ? "Find order" : ps ? "امر ومومئ" : "یافتن سفارش",
    searching: en ? "Searching…" : ps ? "لټول کېږي…" : "در حال جستجو…",
    lookupHelp: en
      ? "Use the same email you entered at checkout."
      : ps
        ? "هغه برېښنالیک وکاروئ چې په پیرود کې مو کارولی."
        : "همان ایمیلی را که در پرداخت وارد کردید استفاده کنید.",
    helpCenter: en ? "Need help?" : ps ? "مرسته غواړئ؟" : "کمک لازم دارید؟",
    helpLink: en ? "Contact support" : ps ? "له ملاتړ سره اړیکه" : "تماس با پشتیبانی",
    notFound: en
      ? "No order found with that order number and email."
      : ps
        ? "د دغه امر شمېرې او برېښنالیک سره امر ونه موندل شو."
        : "سفارشی با این شماره و ایمیل پیدا نشد.",
    orderDetails: en ? "Order details" : ps ? "د امر جزئیات" : "جزئیات سفارش",
    placed: en ? "Placed" : ps ? "ثبت شوی" : "ثبت شده",
    status: en ? "Status" : ps ? "وضعیت" : "وضعیت",
    orderTotal: en ? "Total" : ps ? "ټول" : "مجموع",
    payment: en ? "Payment" : ps ? "تادیه" : "پرداخت",
    delivery: en ? "Delivery" : ps ? "تحویل" : "تحویل",
    shippingTo: en ? "Shipping to" : ps ? "لېږل کېږي" : "ارسال به",
    customer: en ? "Customer" : ps ? "پیرودونکی" : "مشتری",
    contact: en ? "Contact" : ps ? "اړیکه" : "تماس",
    vendor: en ? "Seller" : ps ? "پلورونکی" : "فروشنده",
    items: en ? "Items" : ps ? "توکي" : "اقلام",
    qty: en ? "Qty" : ps ? "شمېر" : "تعداد",
    subtotal: en ? "Subtotal" : ps ? "فرعي مجموعه" : "جمع جزء",
    discount: en ? "Discount" : ps ? "تخفیف" : "تخفیف",
    progress: en ? "Progress" : ps ? "پرمختګ" : "پیشرفت",
    shipments: en ? "Shipments" : ps ? "لېږدونه" : "محموله‌ها",
    deliveryMethod: en ? "Delivery method" : ps ? "د تحویل طریقه" : "روش تحویل",
    methodStandard: en ? "Standard delivery" : ps ? "معیاري تحویل" : "تحویل استاندارد",
    methodExpress: en ? "Express delivery" : ps ? "چټک تحویل" : "تحویل سریع",
    methodPickup: en ? "Pickup" : ps ? "اخیستل" : "تحویل حضوری",
    accountPrompt: en
      ? "Want order history and saved addresses?"
      : ps
        ? "د امر تاریخچه او خوندي پتې غواړئ؟"
        : "تاریخچه سفارش و آدرس‌های ذخیره‌شده می‌خواهید؟",
    accountCta: en ? "Create an account" : ps ? "حساب جوړ کړئ" : "ساخت حساب",
    anotherOrder: en ? "Track another order" : ps ? "بل امر تعقیب کړئ" : "پیگیری سفارش دیگر",
    loading: en ? "Loading order…" : ps ? "امر پورته کېږي…" : "در حال بارگذاری سفارش…",
    loadError: en ? "We could not load this order." : ps ? "دا امر پورته نشو." : "بارگذاری این سفارش ممکن نشد.",
    invalidLink: en
      ? "This tracking link is invalid or expired."
      : ps
        ? "دا تعقیب لینک ناسم یا پای ته رسېدلی دی."
        : "این لینک پیگیری نامعتبر یا منقضی است.",
    cardPaid: en ? "Paid by card" : ps ? "د کارت له لارې تادیه شوی" : "پرداخت با کارت",
    privacyNote: en
      ? "Contact details are partially masked on this page for privacy."
      : ps
        ? "د محرمیت لپاره په دې پاڼه کې اړیکې جزوي پټې دي."
        : "برای حفظ حریم خصوصی، اطلاعات تماس در این صفحه بخشی پنهان شده‌اند.",
    stepPlaced: en ? "Placed" : ps ? "ثبت" : "ثبت",
    stepPreparing: en ? "Preparing" : ps ? "چمتو کېږي" : "آماده‌سازی",
    stepShipped: en ? "On the way" : ps ? "په لاره کې" : "در راه",
    stepDelivered: en ? "Delivered" : ps ? "تحویل شوی" : "تحویل شده",
    cancelledNote: en
      ? "This order was cancelled."
      : ps
        ? "دا امر لغوه شوی دی."
        : "این سفارش لغو شده است.",
  };
}

export const GUEST_VENDOR_STATUS_LABELS: Record<string, Record<SupportedLocale, string>> = {
  NEW: { en: "New", ps: "نوی", "fa-AF": "جدید" },
  PREPARING: { en: "Preparing", ps: "چمتو کېږي", "fa-AF": "در حال آماده‌سازی" },
  INBOUND_SHIPPED: {
    en: "Preparing",
    ps: "چمتو کېږي",
    "fa-AF": "در حال آماده‌سازی",
  },
  RECEIVED_AT_WAREHOUSE: {
    en: "Preparing",
    ps: "چمتو کېږي",
    "fa-AF": "در حال آماده‌سازی",
  },
  SHIPPED: { en: "On the way", ps: "په لاره کې", "fa-AF": "در راه" },
  DELIVERED: { en: "Delivered", ps: "تحویل شوی", "fa-AF": "تحویل شده" },
  CANCELLED: { en: "Cancelled", ps: "لغوه شوی", "fa-AF": "لغو شده" },
};
