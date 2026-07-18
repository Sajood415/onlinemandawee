"use client";

import { ImageIcon, Loader2, Pencil, SendHorizonal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  approvalBadgeClass,
  type VendorProduct,
} from "@/components/vendor/products/vendor-product-types";
import {
  formatProductPriceRangeMinor,
  resolveProductPriceRangeMinor,
} from "@/lib/products/resolve-checkout-variant";

type StockTone = "danger" | "warn" | "ok";

type VendorProductListCardsProps = {
  products: VendorProduct[];
  submittingId: string | null;
  deletingId: string | null;
  stockLabel: (product: VendorProduct) => { label: string; tone: StockTone };
  onEdit: (product: VendorProduct) => void;
  onArchive: (productId: string) => void;
  onSubmit: (productId: string) => void;
};

export function VendorProductListCards({
  products,
  submittingId,
  deletingId,
  stockLabel,
  onEdit,
  onArchive,
  onSubmit,
}: VendorProductListCardsProps) {
  const t = useTranslations("VendorPages.products");

  return (
    <ul className="divide-y divide-neutral-100 md:hidden">
      {products.map((product) => {
        const stock = stockLabel(product);
        const range = resolveProductPriceRangeMinor({
          basePriceAmount: product.priceAmount,
          variants: product.variants,
        });
        const price = formatProductPriceRangeMinor(
          range,
          product.currency || "USD"
        );
        const canSubmit =
          product.approvalStatus === "DRAFT" ||
          product.approvalStatus === "REJECTED";

        return (
          <li key={product.id} className="px-4 py-4">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="flex w-full items-start gap-3 text-start"
            >
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0]}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                  <ImageIcon className="h-6 w-6 text-neutral-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">
                  {product.name}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#0f3460]">
                  {price}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${approvalBadgeClass(product.approvalStatus)}`}
                  >
                    {t(`statuses.${product.approvalStatus}`)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                      stock.tone === "danger"
                        ? "bg-red-50 text-red-700 ring-red-200"
                        : stock.tone === "warn"
                          ? "bg-amber-50 text-amber-800 ring-amber-200"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    }`}
                  >
                    {stock.label}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                      product.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-neutral-100 text-neutral-600 ring-neutral-200"
                    }`}
                  >
                    {product.isActive
                      ? t("visibility.active")
                      : t("visibility.inactive")}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-500">
                  {product.category?.name ?? "—"}
                </p>
                {product.approvalStatus === "REJECTED" &&
                product.rejectionReason ? (
                  <p className="mt-1 line-clamp-2 text-xs text-red-600">
                    {product.rejectionReason}
                  </p>
                ) : null}
              </div>
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              {canSubmit ? (
                <button
                  type="button"
                  disabled={submittingId === product.id}
                  onClick={() => onSubmit(product.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  {submittingId === product.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-3.5 w-3.5" />
                  )}
                  {t("actions.submit")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("actions.edit")}
              </button>
              <button
                type="button"
                disabled={deletingId === product.id}
                onClick={() => onArchive(product.id)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {deletingId === product.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {t("actions.archive")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
