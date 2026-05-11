export type StoreCategoryTile = {
  slug: string;
  href: string;
  image: string;
  label: string;
  tint: string;
};

export type HeroSlide = {
  /** Desktop / tablet hero (wide) */
  image: string;
  /** Mobile hero — Shopify `adaptive_height` (~66% padding-top) uses a separate file */
  imageMobile?: string;
  headline: string;
  sub: string;
  cta: string;
  href: string;
};
export type MidPromoSlide = {
  ribbon: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  imageKey: string;
  imageSrc: string;
};

