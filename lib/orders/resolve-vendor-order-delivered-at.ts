export type VendorOrderDeliveredAtSource = {
  status: string;
  deliveredAt?: string | Date | null;
  outboundDeliveredAt?: string | Date | null;
  statusChangedAt?: string | Date | null;
};

function toIso(value: string | Date | null | undefined) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Effective delivery timestamp for a vendor order line. */
export function resolveVendorOrderDeliveredAtIso(source: VendorOrderDeliveredAtSource) {
  if (source.status !== "DELIVERED") return null;

  return (
    toIso(source.deliveredAt) ??
    toIso(source.outboundDeliveredAt) ??
    toIso(source.statusChangedAt)
  );
}

/** Latest delivery timestamp across vendor portions of an order. */
export function resolveOrderDeliveredAtIso(sources: VendorOrderDeliveredAtSource[]) {
  const timestamps = sources
    .map(resolveVendorOrderDeliveredAtIso)
    .filter((value): value is string => value != null)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

export function formatDeliveredOnDateTime(iso: string | null, locale = "en") {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
