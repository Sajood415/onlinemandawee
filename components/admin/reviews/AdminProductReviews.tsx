"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, Loader2, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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

type VisibilityTab = "showing" | "hidden" | "all";

const RATING_FILTERS: Array<0 | 1 | 2 | 3 | 4 | 5> = [0, 5, 4, 3, 2, 1];

function formatDateLabel(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [reviews, setReviews] = useState<AdminProductReviewRow[]>([]);
  const [visibilityTab, setVisibilityTab] = useState<VisibilityTab>("all");
  const [ratingFilter, setRatingFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadReviews = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (ratingFilter > 0) params.set("rating", String(ratingFilter));
      if (searchQuery) params.set("search", searchQuery);
      if (visibilityTab === "showing") params.set("isHidden", "false");
      if (visibilityTab === "hidden") params.set("isHidden", "true");
      params.set("pageSize", "100");
      const response = await fetchWithAuth(`/api/admin/product-reviews?${params.toString()}`);
      const data = await parseApiResponse<ReviewsResponse>(response);
      setReviews(data.reviews);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadError"));
    } finally {
      setLoadingList(false);
    }
  }, [ratingFilter, searchQuery, visibilityTab, t]);

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
      setReviews((current) => {
        const next = current.map((row) => (row.id === updated.id ? updated : row));
        if (visibilityTab === "showing") return next.filter((row) => !row.isHidden);
        if (visibilityTab === "hidden") return next.filter((row) => row.isHidden);
        return next;
      });
      toast.success(updated.isHidden ? t("hiddenToast") : t("shownToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateFailed"));
    } finally {
      setActionId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionId(deleteTarget.id);
    try {
      await fetchWithAuth(`/api/admin/product-reviews/${deleteTarget.id}`, { method: "DELETE" });
      setReviews((current) => current.filter((row) => row.id !== deleteTarget.id));
      toast.success(t("deletedToast"));
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
    } finally {
      setDeleting(false);
      setActionId(null);
    }
  };

  const columns = useMemo<ColumnDef<AdminProductReviewRow>[]>(
    () => [
      {
        accessorKey: "product",
        header: t("columns.product"),
        cell: ({ row }) => (
          <p className="max-w-[220px] truncate font-medium text-neutral-900" title={row.original.product.name}>
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
          <p className="max-w-[320px] truncate text-neutral-700" title={row.original.comment}>
            {row.original.comment}
          </p>
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
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              row.original.isHidden
                ? "bg-neutral-200 text-neutral-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {row.original.isHidden ? t("hidden") : t("showing")}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("columns.date"),
        cell: ({ row }) => (
          <span className="text-sm text-neutral-600">
            {formatDateLabel(row.original.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("columns.actions"),
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
              {row.original.isHidden ? t("show") : t("hide")}
            </button>
            <button
              type="button"
              disabled={actionId === row.original.id}
              onClick={() => setDeleteTarget(row.original)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("delete")}
            </button>
          </div>
        ),
      },
    ],
    [actionId, locale, t]
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const tabs: { id: VisibilityTab; label: string }[] = [
    { id: "showing", label: t("tabs.showing") },
    { id: "hidden", label: t("tabs.hidden") },
    { id: "all", label: t("tabs.all") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadReviews()}
          disabled={loadingList}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setVisibilityTab(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              visibilityTab === tab.id
                ? "border-[#0f3460] text-[#0f3460]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {RATING_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRatingFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                ratingFilter === value
                  ? "bg-[#0f3460] text-white"
                  : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {value === 0 ? t("allStars") : t("stars", { count: value })}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
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

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">{t("deleteModal.title")}</h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t("deleteModal.body", { name: deleteTarget.reviewerName })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {deleting ? t("deleteModal.deleting") : t("deleteModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
