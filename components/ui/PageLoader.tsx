"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type PageLoaderProps = {
  message?: string;
  className?: string;
  fullScreen?: boolean;
  minHeightClass?: string;
};

export function PageLoader({
  message,
  className = "",
  fullScreen = false,
  minHeightClass = "min-h-[60vh]",
}: PageLoaderProps) {
  const t = useTranslations("Common");
  const label = message ?? t("loading");

  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-3 bg-neutral-50 px-4 ${
        fullScreen ? "min-h-screen" : minHeightClass
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-neutral-500">{label}</p>
    </div>
  );
}
