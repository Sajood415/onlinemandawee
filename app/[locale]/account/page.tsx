"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingBag,
  UserCircle2,
} from "lucide-react";

import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type VendorOrderStatus = "NEW" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type CustomerOrderItem = {
  id: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  currency: string;
  unitPriceAmount: number;
  lineTotalAmount: number;
};

type CustomerVendorOrder = {
  id: string;
  vendorStoreName: string | null;
  status: VendorOrderStatus;
  currency: string;
  grandTotalAmount: number;
  items: CustomerOrderItem[];
};

type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  grandTotalAmount: number;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string | null;
  };
  vendorOrders: CustomerVendorOrder[];
};

const STATUS_COLORS: Record<VendorOrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 border border-blue-200",
  PREPARING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  SHIPPED: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  DELIVERED: "bg-green-50 text-green-700 border border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
};

const STATUS_LABELS: Record<VendorOrderStatus, string> = {
  NEW: "New",
  PREPARING: "Preparing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function overallOrderStatus(order: CustomerOrder) {
  const statuses = order.vendorOrders.map((vendorOrder) => vendorOrder.status);
  if (statuses.every((status) => status === "CANCELLED")) return "CANCELLED";
  if (statuses.every((status) => status === "DELIVERED")) return "DELIVERED";
  if (statuses.some((status) => status === "SHIPPED")) return "SHIPPED";
  if (statuses.some((status) => status === "PREPARING")) return "PREPARING";
  return "NEW";
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const [expanded, setExpanded] = useState(false);
  const summaryStatus = overallOrderStatus(order);

  return (
    <article className="rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-neutral-100/80"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-neutral-900">{order.orderNumber}</p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[summaryStatus]}`}
            >
              {STATUS_LABELS[summaryStatus]}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-600">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Payment: {order.paymentStatus.replaceAll("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-neutral-900">
            {formatMoney(order.grandTotalAmount, order.currency)}
          </p>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Delivery address
            </p>
            <p className="mt-1 text-sm text-neutral-700">
              {order.shippingAddress.fullName} · {order.shippingAddress.phone}
            </p>
            <p className="text-sm text-neutral-700">
              {order.shippingAddress.addressLine1}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.country}
              {order.shippingAddress.postalCode
                ? `, ${order.shippingAddress.postalCode}`
                : ""}
            </p>
          </div>

          {order.vendorOrders.map((vendorOrder) => (
            <div
              key={vendorOrder.id}
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900">
                  {vendorOrder.vendorStoreName ?? "Vendor"}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[vendorOrder.status]}`}
                >
                  {STATUS_LABELS[vendorOrder.status]}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {vendorOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-neutral-900">
                      {formatMoney(item.lineTotalAmount, item.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

type CustomerAddress = {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine1: string;
  postalCode: string | null;
  isDefault: boolean;
};

type AddressFormState = {
  fullName: string;
  phone: string;
  addressLine1: string;
  city: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
};

function emptyAddressForm(
  defaults?: Partial<AddressFormState>
): AddressFormState {
  return {
    fullName: defaults?.fullName ?? "",
    phone: defaults?.phone ?? "",
    addressLine1: defaults?.addressLine1 ?? "",
    city: defaults?.city ?? "",
    country: defaults?.country ?? "",
    postalCode: defaults?.postalCode ?? "",
    isDefault: defaults?.isDefault ?? true,
  };
}

function addressToFormState(address: CustomerAddress): AddressFormState {
  return emptyAddressForm({
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    city: address.city,
    country: address.country,
    postalCode: address.postalCode ?? "",
    isDefault: address.isDefault,
  });
}

function mergeAddressesAfterSave(
  current: CustomerAddress[],
  saved: CustomerAddress
) {
  const withoutSaved = current.filter((address) => address.id !== saved.id);
  return [
    saved,
    ...withoutSaved.map((address) =>
      saved.isDefault && address.isDefault ? { ...address, isDefault: false } : address
    ),
  ].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

function AddressFields({
  form,
  onChange,
}: {
  form: AddressFormState;
  onChange: (next: AddressFormState) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-neutral-700">
        Full name
        <input
          className={INPUT_CLASS}
          value={form.fullName}
          onChange={(event) => onChange({ ...form, fullName: event.target.value })}
          required
        />
      </label>
      <label className="block text-sm text-neutral-700">
        Phone
        <input
          className={INPUT_CLASS}
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
          required
        />
      </label>
      <label className="block text-sm text-neutral-700 sm:col-span-2">
        Address line
        <input
          className={INPUT_CLASS}
          value={form.addressLine1}
          onChange={(event) => onChange({ ...form, addressLine1: event.target.value })}
          required
        />
      </label>
      <label className="block text-sm text-neutral-700">
        City
        <input
          className={INPUT_CLASS}
          value={form.city}
          onChange={(event) => onChange({ ...form, city: event.target.value })}
          required
        />
      </label>
      <label className="block text-sm text-neutral-700">
        Country
        <input
          className={INPUT_CLASS}
          value={form.country}
          onChange={(event) => onChange({ ...form, country: event.target.value })}
          required
        />
      </label>
      <label className="block text-sm text-neutral-700">
        Postal code
        <input
          className={INPUT_CLASS}
          value={form.postalCode}
          onChange={(event) => onChange({ ...form, postalCode: event.target.value })}
          required
        />
      </label>
    </div>
  );
}

export default function CustomerAccountPage() {
  const { isLoading: guardLoading, user } = useCustomerRouteGuard();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(() =>
    emptyAddressForm()
  );
  const [editAddressForm, setEditAddressForm] = useState<AddressFormState>(() =>
    emptyAddressForm()
  );
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);

  const loadAccountData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [ordersResponse, addressesResponse] = await Promise.all([
        fetchWithAuth("/api/orders/my"),
        fetchWithAuth("/api/customer/addresses"),
      ]);

      const [ordersData, addressesData] = await Promise.all([
        parseApiResponse<CustomerOrder[]>(ordersResponse),
        parseApiResponse<CustomerAddress[]>(addressesResponse),
      ]);
      setOrders(ordersData);
      setAddresses(addressesData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load account information."
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (guardLoading || !user) return;
    void loadAccountData();
  }, [guardLoading, user, loadAccountData]);

  useEffect(() => {
    if (guardLoading || !user) return;

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        void loadAccountData();
      }
    };

    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => document.removeEventListener("visibilitychange", refreshOnVisible);
  }, [guardLoading, user, loadAccountData]);

  useEffect(() => {
    if (!user) return;
    setAddressForm((current) =>
      emptyAddressForm({
        ...current,
        fullName: current.fullName || user.fullName,
        phone: current.phone || user.phone,
        isDefault: addresses.length === 0 ? true : current.isDefault,
      })
    );
  }, [user, addresses.length]);

  const latestOrderAddress = orders[0]?.shippingAddress ?? null;

  const openAddressForm = (prefill?: Partial<AddressFormState>) => {
    setEditingAddressId(null);
    setAddressFormError(null);
    setAddressForm(
      emptyAddressForm({
        fullName: user?.fullName ?? "",
        phone: user?.phone ?? "",
        isDefault: addresses.length === 0,
        ...prefill,
      })
    );
    setShowAddressForm(true);
  };

  const startEditingAddress = (address: CustomerAddress) => {
    setShowAddressForm(false);
    setAddressFormError(null);
    setEditingAddressId(address.id);
    setEditAddressForm(addressToFormState(address));
  };

  const buildAddressPayload = (payload: AddressFormState) => ({
    fullName: payload.fullName.trim(),
    phone: payload.phone.trim(),
    addressLine1: payload.addressLine1.trim(),
    city: payload.city.trim(),
    country: payload.country.trim(),
    postalCode: payload.postalCode.trim(),
    isDefault: payload.isDefault,
  });

  const saveAddress = async (payload: AddressFormState, addressId?: string) => {
    setSavingAddress(true);
    setAddressFormError(null);
    try {
      const response = await fetchWithAuth(
        addressId ? `/api/customer/addresses/${addressId}` : "/api/customer/addresses",
        {
          method: addressId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildAddressPayload(payload)),
        }
      );
      const saved = await parseApiResponse<CustomerAddress>(response);
      setAddresses((current) => mergeAddressesAfterSave(current, saved));

      if (addressId) {
        setEditingAddressId(null);
      } else {
        setShowAddressForm(false);
        setAddressForm(emptyAddressForm());
      }
    } catch (err) {
      setAddressFormError(
        err instanceof Error ? err.message : "Could not save address."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleAddressSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveAddress(addressForm);
  };

  const handleEditAddressSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    addressId: string
  ) => {
    event.preventDefault();
    await saveAddress(editAddressForm, addressId);
  };

  const handleSaveLatestOrderAddress = async () => {
    if (!latestOrderAddress) return;
    await saveAddress(
      emptyAddressForm({
        fullName: latestOrderAddress.fullName,
        phone: latestOrderAddress.phone,
        addressLine1: latestOrderAddress.addressLine1,
        city: latestOrderAddress.city,
        country: latestOrderAddress.country,
        postalCode: latestOrderAddress.postalCode ?? "",
        isDefault: true,
      })
    );
  };

  const orderCount = orders.length;
  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + order.grandTotalAmount, 0),
    [orders]
  );

  if (guardLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-4 py-10">
        <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking account...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f3460] sm:text-3xl">
            My Account
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            View your profile, previous orders, and saved addresses.
          </p>
        </div>

        {loadingData ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading account data...
          </div>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Profile
                </p>
                <p className="mt-2 text-lg font-semibold text-neutral-900">
                  {user?.fullName}
                </p>
                <p className="mt-1 text-sm text-neutral-600">{user?.email}</p>
              </article>

              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Orders
                </p>
                <p className="mt-2 text-lg font-semibold text-neutral-900">
                  {orderCount} total
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Total spent: {formatMoney(totalSpent, orders[0]?.currency ?? "USD")}
                </p>
              </article>

              <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Addresses
                </p>
                <p className="mt-2 text-lg font-semibold text-neutral-900">
                  {addresses.length} saved
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Keep delivery details ready for checkout.
                </p>
              </article>
            </section>

            <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Your orders</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Track delivery status for each vendor in your order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAccountData()}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              {orders.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-600">
                  You have no orders yet. Guest orders placed with your email will
                  appear here after you sign up or sign in.{" "}
                  <Link href="/products" className="font-semibold text-primary hover:underline">
                    Start shopping
                  </Link>
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Saved addresses
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Checkout addresses are not saved automatically. Add one here for
                    faster checkout next time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAddressForm()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add address
                </button>
              </div>

              {showAddressForm ? (
                <form
                  onSubmit={(event) => void handleAddressSubmit(event)}
                  className="mt-5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5"
                >
                  <h3 className="text-sm font-semibold text-neutral-900">
                    New address
                  </h3>
                  <div className="mt-4">
                    <AddressFields form={addressForm} onChange={setAddressForm} />
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          isDefault: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
                    />
                    Set as default address
                  </label>
                  {addressFormError ? (
                    <p className="mt-3 text-sm text-red-600">{addressFormError}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingAddress ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save address"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setAddressFormError(null);
                      }}
                      className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {addresses.length === 0 && latestOrderAddress ? (
                <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4">
                  <p className="text-sm font-medium text-neutral-900">
                    Address from your latest order
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {latestOrderAddress.fullName} · {latestOrderAddress.phone}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">
                    {latestOrderAddress.addressLine1}, {latestOrderAddress.city},{" "}
                    {latestOrderAddress.country}
                    {latestOrderAddress.postalCode
                      ? `, ${latestOrderAddress.postalCode}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSaveLatestOrderAddress()}
                    disabled={savingAddress}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-60"
                  >
                    {savingAddress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save this address"
                    )}
                  </button>
                </div>
              ) : null}

              {addresses.length === 0 && !latestOrderAddress ? (
                <p className="mt-4 text-sm text-neutral-600">
                  No saved addresses yet. Click <strong>Add address</strong> to create
                  one.
                </p>
              ) : null}

              {addresses.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {addresses.map((address) => (
                    <article
                      key={address.id}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-5"
                    >
                      {editingAddressId === address.id ? (
                        <form
                          onSubmit={(event) =>
                            void handleEditAddressSubmit(event, address.id)
                          }
                          className="w-full"
                        >
                          <h3 className="text-sm font-semibold text-neutral-900">
                            Edit address
                          </h3>
                          <div className="mt-4">
                            <AddressFields
                              form={editAddressForm}
                              onChange={setEditAddressForm}
                            />
                          </div>
                          <label className="mt-4 flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={editAddressForm.isDefault}
                              onChange={(event) =>
                                setEditAddressForm((current) => ({
                                  ...current,
                                  isDefault: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
                            />
                            Set as default address
                          </label>
                          {addressFormError ? (
                            <p className="mt-3 text-sm text-red-600">
                              {addressFormError}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="submit"
                              disabled={savingAddress}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                            >
                              {savingAddress ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Save changes"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddressId(null);
                                setAddressFormError(null);
                              }}
                              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-neutral-900">
                                {address.fullName}
                              </p>
                              {address.isDefault ? (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                  Default
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-neutral-600">{address.phone}</p>
                            <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                              {address.addressLine1}, {address.city}, {address.country}
                              {address.postalCode ? `, ${address.postalCode}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditingAddress(address)}
                            className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
