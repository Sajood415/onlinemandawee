"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareText, Star } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { getProductReviewsCopy } from "@/components/products/product-reviews-copy";
import { useAuth } from "@/store/auth-context";

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
};

type ProductReviewsProps = {
  productId: string;
  locale: SupportedLocale;
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

export function ProductReviews({ productId, locale }: ProductReviewsProps) {
  const copy = getProductReviewsCopy(locale);
  const { user, isAuthenticated } = useAuth();
  const canReview = isAuthenticated && user?.role === "CUSTOMER";

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(
    async (targetPage: number) => {
      const response = await fetch(
        `/api/catalog/products/${productId}/reviews?page=${targetPage}&pageSize=10`
      );
      const data = await parseApiResponse<ReviewsResponse>(response);
      setReviews((current) =>
        targetPage === 1 ? data.reviews : [...current, ...data.reviews]
      );
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    },
    [productId]
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
      toast.error(copy.submitFailed);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithAuth(`/api/catalog/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      const created = await parseApiResponse<ProductReview>(response);
      setReviews((current) => [created, ...current]);
      setTotal((current) => current + 1);
      setRating(0);
      setComment("");
      toast.success(copy.submitSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDates = useMemo(
    () => new Intl.DateTimeFormat(localeForDate[locale], { dateStyle: "medium" }),
    [locale]
  );

  return (
    <section id="reviews" className="border-t border-neutral-200 pt-8">
      <div className="mb-5 flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-[#0f3460]" />
        <h2 className="text-lg font-bold text-neutral-900">
          {copy.title} {total > 0 ? `(${total})` : ""}
        </h2>
      </div>

      <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        {canReview ? (
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
                className="min-h-[100px] w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/15 disabled:bg-neutral-100"
                maxLength={1000}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? copy.submitting : copy.submit}
            </button>
          </form>
        ) : (
          <p className="text-sm text-neutral-600">
            <Link href="/auth/login" className="font-semibold text-[#0f3460] hover:underline">
              {copy.loginPrompt}
            </Link>
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.loading}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-neutral-500">{copy.empty}</p>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <article key={review.id} className="border-b border-neutral-100 pb-5 last:border-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${
                        index < review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-neutral-200 text-neutral-200"
                      }`}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-neutral-900">
                  {review.reviewerName}
                </span>
                <span className="text-xs text-neutral-400">
                  {formattedDates.format(new Date(review.createdAt))}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {review.comment}
              </p>
            </article>
          ))}

          {page < totalPages ? (
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {copy.loadMore}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
