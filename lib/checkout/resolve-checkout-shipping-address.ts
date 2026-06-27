type CheckoutShippingAddressInput = {
  deliveryAddress?: {
    addressLine1?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  } | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
};

export function resolveCheckoutShippingAddress(input: CheckoutShippingAddressInput) {
  const nested = input.deliveryAddress;

  return {
    addressLine1: input.addressLine1 ?? nested?.addressLine1 ?? null,
    city: input.city ?? nested?.city ?? null,
    country: input.country ?? nested?.country ?? null,
    postalCode: input.postalCode ?? nested?.postalCode ?? null,
  };
}
