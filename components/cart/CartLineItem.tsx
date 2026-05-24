"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { getCartCopy } from "@/components/cart/copy";
import { QuantitySelector } from "@/components/cart/QuantitySelector";

export type CartLineItemData = {
  id: string;
  productId: string;
  quantity: number;
  productName: string;
  productPrice: number;
  productImage: string;
  vendor: string;
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
  const copy = getCartCopy();
  const lineTotal = item.productPrice * item.quantity;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_10px_35px_rgba(15,52,96,0.06)] transition hover:border-neutral-300 hover:shadow-[0_16px_45px_rgba(15,52,96,0.1)]"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:p-5">
        <Link
          href={`/products/${item.productId}`}
          className="relative mx-auto aspect-square h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-neutral-50 to-white sm:mx-0 sm:h-32 sm:w-32"
        >
          <CatalogImage
            src={item.productImage}
            alt={item.productName}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="128px"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0f3460]/65">
                {item.vendor}
              </p>
              <Link href={`/products/${item.productId}`}>
                <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-neutral-900 transition hover:text-[#0f3460]">
                  {item.productName}
                </h3>
              </Link>
              <p className="mt-2 text-sm text-neutral-500">
                ${item.productPrice.toFixed(2)} {copy.each}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {copy.lineTotal}
              </p>
              <p className="text-xl font-bold tracking-tight text-[#0f3460]">
                ${lineTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <QuantitySelector
              quantity={item.quantity}
              disabled={busy}
              onDecrease={() => onUpdateQuantity(item.quantity - 1)}
              onIncrease={() => onUpdateQuantity(item.quantity + 1)}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {copy.remove}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
