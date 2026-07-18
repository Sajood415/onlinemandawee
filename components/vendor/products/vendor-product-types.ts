import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import type { ProductTranslations } from "@/lib/localization/product-content";
import {
  translationFieldsFromProduct,
  type ProductTranslationFormFields,
} from "@/components/products/product-translation-form";

export type Category = { id: string; name: string; slug: string; isActive: boolean };

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  priceAmount: number | null;
  stockQty: number;
  sku: string | null;
  isActive: boolean;
};

export type VendorProduct = {
  id: string;
  categoryId: string;
  category: { id: string; name: string };
  name: string;
  slug: string;
  description: string;
  translations?: ProductTranslations | null;
  images: string[];
  sku: string | null;
  currency: string;
  priceAmount: number;
  stockQty: number;
  approvalStatus: ProductApprovalStatus;
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
  variants?: ProductVariant[];
};

export type ImageSlot =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File; preview: string; uploading: boolean };

export type VariantFormRow = {
  localId: string;
  id?: string;
  name: string;
  priceAmount: string;
  stockQty: string;
  sku: string;
  isActive: boolean;
};

export type ProductFormState = {
  categoryId: string;
  name: string;
  description: string;
  translations: ProductTranslationFormFields;
  images: ImageSlot[];
  sku: string;
  currency: string;
  priceAmount: string;
  stockQty: string;
  isActive: boolean;
};

export const CURRENCIES = ["AFN", "USD", "AED", "SAR", "PKR", "GBP", "EUR"] as const;

export const ALL_STATUSES: ProductApprovalStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
];

export const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
export const LABEL = "block text-sm font-medium text-neutral-700";

export function emptyForm(defaultCategoryId = ""): ProductFormState {
  return {
    categoryId: defaultCategoryId,
    name: "",
    description: "",
    translations: {
      namePs: "",
      nameFa: "",
      descriptionPs: "",
      descriptionFa: "",
    },
    images: [],
    sku: "",
    currency: "USD",
    priceAmount: "",
    stockQty: "",
    isActive: true,
  };
}

export function toFormState(p: VendorProduct): ProductFormState {
  return {
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    translations: translationFieldsFromProduct(p.translations),
    images: p.images.map((url) => ({ kind: "url" as const, url })),
    sku: p.sku ?? "",
    currency: p.currency,
    priceAmount: String(p.priceAmount / 100),
    stockQty: String(p.stockQty),
    isActive: p.isActive,
  };
}

export function approvalBadgeClass(s: ProductApprovalStatus) {
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (s === "REJECTED") return "bg-red-50 text-red-700 ring-red-200";
  if (s === "ARCHIVED") return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

let rowCounter = 0;
export function newVariantRow(): VariantFormRow {
  return {
    localId: `new-${++rowCounter}`,
    name: "",
    priceAmount: "",
    stockQty: "0",
    sku: "",
    isActive: true,
  };
}

export function variantToRow(v: ProductVariant, fallbackPriceMajor = ""): VariantFormRow {
  return {
    localId: v.id,
    id: v.id,
    name: v.name,
    priceAmount:
      v.priceAmount != null ? String(v.priceAmount / 100) : fallbackPriceMajor,
    stockQty: String(v.stockQty),
    sku: v.sku ?? "",
    isActive: v.isActive,
  };
}

export function serializeFormSnapshot(
  form: ProductFormState,
  variantRows: VariantFormRow[],
  deletedVariantIds: string[]
) {
  return JSON.stringify({
    form: {
      ...form,
      images: form.images.map((slot) =>
        slot.kind === "url"
          ? { kind: "url", url: slot.url }
          : { kind: "file", name: slot.file.name, size: slot.file.size }
      ),
    },
    variantRows,
    deletedVariantIds,
  });
}
