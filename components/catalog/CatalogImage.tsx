"use client";

import Image from "next/image";

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Hostnames allowed in next.config.ts — keep in sync when adding remotePatterns. */
const NEXT_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "onlinemandawee.com",
  "order.jazaaglobal.com",
  "encrypted-tbn0.gstatic.com",
  "res.cloudinary.com",
]);

function canUseNextImage(src: string) {
  const hostname = getHostname(src);
  if (!hostname) return false;
  if (NEXT_IMAGE_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".googleusercontent.com")) return true;
  if (hostname.endsWith(".cloudinary.com")) return true;
  return false;
}

type CatalogImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function CatalogImage({
  src,
  alt,
  fill,
  className,
  sizes,
  priority,
}: CatalogImageProps) {
  if (!canUseNextImage(src)) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`} />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}
