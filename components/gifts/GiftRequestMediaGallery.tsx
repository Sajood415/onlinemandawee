"use client";

import Image from "next/image";

type GiftRequestMediaGalleryProps = {
  imageUrls: string[];
  videoUrls: string[];
  title?: string;
  imagesLabel?: string;
  videosLabel?: string;
};

export function GiftRequestMediaGallery({
  imageUrls,
  videoUrls,
  title = "Reference media",
  imagesLabel = "Images",
  videosLabel = "Videos",
}: GiftRequestMediaGalleryProps) {
  if (imageUrls.length === 0 && videoUrls.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {title}
      </h3>

      {imageUrls.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {imagesLabel}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imageUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover transition hover:scale-[1.02]"
                  sizes="(max-width: 640px) 50vw, 200px"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {videoUrls.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {videosLabel}
          </p>
          <div className="space-y-3">
            {videoUrls.map((url) => (
              <video
                key={url}
                src={url}
                controls
                playsInline
                className="max-h-64 w-full rounded-xl border border-neutral-200 bg-black"
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
