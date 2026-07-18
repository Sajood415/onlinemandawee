"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageIcon, Loader2, Pencil, Plus, Search, SendHorizonal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import {
  buildTranslationsPayload,
  type ProductTranslationFormFields,
} from "@/components/products/product-translation-form";
import { DataTable } from "@/components/ui/data-table";
import { VendorConfirmDialog } from "@/components/vendor/products/VendorConfirmDialog";
import { VendorProductFormModal } from "@/components/vendor/products/VendorProductFormModal";
import { VendorProductListCards } from "@/components/vendor/products/VendorProductListCards";
import {
  ALL_STATUSES,
  approvalBadgeClass,
  emptyForm,
  newVariantRow,
  serializeFormSnapshot,
  toFormState,
  variantToRow,
  type Category,
  type ImageSlot,
  type ProductFormState,
  type ProductVariant,
  type VariantFormRow,
  type VendorProduct,
} from "@/components/vendor/products/vendor-product-types";
import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  deriveProductFieldsFromVariantPrices,
  getNamedVariantRows,
  parseVariantPriceMinor,
} from "@/lib/products/derive-variant-product-fields";
import {
  getActiveStockVariants,
  usesVariantStock,
} from "@/lib/products/product-stock";
import {
  formatProductPriceRangeMinor,
  resolveProductPriceRangeMinor,
} from "@/lib/products/resolve-checkout-variant";
import { toast } from "@/lib/utils/toast";

