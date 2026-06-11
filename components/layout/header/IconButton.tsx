import type { ReactNode } from "react";

type IconButtonProps = {
  children: ReactNode;
  badge?: string;
  onClick?: () => void;
  active?: boolean;
  accent?: "primary" | "secondary";
  surface?: "default" | "dark";
  size?: "sm" | "md";
  "aria-label"?: string;
};

export function IconButton({
  children,
  badge,
  onClick,
  active,
  accent = "secondary",
  surface = "default",
  size = "md",
  "aria-label": ariaLabel,
}: IconButtonProps) {
  const sizeClass = size === "sm" ? "h-9 w-9" : "h-10 w-10 sm:h-12 sm:w-12";
  const accentBgClass = accent === "primary" ? "bg-primary" : "bg-[var(--secondary)]";
  const accentTextClass = accent === "primary" ? "text-primary" : "text-[var(--secondary)]";
  const accentRingClass = accent === "primary" ? "ring-primary" : "ring-[var(--secondary)]";
  const idleSurface =
    surface === "dark"
      ? "border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/35"
      : "border-gray-100 bg-white hover:bg-gray-50 text-gray-600 hover:text-primary hover:border-primary/30";
  const badgeRing = surface === "dark" ? "ring-zinc-950" : "ring-white";

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative ${sizeClass} flex shrink-0 items-center justify-center rounded-full border transition-all duration-300 group active:scale-90 cursor-pointer ${active ? "bg-primary border-primary text-white shadow-xl shadow-primary/30" : idleSurface}`}
    >
      {children}
      {badge && (
        <span
          className={`absolute -top-1 -right-1 text-[10px] font-black min-w-5 h-5 flex items-center justify-center rounded-full ring-2 shadow-md transition-all ${active ? `bg-white ${accentTextClass} ${accentRingClass}` : `${accentBgClass} text-white ${badgeRing}`}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
