export type SupportedLocale = "en" | "ps" | "fa-AF";

const vendorTranslations = {
  "Noor Premium Gifts": { ps: "نور پریمیم ډالۍ", "fa-AF": "نور پریمیم هدایا" },
  "Bloom Avenue": { ps: "بلوم ایونیو", "fa-AF": "بلوم اونیو" },
  "Mandawee Market": { ps: "منډوي مارکیټ", "fa-AF": "بازار منداوی" },
  "Cocoa Stories": { ps: "کوکو کیسې", "fa-AF": "داستان‌های کاکائو" },
  "Fresh Farm Co": { ps: "فریش فارم شرکت", "fa-AF": "شرکت فارم تازه" },
  "Desert Delights": { ps: "صحرايي خوندونه", "fa-AF": "خوشی‌های صحرا" },
  "Tiny Tots Store": { ps: "ټایني ټاټس پلورنځی", "fa-AF": "فروشگاه تینی ټاتس" },
} as const;

const deliveryTranslations = {
  "Same Day": {
    ps: "همدا ورځ",
    "fa-AF": "همان روز",
  },
  "Next Day": {
    ps: "بله ورځ",
    "fa-AF": "روز بعد",
  },
  "2-3 Days": {
    ps: "2-3 ورځې",
    "fa-AF": "2-3 روز",
  },
  "Standard delivery": {
    ps: "معیاري تحویل",
    "fa-AF": "تحویل استاندارد",
  },
} as const;

export const localizeVendor = (vendor: string, locale: SupportedLocale) => {
  if (locale === "en") return vendor;
  return vendorTranslations[vendor as keyof typeof vendorTranslations]?.[locale] ?? vendor;
};

export const localizeDelivery = (delivery: string, locale: SupportedLocale) => {
  if (locale === "en") return delivery;
  return (
    deliveryTranslations[delivery as keyof typeof deliveryTranslations]?.[locale] ??
    delivery
  );
};
