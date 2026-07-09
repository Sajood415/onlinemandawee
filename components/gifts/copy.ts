import type { SupportedLocale } from "@/lib/localization/product-vendor";

export type GiftOccasionOption = {
  value: string;
  label: Record<SupportedLocale, string>;
};

export const GIFT_OCCASION_OPTIONS: GiftOccasionOption[] = [
  {
    value: "birthday",
    label: { en: "Birthday", ps: "د زیږون ورځ", "fa-AF": "تولد" },
  },
  {
    value: "wedding",
    label: { en: "Wedding", ps: "واده", "fa-AF": "عروسی" },
  },
  {
    value: "eid",
    label: { en: "Eid", ps: "عید", "fa-AF": "عید" },
  },
  {
    value: "nowruz",
    label: { en: "Nowruz / New Year", ps: "نوروز / نوی کال", "fa-AF": "نوروز / سال نو" },
  },
  {
    value: "anniversary",
    label: { en: "Anniversary", ps: "کليزه", "fa-AF": "سالگرد" },
  },
  {
    value: "thank-you",
    label: { en: "Thank you", ps: "مننه", "fa-AF": "تشکر" },
  },
  {
    value: "other",
    label: { en: "Other", ps: "نور", "fa-AF": "سایر" },
  },
];

export type GiftItemTypeOption = {
  value: string;
  label: Record<SupportedLocale, string>;
};

export const GIFT_ITEM_TYPE_OPTIONS: GiftItemTypeOption[] = [
  {
    value: "DRESS",
    label: { en: "Dress", ps: "کالي", "fa-AF": "لباس" },
  },
];

export const DRESS_SIZE_OPTIONS: GiftItemTypeOption[] = [
  { value: "XS", label: { en: "XS", ps: "XS", "fa-AF": "XS" } },
  { value: "S", label: { en: "S", ps: "S", "fa-AF": "S" } },
  { value: "M", label: { en: "M", ps: "M", "fa-AF": "M" } },
  { value: "L", label: { en: "L", ps: "L", "fa-AF": "L" } },
  { value: "XL", label: { en: "XL", ps: "XL", "fa-AF": "XL" } },
  { value: "XXL", label: { en: "XXL", ps: "XXL", "fa-AF": "XXL" } },
  { value: "XXXL", label: { en: "XXXL", ps: "XXXL", "fa-AF": "XXXL" } },
  {
    value: "custom",
    label: { en: "Custom / Other", ps: "ځانګړی اندازه / نور", "fa-AF": "اندازه خاص / سایر" },
  },
];

export const DRESS_SLEEVE_OPTIONS: GiftItemTypeOption[] = [
  {
    value: "sleeveless",
    label: { en: "Sleeveless", ps: "پرته له لستوڼي", "fa-AF": "بدون آستین" },
  },
  {
    value: "half-sleeve",
    label: { en: "Half sleeve", ps: "نیم لستوڼی", "fa-AF": "آستین نیم" },
  },
  {
    value: "three-quarter-sleeve",
    label: { en: "3/4 sleeve", ps: "٣/٤ لستوڼی", "fa-AF": "آستین سه‌ربعی" },
  },
  {
    value: "full-sleeve",
    label: { en: "Full sleeve", ps: "بشپړ لستوڼی", "fa-AF": "آستین کامل" },
  },
];

export const DRESS_LENGTH_OPTIONS: GiftItemTypeOption[] = [
  { value: "short", label: { en: "Short", ps: "لنډ", "fa-AF": "کوتاه" } },
  {
    value: "knee-length",
    label: { en: "Knee-length", ps: "تر زنګون پورې", "fa-AF": "تا زانو" },
  },
  { value: "midi", label: { en: "Midi", ps: "منځنی", "fa-AF": "میدی" } },
  {
    value: "maxi",
    label: { en: "Long / Maxi", ps: "اوږد / مکسي", "fa-AF": "بلند / مکسی" },
  },
];

export const DRESS_FITTING_OPTIONS: GiftItemTypeOption[] = [
  { value: "slim", label: { en: "Slim fit", ps: "نری فټ", "fa-AF": "فیت باریک" } },
  {
    value: "regular",
    label: { en: "Regular fit", ps: "منظم فټ", "fa-AF": "فیت معمولی" },
  },
  { value: "loose", label: { en: "Loose fit", ps: "لوز فټ", "fa-AF": "فیت گشاد" } },
];

