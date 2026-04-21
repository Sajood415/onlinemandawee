"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  Clock,
  Star,
  Play,
  Pause,
  Sparkles,
} from "lucide-react";

type SupportedLocale = "en" | "ps" | "fa-AF";

type HeroSlide = {
  id: number;
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  ctaLink: string;
  overlayColor: string;
  textPosition: "left" | "center" | "right";
};

type HeroBadge = {
  text: string;
  subtext: string;
};

const baseSlides: Array<
  Pick<HeroSlide, "id" | "image" | "ctaLink" | "overlayColor" | "textPosition">
> = [
  {
    id: 1,
    image: "/images/carousals/slide-1.jpg",
    ctaLink: "/products?category=groceries",
    overlayColor: "rgba(0,0,0,0.35)",
    textPosition: "left",
  },
  {
    id: 2,
    image: "/images/carousals/slide-2.jpg",
    ctaLink: "/baby-packages",
    overlayColor: "rgba(0,0,0,0.3)",
    textPosition: "left",
  },
  {
    id: 3,
    image: "/images/carousals/slide-3.jpg",
    ctaLink: "/products?category=baby-care",
    overlayColor: "rgba(0,0,0,0.35)",
    textPosition: "left",
  },
  {
    id: 4,
    image: "/images/carousals/slide-4.jpg",
    ctaLink: "/gifts",
    overlayColor: "rgba(0,0,0,0.4)",
    textPosition: "left",
  },
  {
    id: 5,
    image: "/images/carousals/slide-5.jpg",
    ctaLink: "/products?category=fruits",
    overlayColor: "rgba(0,0,0,0.35)",
    textPosition: "left",
  },
  {
    id: 6,
    image: "/images/carousals/slide-6.jpg",
    ctaLink: "/deals",
    overlayColor: "rgba(0,0,0,0.4)",
    textPosition: "left",
  },
];

const localizedSlides: Record<
  SupportedLocale,
  Array<Omit<HeroSlide, "id" | "image" | "ctaLink" | "overlayColor" | "textPosition">>
