import Image from "next/image";

/** White mark — use on red header / dark navy panels */
export const BRAND_LOGO_LIGHT_SRC = "/logos/onlinemandawee-logo-light.png";
/** Black mark — use on light footer / light pages */
export const BRAND_LOGO_DARK_SRC = "/logos/onlinemandawee-logo-dark.png";

/** @deprecated Use BRAND_LOGO_LIGHT_SRC / BrandLogo */
export const HEADER_LOGO_SRC = BRAND_LOGO_LIGHT_SRC;

export const BRAND_LOGO_WIDTH = 300;
export const BRAND_LOGO_HEIGHT = 65;

type BrandLogoProps = {
  /** `light` = white logo (dark/red bg). `dark` = black logo (light bg). */
  variant?: "light" | "dark";
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({
  variant = "light",
  className = "h-10 w-auto",
  priority = false,
  alt = "Mandawee",
}: BrandLogoProps) {
  const src = variant === "dark" ? BRAND_LOGO_DARK_SRC : BRAND_LOGO_LIGHT_SRC;
  return (
    <Image
      src={src}
      alt={alt}
      width={BRAND_LOGO_WIDTH}
      height={BRAND_LOGO_HEIGHT}
      className={className}
      priority={priority}
    />
  );
}
