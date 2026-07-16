"use client";

import { useTranslations } from "next-intl";

export function useCartCopy() {
  const t = useTranslations("Cart");
  const tc = useTranslations("Common");

  return {
    title: t("title"),
    subtitle: t("subtitle"),
    items: t("items"),
    item: t("item"),
    emptyTitle: t("emptyTitle"),
    emptyDescription: t("emptyDescription"),
    browseProducts: t("browseProducts"),
    continueShopping: t("continueShopping"),
    orderSummary: t("orderSummary"),
    subtotal: t("subtotal"),
    shipping: t("shipping"),
    shippingFree: t("shippingFree"),
    shippingCalculated: t("shippingCalculated"),
    tax: t("tax"),
    total: t("total"),
    deliveryEstimate: t("deliveryEstimate"),
    deliveryWindow: t("deliveryWindow"),
    deliveryNote: t("deliveryNote"),
    checkout: t("checkout"),
    secureCheckout: t("secureCheckout"),
    remove: t("remove"),
    each: t("each"),
    lineTotal: t("lineTotal"),
    columnProduct: t("columnProduct"),
    columnQty: t("columnQty"),
    recommended: t("recommended"),
    loading: tc("loadingCart"),
  };
}