export default function VendorProductsPage() {
  const t = useTranslations("VendorPages.products");
  const { isLoading: authLoading, user } = useDashboardGuard("VENDOR");

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const snapshotRef = useRef("");
  const [discardOpen, setDiscardOpen] = useState(false);

  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);

  const [variantRows, setVariantRows] = useState<VariantFormRow[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProductApprovalStatus | "">("");

  const isEdit = Boolean(editingProductId);
  const editingProduct =
    products.find((p) => p.id === editingProductId) ?? null;
  const showBasePricingFields = variantRows.length === 0;
  const wasLiveOnOpen =
    isEdit && editingProduct?.approvalStatus === "APPROVED";

  const isDirty = () =>
    serializeFormSnapshot(form, variantRows, deletedVariantIds) !==
    snapshotRef.current;

  const captureSnapshot = (
    nextForm: ProductFormState,
    nextVariants: VariantFormRow[],
    nextDeleted: string[]
  ) => {
    snapshotRef.current = serializeFormSnapshot(
      nextForm,
      nextVariants,
      nextDeleted
    );
  };

  const addVariantRow = () => {
    setVariantRows((rows) => {
      if (rows.length === 0) {
        const row = newVariantRow();
        if (form.priceAmount.trim()) row.priceAmount = form.priceAmount;
        if (form.stockQty.trim()) row.stockQty = form.stockQty;
        if (form.sku.trim()) row.sku = form.sku;
        return [row];
      }
      return [...rows, newVariantRow()];
    });
  };

  const fetchData = useCallback(
    async (silent = false) => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [pr, cr] = await Promise.all([
          fetch("/api/vendor/products", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/catalog/categories"),
        ]);
        const [pd, cd] = await Promise.all([
          parseApiResponse<VendorProduct[]>(pr),
          parseApiResponse<Category[]>(cr),
        ]);
        setProducts(pd);
        setCategories(cd.filter((c) => c.isActive));
      } catch (e) {
        setError(e instanceof Error ? e.message : t("loadError"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!authLoading && user) void fetchData();
  }, [authLoading, user, fetchData]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchData(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  const openCreate = () => {
    const next = emptyForm(categories[0]?.id ?? "");
    setEditingProductId(null);
    setForm(next);
    setVariantRows([]);
    setDeletedVariantIds([]);
    setVariantsError(null);
    captureSnapshot(next, [], []);
    setModalOpen(true);
  };

  const openEdit = (product: VendorProduct) => {
    const next = toFormState(product);
    setEditingProductId(product.id);
    setForm(next);
    setVariantRows([]);
    setDeletedVariantIds([]);
    setVariantsError(null);
    captureSnapshot(next, [], []);
    setModalOpen(true);
  };

  const forceCloseModal = () => {
    setModalOpen(false);
    setEditingProductId(null);
    setVariantRows([]);
    setDeletedVariantIds([]);
    setVariantsError(null);
    setDiscardOpen(false);
  };

  const requestCloseModal = () => {
    if (isDirty()) {
      setDiscardOpen(true);
      return;
    }
    forceCloseModal();
  };

  const updateField = <K extends keyof ProductFormState>(
    k: K,
    v: ProductFormState[K]
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  const updateTranslationField = <K extends keyof ProductTranslationFormFields>(
    key: K,
    value: ProductTranslationFormFields[K]
  ) =>
    setForm((prev) => ({
      ...prev,
      translations: { ...prev.translations, [key]: value },
    }));

  const addImageSlot = () =>
    updateField("images", [...form.images, { kind: "url", url: "" }]);

  const removeImageSlot = (i: number) => {
    const removed = form.images[i];
    if (removed.kind === "file") URL.revokeObjectURL(removed.preview);
    updateField(
      "images",
      form.images.filter((_, idx) => idx !== i)
    );
  };

  const updateUrlSlot = (i: number, url: string) =>
    setForm((prev) => {
      const next = [...prev.images];
      next[i] = { kind: "url", url };
      return { ...prev, images: next };
    });

  const handleFilePick = (files: FileList | null) => {
    if (!files) return;
    const slots: ImageSlot[] = Array.from(files).map((file) => ({
      kind: "file" as const,
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }));
    updateField("images", [...form.images, ...slots]);
  };

  const uploadFileSlot = async (
    slot: Extract<ImageSlot, { kind: "file" }>,
    index: number,
    token: string
  ): Promise<string> => {
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = { ...slot, uploading: true };
      return { ...prev, images: next };
    });
    const fd = new FormData();
    fd.set("file", slot.file);
    const res = await fetch("/api/vendor/products/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await parseApiResponse<{ url: string }>(res);
    setForm((prev) => {
      const next = [...prev.images];
      URL.revokeObjectURL(slot.preview);
      next[index] = { kind: "url", url: data.url };
      return { ...prev, images: next };
    });
    return data.url;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!form.categoryId) {
      toast.error(t("toasts.validationTitle"), t("toasts.categoryRequired"));
      return;
    }
    if (form.name.trim().length < 2) {
      toast.error(t("toasts.validationTitle"), t("toasts.nameShort"));
      return;
    }
    if (form.description.trim().length < 10) {
      toast.error(t("toasts.validationTitle"), t("toasts.descriptionShort"));
      return;
    }

    if (variantRows.length > 0 && getNamedVariantRows(variantRows).length === 0) {
      toast.error(t("toasts.validationTitle"), t("toasts.variantIncomplete"));
      return;
    }

    const namedVariantRows = getNamedVariantRows(variantRows);
    const hasVariants = namedVariantRows.length > 0;

    let priceAmount: number;
    let stockQty: number;

    if (hasVariants) {
      const variantPricesMinor: number[] = [];
      for (const row of namedVariantRows) {
        const variantPriceMinor = parseVariantPriceMinor(row.priceAmount);
        if (variantPriceMinor == null) {
          toast.error(
            t("toasts.validationTitle"),
            t("toasts.variantPrice", { name: row.name.trim() })
          );
          return;
        }
        const variantStock = Number(row.stockQty);
        if (!Number.isInteger(variantStock) || variantStock < 0) {
          toast.error(
            t("toasts.validationTitle"),
            t("toasts.variantStock", { name: row.name.trim() })
          );
          return;
        }
        variantPricesMinor.push(variantPriceMinor);
      }

      const derived = deriveProductFieldsFromVariantPrices(variantPricesMinor);
      priceAmount = derived.priceAmount;
      stockQty = derived.stockQty;
    } else {
      const priceRaw = Number(form.priceAmount);
      if (!Number.isFinite(priceRaw) || priceRaw <= 0) {
        toast.error(t("toasts.validationTitle"), t("toasts.invalidPrice"));
        return;
      }
      priceAmount = Math.round(priceRaw * 100);

      stockQty = Number(form.stockQty);
      if (!Number.isInteger(stockQty) || stockQty < 0) {
        toast.error(t("toasts.validationTitle"), t("toasts.invalidStock"));
        return;
      }
    }

    setSaving(true);
    try {
      const resolvedUrls: string[] = [];
      for (let i = 0; i < form.images.length; i++) {
        const slot = form.images[i];
        if (slot.kind === "file") {
          resolvedUrls.push(await uploadFileSlot(slot, i, token));
        } else if (slot.url.trim()) {
          resolvedUrls.push(slot.url.trim());
        }
      }
      if (!resolvedUrls.length) {
        toast.error(t("toasts.validationTitle"), t("toasts.imagesRequired"));
        setSaving(false);
        return;
      }

      const payload: Record<string, unknown> = {
        categoryId: form.categoryId,
        name: form.name.trim(),
        description: form.description.trim(),
        images: resolvedUrls,
        currency: form.currency.trim().toUpperCase() || "USD",
        priceAmount,
        stockQty,
      };
      if (!hasVariants && form.sku.trim()) payload.sku = form.sku.trim();
      if (isEdit) payload.isActive = form.isActive;

      const translations = buildTranslationsPayload(form.translations);
      if (translations) payload.translations = translations;

      const res = await fetch(
        isEdit
          ? `/api/vendor/products/${editingProductId}`
          : "/api/vendor/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const savedProduct = await parseApiResponse<VendorProduct>(res);
      const productId = savedProduct.id;

      const jsonHeaders = { "Content-Type": "application/json" };
      let variantSaveErrors = 0;

      for (const variantId of deletedVariantIds) {
        try {
          const delRes = await fetchWithAuth(
            `/api/vendor/products/${productId}/variants/${variantId}`,
            { method: "DELETE" }
          );
          await parseApiResponse<null>(delRes);
        } catch {
          variantSaveErrors++;
        }
      }

      for (const row of variantRows) {
        if (!row.name.trim()) continue;
        const variantPriceMinor = parseVariantPriceMinor(row.priceAmount);
        const variantPayload = {
          name: row.name.trim(),
          priceAmount: variantPriceMinor,
          stockQty: Math.max(0, Number(row.stockQty) || 0),
          sku: row.sku.trim() || null,
          isActive: row.isActive,
        };
        try {
          const variantRes = row.id
            ? await fetchWithAuth(
                `/api/vendor/products/${productId}/variants/${row.id}`,
                {
                  method: "PATCH",
                  headers: jsonHeaders,
                  body: JSON.stringify(variantPayload),
                }
              )
            : await fetchWithAuth(
                `/api/vendor/products/${productId}/variants`,
                {
                  method: "POST",
                  headers: jsonHeaders,
                  body: JSON.stringify(variantPayload),
                }
              );
          await parseApiResponse<ProductVariant>(variantRes);
        } catch {
          variantSaveErrors++;
        }
      }

      if (variantSaveErrors > 0) {
        toast.error(
          t("toasts.variantsPartialTitle"),
          t("toasts.variantsPartialBody", { count: variantSaveErrors })
        );
      }

      if (isEdit) {
        toast.success(
          t("toasts.updatedTitle"),
          wasLiveOnOpen
            ? t("toasts.updatedLiveBody")
            : t("toasts.updatedBody")
        );
      } else {
        toast.success(t("toasts.createdTitle"), t("toasts.createdBody"));
      }

      forceCloseModal();
      await fetchData(true);
    } catch (err) {
      toast.error(
        t("toasts.saveError"),
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  const onSubmitForApproval = async (productId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSubmittingId(productId);
    try {
      const res = await fetch(
        `/api/vendor/products/${productId}/submit-for-approval`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await parseApiResponse<VendorProduct>(res);
      toast.success(t("toasts.submittedTitle"), t("toasts.submittedBody"));
      await fetchData(true);
    } catch (err) {
      toast.error(
        t("toasts.submitError"),
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const onSubmitAll = async () => {
    const drafts = products.filter((p) => p.approvalStatus === "DRAFT");
    if (drafts.length === 0) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSubmittingAll(true);
    let successCount = 0;
    for (const p of drafts) {
      try {
        const res = await fetch(
          `/api/vendor/products/${p.id}/submit-for-approval`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        await parseApiResponse<VendorProduct>(res);
        successCount++;
      } catch {
        // continue
      }
    }
    if (successCount > 0) {
      toast.success(
        t("toasts.submittedAllTitle"),
        t("toasts.submittedAllBody", { count: successCount })
      );
      await fetchData(true);
    }
    setSubmittingAll(false);
  };

  const productsRef = useRef(products);
  productsRef.current = products;

  const loadVariants = useCallback(async (productId: string) => {
    setVariantsLoading(true);
    setVariantsError(null);
    try {
      const res = await fetchWithAuth(
        `/api/vendor/products/${productId}/variants`
      );
      const data = await parseApiResponse<ProductVariant[]>(res);
      const product = productsRef.current.find((entry) => entry.id === productId);
      const fallbackPriceMajor = product
        ? String(product.priceAmount / 100)
        : "";
      const rows = data.map((variant) =>
        variantToRow(variant, fallbackPriceMajor)
      );
      setVariantRows(rows);
      setDeletedVariantIds([]);
      setForm((currentForm) => {
        snapshotRef.current = serializeFormSnapshot(currentForm, rows, []);
        return currentForm;
      });
    } catch (e) {
      setVariantsError(e instanceof Error ? e.message : "Failed to load variants.");
    } finally {
      setVariantsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modalOpen && editingProductId) {
      void loadVariants(editingProductId);
    }
  }, [modalOpen, editingProductId, loadVariants]);

  const updateRow = (localId: string, patch: Partial<VariantFormRow>) =>
    setVariantRows((rows) =>
      rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r))
    );

  const removeVariantRow = (row: VariantFormRow) => {
    if (row.id) setDeletedVariantIds((ids) => [...ids, row.id!]);
    setVariantRows((rows) => rows.filter((r) => r.localId !== row.localId));
  };

  const confirmArchive = async () => {
    if (!archiveTargetId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const productId = archiveTargetId;
    setDeletingId(productId);
    try {
      const res = await fetch(`/api/vendor/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await parseApiResponse<VendorProduct>(res);
      toast.success(t("toasts.archivedTitle"), t("toasts.archivedBody"));
      setArchiveTargetId(null);
      await fetchData(true);
    } catch (err) {
      toast.error(
        t("toasts.archiveError"),
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const stockLabel = useCallback(
    (product: VendorProduct) => {
      if (usesVariantStock(product)) {
        const activeVariants = getActiveStockVariants(product);
        const total = activeVariants.reduce(
          (sum, variant) => sum + Math.max(0, variant.stockQty),
          0
        );
        const soldOutCount = activeVariants.filter(
          (variant) => variant.stockQty <= 0
        ).length;

        if (total <= 0) {
          return { label: t("stock.soldOut"), tone: "danger" as const };
        }
        if (soldOutCount > 0) {
          return {
            label:
              soldOutCount === 1
                ? t("stock.variantWarn", { count: total, soldOut: soldOutCount })
                : t("stock.variantWarnPlural", {
                    count: total,
                    soldOut: soldOutCount,
                  }),
            tone: "warn" as const,
          };
        }
        return {
          label: t("stock.inStock", { count: total }),
          tone: "ok" as const,
        };
      }

      if (product.stockQty <= 0) {
        return { label: t("stock.soldOut"), tone: "danger" as const };
      }
      return {
        label: t("stock.inStock", { count: product.stockQty }),
        tone: "ok" as const,
      };
    },
    [t]
  );

  const filtered = products.filter((p) => {
    const matchText =
      !searchText ||
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(searchText.toLowerCase());
    const matchCat = !filterCategory || p.categoryId === filterCategory;
    const matchStatus = !filterStatus || p.approvalStatus === filterStatus;
    return matchText && matchCat && matchStatus;
  });

  const filterResetKey = `${searchText}|${filterCategory}|${filterStatus}`;

  const columns = useMemo<ColumnDef<VendorProduct>[]>(
    () => [
      {
        header: t("columns.product"),
        accessorKey: "name",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center gap-3">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <ImageIcon className="h-5 w-5 text-neutral-300" />
                </div>
              )}
              <div>
                <p className="max-w-[180px] truncate font-medium text-neutral-900">
                  {product.name}
                </p>
                <p className="max-w-[180px] truncate text-xs text-neutral-400">
                  {product.description}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        header: t("columns.category"),
        id: "category",
        cell: ({ row }) => row.original.category?.name ?? "—",
      },
      {
        header: t("columns.price"),
        id: "price",
        cell: ({ row }) => {
          const product = row.original;
          const range = resolveProductPriceRangeMinor({
            basePriceAmount: product.priceAmount,
            variants: product.variants,
          });
          return formatProductPriceRangeMinor(range, product.currency || "USD");
        },
      },
      {
        header: t("columns.stock"),
        id: "stock",
        cell: ({ row }) => {
          const stock = stockLabel(row.original);
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                stock.tone === "danger"
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : stock.tone === "warn"
                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
              }`}
            >
              {stock.label}
            </span>
          );
        },
      },
      {
        header: t("columns.visibility"),
        id: "visibility",
        cell: ({ row }) => {
          const active = row.original.isActive;
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                active
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-neutral-100 text-neutral-600 ring-neutral-200"
              }`}
              title={
                active ? t("visibility.activeHint") : t("visibility.inactiveHint")
              }
            >
              {active ? t("visibility.active") : t("visibility.inactive")}
            </span>
          );
        },
      },
      {
        header: t("columns.status"),
        id: "status",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${approvalBadgeClass(product.approvalStatus)}`}
              >
                {t(`statuses.${product.approvalStatus}`)}
              </span>
              {product.approvalStatus === "REJECTED" &&
              product.rejectionReason ? (
                <p
                  className="mt-1 max-w-[180px] truncate text-xs text-red-500"
                  title={product.rejectionReason}
                >
                  {product.rejectionReason}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        header: t("columns.actions"),
        id: "actions",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div
              className="flex flex-wrap items-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {(product.approvalStatus === "DRAFT" ||
                product.approvalStatus === "REJECTED") && (
                <button
                  type="button"
                  disabled={submittingId === product.id}
                  onClick={() => void onSubmitForApproval(product.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  {submittingId === product.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-3.5 w-3.5" />
                  )}
                  {t("actions.submit")}
                </button>
              )}
              <button
                type="button"
                onClick={() => openEdit(product)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("actions.edit")}
              </button>
              <button
                type="button"
                onClick={() => setArchiveTargetId(product.id)}
                disabled={deletingId === product.id}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {deletingId === product.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {t("actions.archive")}
              </button>
            </div>
          );
        },
      },
    ],
    [t, submittingId, deletingId, stockLabel]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f3460]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-neutral-100 px-4 py-4 sm:px-6">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 rtl:left-auto rtl:right-3" />
            <input
              className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 rtl:pl-3 rtl:pr-9"
              placeholder={t("searchPlaceholder")}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
            <select
              className="w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">{t("allCategories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as ProductApprovalStatus | "")
              }
            >
              <option value="">{t("allStatuses")}</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row lg:col-span-1 lg:justify-end">
              {products.some((p) => p.approvalStatus === "DRAFT") ? (
                <button
                  type="button"
                  disabled={submittingAll}
                  onClick={() => void onSubmitAll()}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 sm:w-auto"
                >
                  {submittingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-4 w-4" />
                  )}
                  {t("submitAll")}
                </button>
              ) : null}

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                {t("addProduct")}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-neutral-600">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-neutral-400" />
            {t("loading")}
          </div>
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
              <ImageIcon className="h-7 w-7 text-neutral-300" />
            </div>
            <p className="text-sm font-medium text-neutral-700">
              {products.length === 0 ? t("empty") : t("emptyFiltered")}
            </p>
            {products.length === 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                {t("addFirst")}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <VendorProductListCards
              products={filtered}
              submittingId={submittingId}
              deletingId={deletingId}
              stockLabel={stockLabel}
              onEdit={openEdit}
              onArchive={setArchiveTargetId}
              onSubmit={(id) => void onSubmitForApproval(id)}
            />
            <div className="hidden md:block">
              <DataTable
                key={filterResetKey}
                data={filtered}
                columns={columns}
                getRowId={(row) => row.id}
                emptyMessage={t("emptyFiltered")}
                initialPageSize={10}
                pageSizeOptions={[10, 20, 50]}
                embedded
              />
            </div>
          </>
        )}
      </div>

      <VendorProductFormModal
        open={modalOpen}
        isEdit={isEdit}
        editingProduct={editingProduct}
        form={form}
        categories={categories}
        variantRows={variantRows}
        variantsLoading={variantsLoading}
        variantsError={variantsError}
        saving={saving}
        showBasePricingFields={showBasePricingFields}
        onCloseRequest={requestCloseModal}
        onSubmit={(e) => void onSubmit(e)}
        onFieldChange={updateField}
        onTranslationChange={updateTranslationField}
        onAddVariant={addVariantRow}
        onUpdateVariant={updateRow}
        onRemoveVariant={removeVariantRow}
        onRetryVariants={() =>
          editingProductId && void loadVariants(editingProductId)
        }
        onAddImageSlot={addImageSlot}
        onRemoveImageSlot={removeImageSlot}
        onUpdateUrlSlot={updateUrlSlot}
        onFilePick={handleFilePick}
      />

      <VendorConfirmDialog
        open={Boolean(archiveTargetId)}
        title={t("archive.title")}
        body={t("archive.body")}
        confirmLabel={t("archive.confirm")}
        cancelLabel={t("archive.cancel")}
        danger
        busy={Boolean(deletingId)}
        onConfirm={() => void confirmArchive()}
        onCancel={() => setArchiveTargetId(null)}
      />

      <VendorConfirmDialog
        open={discardOpen}
        title={t("discard.title")}
        body={t("discard.body")}
        confirmLabel={t("discard.confirm")}
        cancelLabel={t("discard.cancel")}
        danger
        onConfirm={forceCloseModal}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}
