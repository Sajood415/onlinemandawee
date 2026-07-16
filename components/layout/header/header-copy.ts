import type { SupportedLocale } from "@/lib/localization/product-vendor";

export type HeaderCopy = {
  searchSuggestions: string[];
  searchButton: string;
  mobileSearchPlaceholder: string;
  exploreCategories: string;
  storeDepartments: string;
  discoverEverything: string;
  home: string;
  products: string;
  vendors: string;
  giftSets: string;
  gifts: string;
  hawala: string;
  hawalaShort: string;
  new: string;
  babyCare: string;
  support: string;
  more: string;
  quickLinks: string;
  hot: string;
  yourBasket: string;
  itemsReady: string;
  startShopping: string;
  basketEmpty: string;
  basketEmptyDesc: string;
  browseProducts: string;
  estimatedTotal: string;
  viewFullBasket: string;
  languageSelect: string;
  login: string;
  loginRegister: string;
  account: string;
  helloSignIn: string;
  cart: string;
  wishlist: string;
  welcome: string;
  trackOrder: string;
  contact: string;
  becomeVendor: string;
  sellOnPlatform: string;
  categories: string;
};

export const headerCopy: Record<SupportedLocale, HeaderCopy> = {
  en: {
    searchSuggestions: [
      "Search for fresh fruits...",
      "Find organic vegetables...",
      "Discover artisan bread...",
      "Shop local dairy products...",
      "Browse premium coffee...",
    ],
    searchButton: "Search",
    mobileSearchPlaceholder: "Search...",
    exploreCategories: "Explore Categories",
    storeDepartments: "Store Departments",
    discoverEverything: "Discover Everything",
    home: "Home",
    products: "Products",
    vendors: "Vendors",
    giftSets: "Gift Sets",
    gifts: "Gifts",
    hawala: "Hawala Transfer",
    hawalaShort: "Hawala",
    new: "New",
    babyCare: "Baby Care",
    support: "Support",
    more: "More",
    quickLinks: "Quick Links",
    hot: "Hot",
    yourBasket: "Your Basket",
    itemsReady: "items ready",
    startShopping: "Start shopping",
    basketEmpty: "Your basket is empty",
    basketEmptyDesc:
      "Treat your family to something special! Browse our marketplace for the freshest items.",
    browseProducts: "Browse Products",
    estimatedTotal: "Estimated Total",
    viewFullBasket: "View Full Basket",
    languageSelect: "Language Select",
    login: "Login",
    loginRegister: "Login | Register",
    account: "Account",
    helloSignIn: "Hello, Sign In",
    cart: "Cart",
    wishlist: "Wishlist",
    welcome: "Welcome to Mandawee!",
    trackOrder: "Track Order",
    contact: "Contact",
    becomeVendor: "Become a Vendor",
    sellOnPlatform: "Sell on Mandawee!",
    categories: "Categories",
  },
  ps: {
    searchSuggestions: [
      "تازه مېوې ولټوئ...",
      "عضوي سبزيجات ومومئ...",
      "لاسي ډوډۍ وګورئ...",
      "محلي لبنیات واخلئ...",
      "پریمیم قهوه ولټوئ...",
    ],
    searchButton: "لټون",
    mobileSearchPlaceholder: "لټون...",
    exploreCategories: "کټګورۍ وپلټئ",
    storeDepartments: "د پلورنځي څانګې",
    discoverEverything: "هر څه ومومئ",
    home: "کور",
    products: "محصولات",
    vendors: "پلورونکي",
    giftSets: "د ډالۍ بستې",
    gifts: "ډالۍ",
    hawala: "د حواله لېږد",
    hawalaShort: "حواله",
    new: "نوی",
    babyCare: "د ماشوم پاملرنه",
    support: "مرسته",
    more: "نور",
    quickLinks: "چټک لینکونه",
    hot: "ګرم",
    yourBasket: "ستاسو باسکټ",
    itemsReady: "توکي چمتو",
    startShopping: "پیرود پیل کړئ",
    basketEmpty: "ستاسو باسکټ خالي دی",
    basketEmptyDesc:
      "خپلې کورنۍ ته یو ځانګړی څه واخلئ! زموږ مارکیټ وپلټئ او تازه توکي ومومئ.",
    browseProducts: "محصولات وګورئ",
    estimatedTotal: "اټکلی ټولټال",
    viewFullBasket: "بشپړ باسکټ وګورئ",
    languageSelect: "ژبه وټاکئ",
    login: "ننوتل",
    loginRegister: "ننوتل | ثبت‌نام",
    account: "حساب",
    helloSignIn: "سلام، ننوتل",
    cart: "سبد",
    wishlist: "خوښې لیست",
    welcome: "منداوی ته ښه راغلاست!",
    trackOrder: "امر تعقیب",
    contact: "اړیکه",
    becomeVendor: "پلورونکی شئ",
    sellOnPlatform: "په منداوی کې وپلورئ!",
    categories: "کټګورۍ",
  },
  "fa-AF": {
    searchSuggestions: [
      "جستجوی میوه تازه...",
      "سبزیجات ارگانیک پیدا کنید...",
      "نان دست‌ساز را ببینید...",
      "لبنیات محلی خرید کنید...",
      "قهوه ممتاز جستجو کنید...",
    ],
    searchButton: "جستجو",
    mobileSearchPlaceholder: "جستجو...",
    exploreCategories: "کاوش دسته‌بندی‌ها",
    storeDepartments: "بخش‌های فروشگاه",
    discoverEverything: "همه چیز را ببینید",
    home: "خانه",
    products: "محصولات",
    vendors: "فروشندگان",
    giftSets: "بسته‌های هدیه",
    gifts: "هدایا",
    hawala: "انتقال حواله",
    hawalaShort: "حواله",
    new: "جدید",
    babyCare: "مراقبت نوزاد",
    support: "پشتیبانی",
    more: "بیشتر",
    quickLinks: "لینک‌های سریع",
    hot: "داغ",
    yourBasket: "سبد شما",
    itemsReady: "آیتم آماده",
    startShopping: "خرید را شروع کنید",
    basketEmpty: "سبد شما خالی است",
    basketEmptyDesc:
      "برای خانواده‌تان چیزی ویژه بگیرید! بازار ما را ببینید و تازه‌ترین اقلام را پیدا کنید.",
    browseProducts: "مشاهده محصولات",
    estimatedTotal: "جمع تخمینی",
    viewFullBasket: "مشاهده سبد کامل",
    languageSelect: "انتخاب زبان",
    login: "ورود",
    loginRegister: "ورود | ثبت‌نام",
    account: "حساب",
    helloSignIn: "سلام، وارد شوید",
    cart: "سبد",
    wishlist: "علاقه‌مندی‌ها",
    welcome: "به منداوی خوش آمدید!",
    trackOrder: "پیگیری سفارش",
    contact: "تماس",
    becomeVendor: "فروشنده شوید",
    sellOnPlatform: "در منداوی بفروشید!",
    categories: "دسته‌بندی‌ها",
  },
};

export const HEADER_LOGO_SRC =
  "https://onlinemandawee.com/cdn/shop/files/ON_4_150x.png?v=1763220040";
export const HEADER_BRAND_COLOR = "#ec1b23";
export const HEADER_BAR_CLASS = "bg-[#ec1b23]";
