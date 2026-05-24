import { Star } from "lucide-react";

type StarRatingProps = {
  rating: number;
  reviews?: number;
  size?: "sm" | "md";
  showValue?: boolean;
};

export function StarRating({
  rating,
  reviews,
  size = "sm",
  showValue = true,
}: StarRatingProps) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = index < fullStars;
          const half = !filled && hasHalf && index === fullStars;
          return (
            <Star
              key={index}
              className={`${starSize} ${
                filled || half
                  ? "fill-amber-400 text-amber-400"
                  : "fill-neutral-200 text-neutral-200"
              }`}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
      {showValue ? (
        <>
          <span className="text-xs font-semibold text-neutral-900">{rating.toFixed(1)}</span>
          {reviews !== undefined ? (
            <span className="text-xs text-neutral-500">({reviews})</span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
