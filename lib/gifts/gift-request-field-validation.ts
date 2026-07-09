import {
  validateGuestEmail,
  validateGuestName,
  validateGuestPhone,
} from "@/lib/checkout/checkout-field-validation";

export type GiftRequestFormFields = {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientProvince: string;
  recipientAddress: string;
  occasion: string;
  preferredDeliveryDate: string;
  itemType: string;
  dressColor: string;
  dressSize: string;
  dressSleeveType: string;
  dressLength: string;
  dressFitting: string;
  dressTexture: string;
  dressForMale: boolean;
  dressForFemale: boolean;
  preparationNotes: string;
  deliveryInstructions: string;
  budgetNote: string;
};

export type GiftRequestFieldErrors = Partial<Record<keyof GiftRequestFormFields, string>>;

const LETTERS_ONLY_REGEX = /^[A-Za-z\s]+$/;
const DIGITS_ONLY_REGEX = /^\d+$/;

export function sanitizeRecipientPhoneInput(value: string) {
  return value.replace(/\D/g, "");
}

export function validateRecipientName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Recipient name is required.";
  if (trimmed.length < 2) return "Recipient name must be at least 2 characters.";
  if (trimmed.length > 100) return "Recipient name must be at most 100 characters.";
  if (!LETTERS_ONLY_REGEX.test(trimmed)) {
    return "Recipient name must contain letters only.";
  }
  return null;
}

export function validateRecipientPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Recipient phone is required.";
  if (!DIGITS_ONLY_REGEX.test(trimmed)) return "Recipient phone must contain numbers only.";
  if (trimmed.length < 7) return "Recipient phone must be at least 7 digits.";
  if (trimmed.length > 15) return "Recipient phone must be at most 15 digits.";
  return null;
}

export function validateRecipientCity(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "City is required.";
  if (trimmed.length < 2) return "City must be at least 2 characters.";
  if (trimmed.length > 120) return "City must be at most 120 characters.";
  if (!LETTERS_ONLY_REGEX.test(trimmed)) {
    return "City must contain letters only.";
  }
  return null;
}

export function validateRecipientProvince(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 120) return "Province must be at most 120 characters.";
  if (!LETTERS_ONLY_REGEX.test(trimmed)) {
    return "Province must contain letters only.";
  }
  return null;
}

export function validateRecipientAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Delivery address is required.";
  if (trimmed.length < 5) return "Delivery address must be at least 5 characters.";
  if (trimmed.length > 500) return "Delivery address must be at most 500 characters.";
  return null;
}

export function validatePreferredDeliveryDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "Enter a valid delivery date.";
  }

  const selected = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(selected.getTime())) {
    return "Enter a valid delivery date.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selected < today) {
    return "Delivery date cannot be in the past.";
  }

  return null;
}

export function validatePreparationNotes(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Describe how you want the gift prepared.";
  if (trimmed.length < 20) return "Please add at least 20 characters.";
  if (trimmed.length > 2000) return "Preparation details must be at most 2000 characters.";
  return null;
}

export function validateDeliveryInstructions(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Describe how you want the gift delivered.";
  if (trimmed.length < 10) return "Please add at least 10 characters.";
  if (trimmed.length > 1000) return "Delivery instructions must be at most 1000 characters.";
  return null;
}

export function validateBudgetNote(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 200) return "Budget note must be at most 200 characters.";
  return null;
}

export function validateGiftRequestField(
  field: keyof GiftRequestFormFields,
  value: string | boolean
): string | null {
  if (typeof value === "boolean") return null;

  switch (field) {
    case "senderName":
      return validateGuestName(value);
    case "senderEmail":
      return validateGuestEmail(value);
    case "senderPhone":
      return validateGuestPhone(value);
    case "recipientName":
      return validateRecipientName(value);
    case "recipientPhone":
      return validateRecipientPhone(value);
    case "recipientCity":
      return validateRecipientCity(value);
    case "recipientProvince":
      return validateRecipientProvince(value);
    case "recipientAddress":
      return validateRecipientAddress(value);
    case "preferredDeliveryDate":
      return validatePreferredDeliveryDate(value);
    case "preparationNotes":
      return validatePreparationNotes(value);
    case "deliveryInstructions":
      return validateDeliveryInstructions(value);
    case "budgetNote":
      return validateBudgetNote(value);
    case "occasion":
      return null;
    default:
      return null;
  }
}

export function validateGiftRequestForm(
  form: GiftRequestFormFields
): GiftRequestFieldErrors {
  const fields = Object.keys(form) as Array<keyof GiftRequestFormFields>;
  const errors: GiftRequestFieldErrors = {};

  for (const field of fields) {
    const error = validateGiftRequestField(field, form[field]);
    if (error) errors[field] = error;
  }

  return errors;
}

export function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
