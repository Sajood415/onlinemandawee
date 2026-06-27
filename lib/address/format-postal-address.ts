export type PostalAddressParts = {
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
};

export function formatPostalAddress(address: PostalAddressParts) {
  return [address.addressLine1, address.city, address.postalCode, address.country]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
}
