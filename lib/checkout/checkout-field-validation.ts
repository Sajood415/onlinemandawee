const LETTERS_WITH_PUNCT_REGEX = /^[A-Za-z\s'-]+$/;
const DIGITS_ONLY_REGEX = /^\d+$/;
const POSTAL_CODE_REGEX = /^[A-Za-z0-9\s-]+$/;

export type CheckoutContactFields = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
};

export type CheckoutAddressFields = {
  addressLine1: string;
  city: string;
  country: string;
  postalCode: string;
};

export function sanitizeNameInput(value: string) {
  return value.replace(/[^A-Za-z\s]/g, "");
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/\D/g, "");
}

export function sanitizePostalCodeInput(value: string) {
  return value.replace(/[^A-Za-z0-9\s-]/g, "").toUpperCase();
}

export function sanitizeCityCountryInput(value: string) {
  return value.replace(/[^A-Za-z\s'-]/g, "");
}

export function validateGuestName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Full name is required.";
  if (trimmed.length < 2) return "Full name must be at least 2 characters.";
  if (!LETTERS_WITH_PUNCT_REGEX.test(trimmed)) {
    return "Name must contain letters only.";
  }
  return null;
}

export function validateGuestEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateGuestPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Phone number is required.";
  if (!DIGITS_ONLY_REGEX.test(trimmed)) {
    return "Phone must contain numbers only.";
  }
  if (trimmed.length < 7) return "Phone number must be at least 7 digits.";
  if (trimmed.length > 15) return "Phone number must be at most 15 digits.";
  return null;
}

export function validateAddressLine(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Street address is required.";
  return null;
}

export function validateCity(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "City is required.";
  if (!LETTERS_WITH_PUNCT_REGEX.test(trimmed)) {
    return "City must contain letters only.";
  }
  return null;
}

export function validateCountry(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Country is required.";
  if (!LETTERS_WITH_PUNCT_REGEX.test(trimmed)) {
    return "Country must contain letters only.";
  }
  return null;
}

export function validatePostalCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!POSTAL_CODE_REGEX.test(trimmed)) {
    return "Postal code format is invalid.";
  }
  return null;
}

export function validateCheckoutShippingForm(
  contact: CheckoutContactFields,
  address: CheckoutAddressFields,
  options?: {
    addressRequired?: boolean;
  }
): Partial<Record<keyof CheckoutContactFields | keyof CheckoutAddressFields, string>> {
  const errors: Partial<
    Record<keyof CheckoutContactFields | keyof CheckoutAddressFields, string>
  > = {};

  const nameError = validateGuestName(contact.guestName);
  if (nameError) errors.guestName = nameError;

  const emailError = validateGuestEmail(contact.guestEmail);
  if (emailError) errors.guestEmail = emailError;

  const phoneError = validateGuestPhone(contact.guestPhone);
  if (phoneError) errors.guestPhone = phoneError;

  const addressRequired = options?.addressRequired ?? true;
  if (addressRequired) {
    const addressError = validateAddressLine(address.addressLine1);
    if (addressError) errors.addressLine1 = addressError;

    const cityError = validateCity(address.city);
    if (cityError) errors.city = cityError;

    const countryError = validateCountry(address.country);
    if (countryError) errors.country = countryError;
  }

  const postalError = validatePostalCode(address.postalCode);
  if (postalError) errors.postalCode = postalError;

  return errors;
}
