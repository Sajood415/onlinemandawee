"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImagePlus, Loader2, Trash2, Video } from "lucide-react";

import {
  GIFT_IMAGE_ACCEPT,
  GIFT_VIDEO_ACCEPT,
  MAX_GIFT_IMAGE_MB,
  MAX_GIFT_REQUEST_IMAGES,
  MAX_GIFT_REQUEST_VIDEOS,
  MAX_GIFT_VIDEO_MB,
} from "@/lib/gifts/gift-request-media.constants";
import { toast } from "@/lib/utils/toast";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { getGiftRequestFormCopy } from "@/components/gifts/copy";

export type GiftMediaAttachment = {
  url: string;
  name: string;
};

type GiftRequestMediaFieldsProps = {
  locale: SupportedLocale;
  imageUrls: GiftMediaAttachment[];
  videoUrls: GiftMediaAttachment[];
  onImageUrlsChange: (next: GiftMediaAttachment[]) => void;
  onVideoUrlsChange: (next: GiftMediaAttachment[]) => void;
  disabled?: boolean;
};

function createUploadSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `gift-${Date.now()}`;
}

async function uploadGiftMedia(
  file: File,
  kind: "image" | "video",
  sessionId: string
) {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);
  form.set("sessionId", sessionId);

  const response = await fetch("/api/gift-requests/upload", {
    method: "POST",
    body: form,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Upload failed");
  }
  return data.data as { url: string };
}

export function GiftRequestMediaFields({
  locale,
  imageUrls,
  videoUrls,
  onImageUrlsChange,
  onVideoUrlsChange,
  disabled = false,
}: GiftRequestMediaFieldsProps) {
  const copy = getGiftRequestFormCopy(locale);
  const [sessionId] = useState(createUploadSessionId);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const canAddImage = imageUrls.length < MAX_GIFT_REQUEST_IMAGES;
  const canAddVideo = videoUrls.length < MAX_GIFT_REQUEST_VIDEOS;

  const imageHint = useMemo(
    () =>
      copy.mediaImagesHint
        .replace("{max}", String(MAX_GIFT_REQUEST_IMAGES))
        .replace("{size}", String(MAX_GIFT_IMAGE_MB)),
    [copy.mediaImagesHint]
  );

  const videoHint = useMemo(
    () =>
      copy.mediaVideosHint
        .replace("{max}", String(MAX_GIFT_REQUEST_VIDEOS))
        .replace("{size}", String(MAX_GIFT_VIDEO_MB)),
    [copy.mediaVideosHint]
  );

  const handleImageSelect = async (file: File) => {
    if (!canAddImage) {
      toast.error(copy.mediaImageLimit);
      return;
    }
    setUploadingImage(true);
    try {
      const result = await uploadGiftMedia(file, "image", sessionId);
      onImageUrlsChange([...imageUrls, { url: result.url, name: file.name }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.mediaUploadFailed);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoSelect = async (file: File) => {
    if (!canAddVideo) {
      toast.error(copy.mediaVideoLimit);
      return;
    }
    setUploadingVideo(true);
    try {
      const result = await uploadGiftMedia(file, "video", sessionId);
      onVideoUrlsChange([...videoUrls, { url: result.url, name: file.name }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.mediaUploadFailed);
    } finally {
      setUploadingVideo(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-sm font-medium text-neutral-700">{copy.mediaImagesLabel}</p>
        <p className="mb-3 text-xs text-neutral-500">{imageHint}</p>

        {imageUrls.length > 0 ? (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imageUrls.map((item, index) => (
              <div
                key={item.url}
                className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
              >
                <Image
                  src={item.url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 200px"
                />
                <button
                  type="button"
                  disabled={disabled || uploadingImage}
                  onClick={() =>
                    onImageUrlsChange(imageUrls.filter((_, itemIndex) => itemIndex !== index))
                  }
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label={copy.mediaRemove}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-[#0f3460]/40 hover:bg-[#0f3460]/5 ${
            disabled || uploadingImage || !canAddImage ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploadingImage ? copy.mediaUploading : copy.mediaAddImage}
          <input
            type="file"
            accept={GIFT_IMAGE_ACCEPT}
            className="sr-only"
            disabled={disabled || uploadingImage || !canAddImage}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleImageSelect(file);
            }}
          />
        </label>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-neutral-700">{copy.mediaVideosLabel}</p>
        <p className="mb-3 text-xs text-neutral-500">{videoHint}</p>

        {videoUrls.length > 0 ? (
          <div className="mb-3 space-y-3">
            {videoUrls.map((item, index) => (
              <div
                key={item.url}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
              >
                <video
                  src={item.url}
                  controls
                  playsInline
                  className="max-h-56 w-full bg-black"
                />
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <p className="truncate text-xs text-neutral-600">{item.name}</p>
                  <button
                    type="button"
                    disabled={disabled || uploadingVideo}
                    onClick={() =>
                      onVideoUrlsChange(videoUrls.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {copy.mediaRemove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-[#0f3460]/40 hover:bg-[#0f3460]/5 ${
            disabled || uploadingVideo || !canAddVideo ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploadingVideo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          {uploadingVideo ? copy.mediaUploading : copy.mediaAddVideo}
          <input
            type="file"
            accept={GIFT_VIDEO_ACCEPT}
            className="sr-only"
            disabled={disabled || uploadingVideo || !canAddVideo}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleVideoSelect(file);
            }}
          />
        </label>
      </div>
    </div>
  );
}
