import { SearchX, Sparkles } from "lucide-react";

type ProductsEmptyStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  onClearFilters: () => void;
};

export function ProductsEmptyState({
  title,
  description,
  actionLabel,
  onClearFilters,
}: ProductsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgba(15,52,96,0.04)] sm:py-20">
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0f3460]/8 text-[#0f3460]">
          <SearchX className="h-9 w-9" />
        </div>
        <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md">
          <Sparkles className="h-4 w-4" />
        </span>
      </div>
      <h3 className="text-xl font-bold tracking-tight text-[#0f3460] sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
        {description}
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-primary/90"
      >
        {actionLabel}
      </button>
    </div>
  );
}
