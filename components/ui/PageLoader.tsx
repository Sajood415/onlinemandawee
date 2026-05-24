import { Loader2 } from "lucide-react";

type PageLoaderProps = {
  message?: string;
  className?: string;
  fullScreen?: boolean;
  minHeightClass?: string;
};

export function PageLoader({
  message = "Loading...",
  className = "",
  fullScreen = false,
  minHeightClass = "min-h-[60vh]",
}: PageLoaderProps) {
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
      {message ? (
        <p className="text-sm font-medium text-neutral-500">{message}</p>
      ) : null}
    </div>
  );
}