> = {
  en: [
    {
      alt: "Fresh organic groceries",
      eyebrow: "Farm Fresh Daily",
      title: "Organic Veggies & Fruits Delivered",
      description:
        "From local farms to your doorstep. Get 20% off your first fresh produce order!",
      cta: "Shop Fresh",
    },
    {
      alt: "Premium baby essentials",
      eyebrow: "The Baby Event",
      title: "Gentle Care for Your Little One",
      description:
        "Premium baby products with love. Soft, safe, and perfect for delicate skin.",
      cta: "Shop Baby",
    },
    {
      alt: "Baby bath essentials",
      eyebrow: "Bath Time Fun",
      title: "Make Bath Time a Joy",
      description:
        "Natural bath essentials that make cleaning up fun and safe for babies.",
      cta: "Explore",
    },
    {
      alt: "Gifts and celebrations",
      eyebrow: "Celebrate Together",
      title: "Gifts That Spark Joy",
      description:
        "Curated gift packages for every occasion. Birthdays, parties & special moments.",
      cta: "Shop Gifts",
    },
    {
      alt: "Fresh fruit market",
      eyebrow: "Summer Harvest",
      title: "Taste the Season's Best",
      description:
        "Handpicked seasonal fruits. Juicy, ripe, and delivered fresh within hours.",
      cta: "Order Now",
    },
    {
      alt: "Special offers",
      eyebrow: "Limited Time",
      title: "Weekend Special Deals",
      description:
        "Exclusive discounts on your favorite products. Valid this weekend only!",
      cta: "View Deals",
    },
  ],
  ps: [
    {
      alt: "تازه عضوي خوراکي توکي",
      eyebrow: "هره ورځ تازه",
      title: "عضوي سبزي او مېوې ستاسو تر دروازې",
      description:
        "له سیمه‌ییزو فارمونو تر ستاسو کور پورې. په لومړي تازه فرمایش کې 20٪ تخفیف واخلئ!",
      cta: "تازه واخلئ",
    },
    {
      alt: "د ماشوم پریمیم اړین توکي",
      eyebrow: "د ماشوم ځانګړی پروګرام",
      title: "ستاسو کوچني ته نرمه پاملرنه",
      description:
        "د مینې سره پریمیم د ماشوم محصولات. نرم، خوندي او د نازک پوست لپاره مناسب.",
      cta: "د ماشوم توکي",
    },
    {
      alt: "د ماشوم د حمام اړین توکي",
      eyebrow: "د حمام خوږ وخت",
      title: "حمام وخت په خوښۍ بدل کړئ",
      description:
        "طبیعي د حمام توکي چې پاکوالی د ماشومانو لپاره اسانه او خوندي کوي.",
      cta: "وګورئ",
    },
    {
      alt: "ډالۍ او لمانځنې",
      eyebrow: "یوځای ولمانځئ",
      title: "ډالۍ چې خوښي رامنځته کوي",
      description:
        "د هرې موقع لپاره غوره شوې ډالۍ بستې. زوکړې، محفلونه او ځانګړې شېبې.",
      cta: "ډالۍ واخلئ",
    },
    {
      alt: "تازه مېوې مارکېټ",
      eyebrow: "د اوړي حاصلات",
      title: "د فصل غوره خوند وڅکئ",
      description:
        "لاس‌چین شوې موسمي مېوې. خوږې، پخې او په څو ساعتونو کې تازه تحویلیږي.",
      cta: "اوس فرمایش",
    },
    {
      alt: "ځانګړي وړاندیزونه",
      eyebrow: "محدود وخت",
      title: "د اونۍ پای ځانګړي تخفیفونه",
      description:
        "ستاسو د خوښې محصولاتو لپاره ځانګړي تخفیفونه. یوازې د دې اونۍ پای لپاره!",
      cta: "وړاندیزونه",
    },
  ],
  "fa-AF": [
    {
      alt: "مواد خوراکی تازه و ارگانیک",
      eyebrow: "تازه هر روز",
      title: "سبزی و میوه ارگانیک درب منزل",
      description:
        "از فارم‌های محلی تا خانه شما. در اولین سفارش تازه 20٪ تخفیف بگیرید!",
      cta: "خرید تازه",
    },
    {
      alt: "اقلام ممتاز نوزاد",
      eyebrow: "رویداد نوزاد",
      title: "مراقبت لطیف برای کوچولوی شما",
      description:
        "محصولات ممتاز نوزاد با عشق. نرم، امن و مناسب پوست حساس.",
      cta: "خرید نوزاد",
    },
    {
      alt: "لوازم حمام نوزاد",
      eyebrow: "حمام شاد",
      title: "وقت حمام را لذت‌بخش کنید",
      description:
        "اقلام طبیعی حمام که پاک‌کاری را برای نوزادان امن و ساده می‌سازد.",
      cta: "مشاهده",
    },
    {
      alt: "هدایا و جشن‌ها",
      eyebrow: "باهم جشن بگیریم",
      title: "هدایایی که شادی می‌آورد",
      description:
        "بسته‌های هدیه منتخب برای هر مناسبت. تولدها، مهمانی‌ها و لحظه‌های خاص.",
      cta: "خرید هدیه",
    },
    {
      alt: "بازار میوه تازه",
      eyebrow: "حاصل تابستان",
      title: "بهترین طعم فصل را بچشید",
      description:
        "میوه‌های موسمی دست‌چین‌شده؛ آبدار، رسیده و در چند ساعت تازه تحویل می‌شود.",
      cta: "همین حالا",
    },
    {
      alt: "پیشنهادهای ویژه",
      eyebrow: "زمان محدود",
      title: "تخفیف‌های ویژه آخر هفته",
      description:
        "تخفیف‌های اختصاصی روی محصولات محبوب شما. فقط همین آخر هفته!",
      cta: "دیدن تخفیف",
    },
  ],
};

const localizedBadges: Record<SupportedLocale, HeroBadge[]> = {
  en: [
    { text: "Same-day delivery", subtext: "Order by 2PM" },
    { text: "800+ vendors", subtext: "Verified sellers" },
    { text: "Express options", subtext: "2-hour delivery" },
    { text: "Gift wrapping", subtext: "Free on $50+" },
  ],
  ps: [
    { text: "همدا ورځ تحویل", subtext: "تر 2PM مخکې فرمایش" },
    { text: "800+ پلورونکي", subtext: "تایید شوي پلورونکي" },
    { text: "چټک انتخابونه", subtext: "2 ساعته تحویل" },
    { text: "د ډالۍ لفافه", subtext: "پر $50+ وړیا" },
  ],
  "fa-AF": [
    { text: "تحویل همان روز", subtext: "سفارش تا 2PM" },
    { text: "800+ فروشنده", subtext: "فروشندگان تاییدشده" },
    { text: "گزینه‌های سریع", subtext: "تحویل 2 ساعته" },
    { text: "بسته‌بندی هدیه", subtext: "رایگان روی $50+" },
  ],
};

