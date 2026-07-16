"use client";

import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { QuantitySelector } from "@/components/cart/QuantitySelector";
import { Link } from "@/i18n/navigation";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";
import { localizeDelivery, type SupportedLocale } from "@/lib/localization/product-vendor";
import { useCurrency } from "@/store/currency-context";

export type CartLineItemData = {
  id: string;
  productId: string;
  quantity: number;
  productName: string;
  productDescription?: string;
  productPrice: number;
  productCurrency?: string;
  productImage: string;
  vendor: string;
  delivery?: string;
  variantName?: string;
};

type CartLineItemProps = {
  item: CartLineItemData;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  busy?: boolean;
};

export function CartLineItem({
  item,
  onUpdateQuantity,
  onRemove,
  busy = false,
}: CartLineItemProps) {
  const locale = useLocale() as SupportedLocale;
  const copy = useCartCopy();
  const { currency, formatPrice, convertPrice } = useCurrency();
  const fromCurrency = item.productCurrency ?? "USD";
  const unitDisplay = formatPrice(item.productPrice, fromCurrency);
  const lineTotal = convertPrice(item.productPrice, fromCurrency) * item.quantity;
  const lineTotalDisplay = formatPrice(lineTotal, currency);

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="list-none py-5 sm:py-6"
    >
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_7rem_6.5rem] sm:items-center sm:gap-x-5">
        <Link
          href={`/products/${item.productId}`}
          className="relative aspect-square w-full overflow-hidden bg-neutral-50"
        >
          <CatalogImage
            src={item.productImage}
            alt={item.productName}
            fill
            className="object-contain p-1.5"
            sizes="88px"
          />
        </Link>

        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
            {item.vendor}
          </p>
          <Link
            href={`/products/${item.productId}`}
            className="mt-0.5 block text-sm font-semibold leading-snug text-neutral-900 transition hover:text-[#0F3460] sm:text-[15px]"
          >
            <span className="line-clamp-2">{item.productName}</span>
          </Link>
          {item.variantName ? (
            <p className="mt-0.5 text-xs text-neutral-500">{item.variantName}</p>
          ) : null}
          <p className="mt-1 text-xs text-neutral-500">
            {unitDisplay}
            {item.delivery ? ` · ${localizeDelivery(item.delivery, locale)}` : ""}
          </p>

          <div className="mt-3 flex items-center gap-4 sm:hidden">
            <QuantitySelector
              quantity={item.quantity}
              disabled={busy}
              compact
              onDecrease={() => onUpdateQuantity(item.quantity - 1)}
              onIncrease={() => onUpdateQuantity(item.quantity + 1)}
            />
            <p className="ms-auto text-sm font-bold text-neutral-900">{lineTotalDisplay}</p>
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 transition hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            {copy.remove}
          </button>
        </div>

        <div className="hidden justify-center sm:flex">
          <QuantitySelector
            quantity={item.quantity}
            disabled={busy}
            compact
            onDecrease={() => onUpdateQuantity(item.quantity - 1)}
            onIncrease={() => onUpdateQuantity(item.quantity + 1)}
          />
        </div>

        <p className="hidden text-end text-sm font-bold tabular-nums text-neutral-900 sm:block">
          {lineTotalDisplay}
        </p>
      </div>
    </motion.li>
  );
}
