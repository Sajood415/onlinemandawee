"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";

import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { getProductReviewsCopy } from "@/components/products/product-reviews-copy";
import type { Role } from "@/domain/auth/role";
import { useAuth } from "@/store/auth-context";

const REVIEW_AUTHOR_ROLES: Role[] = ["CUSTOMER", "VENDOR", "ADMIN"];

function hasStoredAccessToken() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken")?.trim();
}

function isAuthErrorMessage(message: string) {
  return /authorization|session|sign in|token|permission|expired/i.test(message);
}

type ProductReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
};

type ReviewsResponse = {
  reviews: ProductReview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  ratingAverage?: number;
  reviewCount?: number;
};

type ProductReviewsProps = {
  productId: string;
  locale: SupportedLocale;
  ratingAverage?: number;
  reviewCount?: number;
  onSummaryChange?: (summary: { ratingAverage: number; reviewCount: number }) => void;
};

const localeForDate: Record<SupportedLocale, string> = {
  en: "en-US",
  ps: "ps-AF",
  "fa-AF": "fa-AF",
};

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= (hovered || value);
        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 disabled:cursor-not-allowed"
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
          >
            <Star
              className={`h-6 w-6 transition ${
                filled ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"
              }`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

function StarsRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${cls} ${
            index < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-neutral-200 text-neutral-200"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function ProductReviews({
  productId,
  locale,
  ratingAverage = 0,
  reviewCount = 0,
  onSummaryChange,
}: ProductReviewsProps) {
  const copy = getProductReviewsCopy(locale);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const canReview =
    !isLoading &&
    isAuthenticated &&
    !!user &&
    REVIEW_AUTHOR_ROLES.includes(user.role) &&
    hasStoredAccessToken();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [avg, setAvg] = useState(ratingAverage);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAvg(ratingAverage);
  }, [ratingAverage]);

  const loadReviews = useCallback(
    async (targetPage: number) => {
      const response = await fetch(
        `/api/catalog/products/${productId}/reviews?page=${targetPage}&pageSize=10`,
      );
      const data = await parseApiResponse<ReviewsResponse>(response);
      setReviews((current) =>
        targetPage === 1 ? data.reviews : [...current, ...data.reviews],
      );
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      if (typeof data.ratingAverage === "number" && typeof data.reviewCount === "number") {
        setAvg(data.ratingAverage);
        onSummaryChange?.({
          ratingAverage: data.ratingAverage,
          reviewCount: data.reviewCount,
        });
      } else {
        onSummaryChange?.({
          ratingAverage: 0,
          reviewCount: data.total,
        });
      }
    },
    [onSummaryChange, productId],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadReviews(1)
      .catch(() => {
        if (mounted) {
          setReviews([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadReviews]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await loadReviews(page + 1);
    } catch {
      toast.error(copy.submitFailed);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating < 1) {
      toast.error(copy.ratingRequired);
      return;
    }
    if (comment.trim().length < 5) {
      toast.error(copy.commentTooShort);
      return;
    }

    if (!hasStoredAccessToken()) {
      logout();
      toast.error(copy.sessionExpired);
      return;
    }

    setSubmitting(true);
    try {
      await fetchWithAuth(`/api/catalog/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      setRating(0);
      setComment("");
      toast.success(copy.submitSuccess);
      await loadReviews(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.submitFailed;
      if (isAuthErrorMessage(message)) {
        logout();
        toast.error(copy.sessionExpired);
        return;
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDates = useMemo(
    () => new Intl.DateTimeFormat(localeForDate[locale], { dateStyle: "medium" }),
    [locale],
  );

  const displayCount = total || reviewCount;

  return (
    <section id="reviews" className="border-t border-neutral-200 pt-8">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-[1.75rem]">
        {copy.title}
      </h2>

      {displayCount > 0 || avg > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold tabular-nums text-neutral-900">
              {avg > 0 ? avg.toFixed(1) : "—"}
            </span>
            <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
          </div>
          <p className="text-sm text-neutral-600">
            {copy.itemAverage}
            {displayCount > 0 ? ` (${copy.reviewsCount(displayCount)})` : ""}
          </p>
        </div>
      ) : null}

      {canReview ? (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-neutral-900">{copy.writeReview}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-neutral-700">{copy.yourRating}</p>
              <StarPicker value={rating} onChange={setRating} disabled={submitting} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-neutral-700">{copy.yourReview}</p>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={submitting}
                placeholder={copy.placeholder}
                className="min-h-[100px] w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15 disabled:bg-neutral-100"
                maxLength={1000}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? copy.submitting : copy.submit}
            </button>
          </form>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.loading}
        </div>
      ) : reviews.length === 0 ? (
        <p className="mt-5 text-sm text-neutral-500">{copy.empty}</p>
      ) : (
        <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
          {reviews.map((review) => (
            <article key={review.id} className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StarsRow rating={review.rating} />
                  <span className="text-sm font-semibold tabular-nums text-neutral-900">
                    {review.rating}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                    {copy.thisItem}
                  </span>
                </div>
                <div className="text-sm text-neutral-500">
                  <span className="font-medium text-neutral-800">{review.reviewerName}</span>
                  <span className="mx-1.5 text-neutral-300">·</span>
                  <time dateTime={review.createdAt}>
                    {formattedDates.format(new Date(review.createdAt))}
                  </time>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {review.comment}
              </p>
            </article>
          ))}
        </div>
      )}

      {!loading && page < totalPages ? (
        <button
          type="button"
          onClick={() => void handleLoadMore()}
          disabled={loadingMore}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-white disabled:opacity-60"
        >
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {copy.loadMore}
        </button>
      ) : null}
    </section>
  );
}