const localizedAria: Record<
  SupportedLocale,
  {
    previous: string;
    next: string;
    pause: string;
    play: string;
    dot: (index: number) => string;
  }
> = {
  en: {
    previous: "Previous slide",
    next: "Next slide",
    pause: "Pause slideshow",
    play: "Play slideshow",
    dot: (index) => `Go to slide ${index}`,
  },
  ps: {
    previous: "مخکینی سلایډ",
    next: "راتلونکی سلایډ",
    pause: "سلایډ شو ودروئ",
    play: "سلایډ شو پيل کړئ",
    dot: (index) => `سلایډ ${index} ته لاړ شئ`,
  },
  "fa-AF": {
    previous: "اسلاید قبلی",
    next: "اسلاید بعدی",
    pause: "توقف نمایش اسلاید",
    play: "پخش نمایش اسلاید",
    dot: (index) => `رفتن به اسلاید ${index}`,
  },
};

export default function HeroSection() {
  const locale = useLocale();
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const heroSlides = baseSlides.map((baseSlide, index) => ({
    ...baseSlide,
    ...localizedSlides[safeLocale][index],
  }));
  const trustBadges = localizedBadges[safeLocale];
  const ariaCopy = localizedAria[safeLocale];

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, heroSlides.length]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
    );
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentSlide(index);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const currentSlideData = heroSlides[currentSlide];

  return (
    <section className="w-full bg-white">
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            <div
              dir="ltr"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2"
            >
              <button
                onClick={prevSlide}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 border border-gray-100"
                aria-label={ariaCopy.previous}
              >
                <ChevronLeft className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={toggleAutoPlay}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 border border-gray-100"
                aria-label={isAutoPlaying ? ariaCopy.pause : ariaCopy.play}
              >
                {isAutoPlaying ? (
                  <Pause className="text-primary h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
                ) : (
                  <Play className="text-primary ml-0.5 h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
                )}
              </button>
              <button
                onClick={nextSlide}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 border border-gray-100"
                aria-label={ariaCopy.next}
              >
                <ChevronRight className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="relative min-h-80 sm:min-h-90 md:min-h-100 lg:min-h-110 rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative h-full min-h-80 sm:min-h-90 md:min-h-100 lg:min-h-110"
                >
                  <div className="absolute inset-0">
                    <Image
                      src={currentSlideData.image}
                      alt={currentSlideData.alt}
                      fill
                      className="object-cover"
                      priority
                    />
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: currentSlideData.overlayColor }}
                    />
                  </div>

                  <div
                    className={`relative z-10 h-full flex items-center px-4 sm:px-6 md:px-12 lg:px-16 py-8 sm:py-10 ${
                      currentSlideData.textPosition === "center"
                        ? "justify-center text-center"
                        : currentSlideData.textPosition === "right"
                          ? "justify-end text-right"
                          : "justify-start text-left"
                    }`}
                  >
                    <div className="max-w-[85%] sm:max-w-md">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="inline-block mb-3"
                      >
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-gray-900 shadow-md">
                          {currentSlideData.eyebrow}
                        </span>
                      </motion.div>

                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3 text-white drop-shadow-lg"
                      >
                        {currentSlideData.title}
                      </motion.h1>

                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="text-sm md:text-base mb-5 text-white/90 drop-shadow-md"
                      >
                        {currentSlideData.description}
                      </motion.p>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                      >
                        <Link
                          href={currentSlideData.ctaLink}
                          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          {currentSlideData.cta}
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-white w-8"
                      : "bg-white/60 hover:bg-white/80 w-2.5 hover:scale-125"
                  }`}
                  aria-label={ariaCopy.dot(index + 1)}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {trustBadges.map((badge, index) => {
              const Icon = [Truck, Star, Clock, Sparkles][index] ?? Truck;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center gap-2 sm:gap-3 bg-white rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#e6f1fc] rounded-full flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-[#171717] text-xs sm:text-sm">{badge.text}</p>
                    <p className="text-[#74767c] text-[10px] sm:text-xs">{badge.subtext}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
