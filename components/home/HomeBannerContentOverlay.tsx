type HomeBannerContentOverlayProps = {
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  variant?: "hero" | "section";
};

export function HomeBannerContentOverlay({
  title,
  subtitle,
  ctaLabel,
  variant = "section",
}: HomeBannerContentOverlayProps) {
  const cta = ctaLabel?.trim();
  const sub = subtitle?.trim();
  const headline = title.trim();

  if (!cta && !sub && !headline) return null;

  const isHero = variant === "hero";

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/70 via-black/35 to-transparent ${
        isHero ? "px-4 pb-4 pt-16 sm:px-8 sm:pb-8 sm:pt-24" : "px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-16"
      }`}
    >
      <div className={`max-w-xl ${isHero ? "sm:max-w-2xl" : ""}`}>
        {headline ? (
          <p
            className={`font-bold leading-tight text-white ${
              isHero ? "text-lg sm:text-2xl lg:text-3xl" : "text-base sm:text-xl"
            }`}
          >
            {headline}
          </p>
        ) : null}
        {sub ? (
          <p
            className={`mt-1 text-white/90 ${
              isHero ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
          >
            {sub}
          </p>
        ) : null}
        {cta ? (
          <span
            className={`mt-3 inline-flex items-center justify-center rounded-full bg-primary font-bold text-white shadow-lg ${
              isHero
                ? "px-5 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base"
                : "px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm"
            }`}
          >
            {cta}
          </span>
        ) : null}
      </div>
    </div>
  );
}
