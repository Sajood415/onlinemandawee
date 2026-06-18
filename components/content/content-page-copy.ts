import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getContentPageCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    onThisPage: en ? "On this page" : ps ? "په دې پاڼه کې" : "در این صفحه",
    lastUpdated: en ? "Last updated" : ps ? "وروستی تازه شوی" : "آخرین به‌روزرسانی",
    contactTitle: en ? "Need help?" : ps ? "مرسته ته اړتیا لرئ؟" : "به کمک نیاز دارید؟",
    contactSubtitle: en
      ? "Our support team is here to assist customers and vendors."
      : ps
        ? "زموږ د ملاتړ ټیم د پیرودونکو او پلورونکو لپاره چمتو دی."
        : "تیم پشتیبانی ما برای مشتریان و فروشندگان در دسترس است.",
    phoneLabel: en ? "Phone" : ps ? "تلیفون" : "تلفن",
    emailLabel: en ? "Email" : ps ? "برېښنالیک" : "ایمیل",
    relatedLinks: en ? "Related pages" : ps ? "اړوند پاڼې" : "صفحات مرتبط",
    languageNotice: en
      ? "English is the authoritative version of this content until official translations are provided."
      : ps
        ? "په دې پاڼه کې انګلیسي متن رسمي نسخه ده تر هغه چې رسمي ژباړه وړاندې شي."
        : "متن انگلیسی نسخه مرجع این محتوا است تا ترجمه رسمی ارائه شود.",
    quickLinks: en ? "Quick links" : ps ? "چټک لینکونه" : "پیونده‌های سریع",
    businessHours: en ? "Response times" : ps ? "د ځواب وخت" : "زمان پاسخ",
    businessHoursText: en
      ? "We aim to respond to email within 1–2 business days. Phone support is available during business hours (Afghanistan time)."
      : ps
        ? "موږ هڅه کوو چې په ۱–۲ کاري ورځو کې برېښنالیک ته ځواب ورکړو."
        : "تلاش می‌کنیم ظرف ۱–۲ روز کاری به ایمیل پاسخ دهیم.",
  };
}