export function getGiftsCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    title: en ? "Gift Sets" : ps ? "د ډالۍ بستې" : "بسته‌های هدیه",
    subtitle: en
      ? "Send a thoughtful gift to loved ones in Afghanistan — browse ready-made sets or request a personalized gift prepared and delivered your way."
      : ps
        ? "په افغانستان کې خپلو عزیزانو ته ډالۍ واستوئ — چمتو بستې وګورئ یا د خپلې خوښې ډالۍ غوښتنه وکړئ."
        : "هدایای دل‌انگیز برای عزیزان در افغانستان — بسته‌های آماده را ببینید یا درخواست هدیه شخصی‌سازی‌شده ثبت کنید.",
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
    requestTitle: en ? "Personalized gift request" : ps ? "د ځانګړې ډالۍ غوښتنه" : "درخواست هدیه شخصی",
    requestSubtitle: en
      ? "Tell us how you want the gift prepared and delivered to your relative in Afghanistan. Our team will follow up with a quote and next steps."
      : ps
        ? "موږ ته ووایاست چې ډالۍ څنګه چمتو او ستاسو خپلوانو ته په افغانستان کې څنګه ورسول شي."
        : "بگویید هدیه چگونه آماده و به عزیزان شما در افغانستان تحویل شود. تیم ما با قیمت و مراحل بعدی تماس می‌گیرد.",
    requestBadge: en ? "Gift request form" : ps ? "د ډالۍ غوښتنلیک" : "فرم درخواست هدیه",
    curatedTitle: en ? "Ready-made gift sets" : ps ? "چمتو د ډالۍ بستې" : "بسته‌های هدیه آماده",
    curatedSubtitle: en
      ? "Shop curated gift-ready products from trusted vendors."
      : ps
        ? "د باوري پلورونکو څخه چمتو د ډالۍ توکي واخلئ."
        : "محصولات آماده هدیه از فروشندگان معتبر.",
    senderSection: en ? "Your details" : ps ? "ستاسو معلومات" : "مشخصات شما",
    recipientSection: en ? "Recipient in Afghanistan" : ps ? "ترلاسه کوونکی په افغانستان کې" : "گیرنده در افغانستان",
    giftSection: en ? "Gift details" : ps ? "د ډالۍ جزییات" : "جزئیات هدیه",
    senderName: en ? "Your full name" : ps ? "ستاسو بشپړ نوم" : "نام کامل شما",
    senderEmail: en ? "Email address" : ps ? "برېښنالیک" : "ایمیل",
    senderPhone: en ? "Phone number" : ps ? "د تلیفون شمېره" : "شماره تلفن",
    recipientName: en ? "Recipient full name" : ps ? "د ترلاسه کوونکي بشپړ نوم" : "نام کامل گیرنده",
    recipientPhone: en ? "Recipient phone" : ps ? "د ترلاسه کوونکي تلیفون" : "تلفن گیرنده",
    recipientCity: en ? "City" : ps ? "ښار" : "شهر",
    recipientProvince: en ? "Province (optional)" : ps ? "ولایت (اختیاري)" : "ولایت (اختیاری)",
    recipientAddress: en ? "Delivery address" : ps ? "د تحویلي پته" : "آدرس تحویل",
    occasion: en ? "Occasion (optional)" : ps ? "مناسبت (اختیاري)" : "مناسبت (اختیاری)",
    occasionPlaceholder: en ? "Select an occasion" : ps ? "مناسبت وټاکئ" : "مناسبت را انتخاب کنید",
    preferredDate: en ? "Preferred delivery date (optional)" : ps ? "غوره د تحویلي نېټه (اختیاري)" : "تاریخ تحویل ترجیحی (اختیاری)",
    itemType: en ? "Item type (optional)" : ps ? "د توکي ډول (اختیاري)" : "نوع قلم (اختیاری)",
    itemTypePlaceholder: en
      ? "None — general gift request"
      : ps
        ? "هیڅ — عمومي د ډالۍ غوښتنه"
        : "هیچ — درخواست عمومی هدیه",
    dressSection: en ? "Dress details" : ps ? "د کالي جزییات" : "جزئیات لباس",
    dressSectionHint: en
      ? "Tell us how the dress should look so we can source or tailor it."
      : ps
        ? "موږ ته ووایاست چې کالي څنګه ښکاره شي ترڅو موږ یې چمتو یا ګنډل کړو."
        : "بگویید لباس چگونه باید باشد تا آن را تهیه یا بدوزیم.",
    dressColor: en ? "Color" : ps ? "رنګ" : "رنگ",
    dressColorPlaceholder: en ? "e.g. Red, Navy blue" : ps ? "لکه سور، نيوي شين" : "مثلاً قرمز، سرمه‌ای",
    dressSize: en ? "Size" : ps ? "اندازه" : "اندازه",
    dressSizePlaceholder: en ? "Select a size" : ps ? "اندازه وټاکئ" : "اندازه را انتخاب کنید",
    dressSleeveType: en ? "Sleeve type" : ps ? "د لستوڼي ډول" : "نوع آستین",
    dressSleeveTypePlaceholder: en
      ? "Select sleeve type"
      : ps
        ? "د لستوڼي ډول وټاکئ"
        : "نوع آستین را انتخاب کنید",
    dressLength: en ? "Length" : ps ? "اوږدوالی" : "طول",
    dressLengthPlaceholder: en ? "Select length" : ps ? "اوږدوالی وټاکئ" : "طول را انتخاب کنید",
    dressFitting: en ? "Fitting" : ps ? "فټینګ" : "فیت",
    dressFittingPlaceholder: en ? "Select fitting" : ps ? "فټینګ وټاکئ" : "فیت را انتخاب کنید",
    dressTexture: en ? "Fabric / texture" : ps ? "کیڼل / بڼه" : "پارچه / بافت",
    dressTexturePlaceholder: en
      ? "e.g. Cotton, Silk, Velvet"
      : ps
        ? "لکه کاټن، ورېښمین، مخملي"
        : "مثلاً پنبه، ابریشم، مخمل",
    dressGenderLabel: en ? "For" : ps ? "لپاره" : "برای",
    dressForMale: en ? "Male" : ps ? "نارینه" : "مرد",
    dressForFemale: en ? "Female" : ps ? "ښځینه" : "زن",
    preparationNotes: en ? "How should the gift be prepared?" : ps ? "ډالۍ څنګه چمتو شي؟" : "هدیه چگونه آماده شود؟",
    preparationPlaceholder: en
      ? "Describe items, packaging, wrapping, personalization, dietary preferences, or anything special you want included."
      : ps
        ? "توکي، بسته‌بندي، ځانګړتیاوې یا هر ځانګړی شی چې غواړئ شامل شي تشریح کړئ."
        : "اقلام، بسته‌بندی، شخصی‌سازی یا هر جزئیات ویژه‌ای که می‌خواهید را بنویسید.",
    deliveryInstructions: en ? "How should it be delivered?" : ps ? "څنګه ورسول شي؟" : "چگونه تحویل شود؟",
    deliveryPlaceholder: en
      ? "Share timing, neighborhood landmarks, who to contact on arrival, or any delivery notes for Afghanistan."
      : ps
        ? "د وخت، نښې، د اړیکې شخص یا نور تحویلي یادښتونه په افغانستان کې وړاندې کړئ."
        : "زمان، نشانه‌های محله، شخص تماس یا یادداشت‌های تحویل در افغانستان را بنویسید.",
    budgetNote: en ? "Budget note (optional)" : ps ? "د بودیجې یادښت (اختیاري)" : "یادداشت بودجه (اختیاری)",
    budgetPlaceholder: en
      ? "e.g. Around $50–$80, flexible for quality"
      : ps
        ? "لکه شاوخوا $50–$80"
        : "مثلاً حدود ۵۰–۸۰ دلار",
    submit: en ? "Submit gift request" : ps ? "د ډالۍ غوښتنه وسپارئ" : "ثبت درخواست هدیه",
    submitting: en ? "Submitting..." : ps ? "لیږدېږي..." : "در حال ارسال...",
    successTitle: en ? "Request received!" : ps ? "غوښتنه ترلاسه شوه!" : "درخواست دریافت شد!",
    successBody: en
      ? "We received your gift request and will contact you soon with a quote and delivery plan."
      : ps
        ? "موږ ستاسو غوښتنه ترلاسه کړه او ژر به د قیمت او تحویلي پلان سره اړیکه ونیسو."
        : "درخواست شما دریافت شد و به‌زودی برای قیمت و برنامه تحویل با شما تماس می‌گیریم.",
    requestNumber: en ? "Request number" : ps ? "د غوښتنې شمېره" : "شماره درخواست",
    submitAnother: en ? "Submit another request" : ps ? "بله غوښتنه وسپارئ" : "ثبت درخواست دیگر",
    trackInAccount: en
      ? "Track status in your account"
      : ps
        ? "په حساب کې حالت وڅارئ"
        : "پیگیری وضعیت در حساب شما",
    required: en ? "Required fields" : ps ? "اړین برخې" : "فیلدهای الزامی",
    validationSummary: en
      ? "Please fix the highlighted fields."
      : ps
        ? "مهرباني وکړئ نښان شوي برخې سمه کړئ."
        : "لطفاً فیلدهای مشخص‌شده را اصلاح کنید.",
    submitFailed: en
      ? "Could not submit your gift request. Please try again."
      : ps
        ? "ستاسو د ډالۍ غوښتنه ونه لیږل شوه. بیا هڅه وکړئ."
        : "ارسال درخواست هدیه ناموفق بود. دوباره تلاش کنید.",
    mediaSection: en ? "Photos & videos" : ps ? "عکسونه او ویډیوګانې" : "تصاویر و ویدیوها",
    mediaSectionHint: en
      ? "Optional — show us the gift style, packaging, or final look you have in mind."
      : ps
        ? "اختیاري — موږ ته د ډالۍ بڼه، بسته‌بندي یا غوره ښکاره بڼه وښایاست."
        : "اختیاری — ظاهر هدیه، بسته‌بندی یا نتیجه دلخواه را نشان دهید.",
    mediaImagesLabel: en ? "Reference images" : ps ? "مرجعي عکسونه" : "تصاویر مرجع",
    mediaVideosLabel: en ? "Explanation videos" : ps ? "توضیحي ویډیوګانې" : "ویدیوهای توضیحی",
    mediaImagesHint: en
      ? "Up to {max} images, JPG/PNG/WebP, max {size} MB each."
      : ps
        ? "تر {max} عکسونه، JPG/PNG/WebP، هر یو تر {size} MB."
        : "حداکثر {max} تصویر، JPG/PNG/WebP، هر کدام تا {size} مگابایت.",
    mediaVideosHint: en
      ? "Up to {max} short videos, MP4/WebM/MOV, max {size} MB each."
      : ps
        ? "تر {max} لنډې ویډیوګانې، MP4/WebM/MOV، هر یو تر {size} MB."
        : "حداکثر {max} ویدیوی کوتاه، MP4/WebM/MOV، هر کدام تا {size} مگابایت.",
    mediaAddImage: en ? "Upload image" : ps ? "عکس پورته کړئ" : "بارگذاری تصویر",
    mediaAddVideo: en ? "Upload video" : ps ? "ویډیو پورته کړئ" : "بارگذاری ویدیو",
    mediaUploading: en ? "Uploading..." : ps ? "پورته کېږي..." : "در حال بارگذاری...",
    mediaRemove: en ? "Remove" : ps ? "لرې کړئ" : "حذف",
    mediaUploadFailed: en
      ? "Upload failed. Please try again."
      : ps
        ? "پورته کول ناکام شول. بیا هڅه وکړئ."
        : "بارگذاری ناموفق بود. دوباره تلاش کنید.",
    mediaImageLimit: en
      ? "You can upload up to 5 images."
      : ps
        ? "تاسو تر ۵ عکسونو پورې پورته کولی شئ."
        : "می‌توانید حداکثر ۵ تصویر بارگذاری کنید.",
    mediaVideoLimit: en
      ? "You can upload up to 2 videos."
      : ps
        ? "تاسو تر ۲ ویډیوګانو پورې پورته کولی شئ."
        : "می‌توانید حداکثر ۲ ویدیو بارگذاری کنید.",
  };
}

export function getGiftRequestFormCopy(locale: SupportedLocale) {
  return getGiftsCopy(locale);
}
