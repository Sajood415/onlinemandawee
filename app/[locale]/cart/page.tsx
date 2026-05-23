"use client";

import Image from "next/image";
import { Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";
import { useCart } from "@/store/cart-context";

export default function CartPage() {
  const { isLoading } = useCustomerRouteGuard();
  const { cart, itemCount, total, removeItem, updateQuantity } = useCart();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-4 py-10">
        <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading cart...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#0f3460] sm:text-3xl">Your Cart</h1>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>

        {cart.items.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
              <ShoppingCart className="h-6 w-6 text-neutral-500" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Add products to continue shopping.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-neutral-900 sm:text-base">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{item.vendor}</p>
                    <p className="mt-2 text-sm font-bold text-neutral-900">
                      ${item.productPrice.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="flex items-center rounded-full border border-neutral-300 bg-white">
                      <button
                        type="button"
                        onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                        className="rounded-l-full p-2 text-neutral-700 transition hover:bg-neutral-100"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                        className="rounded-r-full p-2 text-neutral-700 transition hover:bg-neutral-100"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Order summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Items</span>
                  <span>{itemCount}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-neutral-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <button
                type="button"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Proceed to checkout
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
