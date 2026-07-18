"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, Loader2, Search, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type AdminProductReviewRow = {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  reviewerName: string;
  reviewerEmail: string;
  product: { id: string; name: string; slug: string };
};

type ReviewsResponse = {
  reviews: AdminProductReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const RATING_FILTERS: Array<0 | 1 | 2 | 3 | 4 | 5> = [0, 5, 4, 3, 2, 1];

const displayDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < rating ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export function AdminProductReviews() {
  const t = useTranslations("AdminPages.reviews");
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [reviews, setReviews] = useState<AdminProductReviewRow[]>([]);
  const [ratingFilter, setRatingFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const toErrorMessage = useCallback(
    (error: unknown) =>
      error instanceof Error && error.message ? error.message : t("genericError"),
    [t]
  );

  const loadReviews = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (ratingFilter > 0) params.set("rating", String(ratingFilter));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("pageSize", "100");
      const response = await fetchWithAuth(`/api/admin/product-reviews?${params.toString()}`);
      const data = await parseApiResponse<ReviewsResponse>(response);
      setReviews(data.reviews);
    } catch (error) {
      toast.error(t("loadError"), toErrorMessage(error));
    } finally {
      setLoadingList(false);
    }
  }, [ratingFilter, searchQuery, t, toErrorMessage]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadReviews();
    }
  }, [authLoading, user, loadReviews]);

  const handleToggleHidden = async (review: AdminProductReviewRow) => {
    setActionId(review.id);
    try {
      const response = await fetchWithAuth(`/api/admin/product-reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !review.isHidden }),
      });
      const updated = await parseApiResponse<AdminProductReviewRow>(response);
      setReviews((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      toast.success(updated.isHidden ? t("hiddenToast") : t("publishedToast"));
    } catch (error) {
      toast.error(t("updateFailed"), toErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (review: AdminProductReviewRow) => {
    const confirmed = window.confirm(t("deleteConfirm", { name: review.reviewerName }));
    if (!confirmed) return;

    setActionId(review.id);
    try {
      await fetchWithAuth(`/api/admin/product-reviews/${review.id}`, { method: "DELETE" });
      setReviews((current) => current.filter((row) => row.id !== review.id));
      toast.success(t("deletedToast"));
    } catch (error) {
      toast.error(t("deleteFailed"), toErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const columns = useMemo<ColumnDef<AdminProductReviewRow>[]>(
    () => [
      {
        accessorKey: "product",
        header: t("columns.product"),
        cell: ({ row }) => (
          <p className="max-w-[220px] truncate font-medium text-neutral-900">
            {row.original.product.name}
          </p>
        ),
      },
      {
        accessorKey: "rating",
        header: t("columns.rating"),
        cell: ({ row }) => <RatingStars rating={row.original.rating} />,
      },
      {
        accessorKey: "comment",
        header: t("columns.comment"),
        cell: ({ row }) => (
          <p className="max-w-[320px] truncate text-neutral-700">{row.original.comment}</p>
        ),
      },
      {
        accessorKey: "reviewerName",
        header: t("columns.reviewer"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.reviewerName}</p>
            <p className="text-xs text-neutral-500">{row.original.reviewerEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "isHidden",
        header: t("columns.status"),
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              row.original.isHidden
                ? "bg-neutral-200 text-neutral-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {row.original.isHidden ? t("hidden") : t("published")}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("columns.submitted"),
        cell: ({ row }) => (
          <span className="text-sm text-neutral-600">{displayDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={actionId === row.original.id}
              onClick={() => void handleToggleHidden(row.original)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-[#0f3460]/30 hover:bg-[#0f3460]/5 disabled:opacity-60"
            >
              {row.original.isHidden ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              {row.original.isHidden ? t("publish") : t("hide")}
            </button>
            <button
              type="button"
              disabled={actionId === row.original.id}
              onClick={() => void handleDelete(row.original)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("delete")}
            </button>
          </div>
        ),
      },
    ],
    [actionId, t]
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0f3460]/15 bg-[#0f3460]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]">
          <Star className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {RATING_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRatingFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                ratingFilter === value
                  ? "bg-[#0f3460] text-white"
                  : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {value === 0 ? t("all") : t("stars", { count: value })}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
          />
        </div>
      </div>

      {loadingList ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <DataTable
          data={reviews}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage={t("empty")}
        />
      )}
    </div>
  );
}
