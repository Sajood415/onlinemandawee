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

export type GiftValidationErrorCode =
  | "required"
  | "minLength"
  | "maxLength"
  | "lettersOnly"
  | "numbersOnly"
  | "minDigits"
  | "maxDigits"
  | "invalidEmail"
  | "invalidDate"
  | "dateInPast"
  | "preparationRequired"
  | "preparationMinLength"
  | "deliveryRequired"
  | "deliveryMinLength";

export type GiftValidationError = {
  code: GiftValidationErrorCode;
  min?: number;
  max?: number;
};

export type GiftRequestFieldErrors = Partial<
  Record<keyof GiftRequestFormFields, GiftValidationError>
>;

const LETTERS_WITH_PUNCT_REGEX = /^[A-Za-z\s'-]+$/;
const LETTERS_ONLY_REGEX = /^[A-Za-z\s]+$/;
const DIGITS_ONLY_REGEX = /^\d+$/;

export function sanitizeRecipientPhoneInput(value: string) {
  return value.replace(/\D/g, "");
}

function validateSenderName(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 2) return { code: "minLength", min: 2 };
  if (!LETTERS_WITH_PUNCT_REGEX.test(trimmed)) return { code: "lettersOnly" };
  return null;
}

function validateSenderEmail(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { code: "invalidEmail" };
  return null;
}

function validateSenderPhone(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (!DIGITS_ONLY_REGEX.test(trimmed)) return { code: "numbersOnly" };
  if (trimmed.length < 7) return { code: "minDigits", min: 7 };
  if (trimmed.length > 15) return { code: "maxDigits", max: 15 };
  return null;
}

export function validateRecipientName(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 2) return { code: "minLength", min: 2 };
  if (trimmed.length > 100) return { code: "maxLength", max: 100 };
  if (!LETTERS_ONLY_REGEX.test(trimmed)) return { code: "lettersOnly" };
  return null;
}

export function validateRecipientPhone(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (!DIGITS_ONLY_REGEX.test(trimmed)) return { code: "numbersOnly" };
  if (trimmed.length < 7) return { code: "minDigits", min: 7 };
  if (trimmed.length > 15) return { code: "maxDigits", max: 15 };
  return null;
}

export function validateRecipientCity(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 2) return { code: "minLength", min: 2 };
  if (trimmed.length > 120) return { code: "maxLength", max: 120 };
  if (!LETTERS_ONLY_REGEX.test(trimmed)) return { code: "lettersOnly" };
  return null;
}

export function validateRecipientProvince(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 120) return { code: "maxLength", max: 120 };
  if (!LETTERS_ONLY_REGEX.test(trimmed)) return { code: "lettersOnly" };
  return null;
}

export function validateRecipientAddress(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 5) return { code: "minLength", min: 5 };
  if (trimmed.length > 500) return { code: "maxLength", max: 500 };
  return null;
}

export function validatePreferredDeliveryDate(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { code: "invalidDate" };
  }

  const selected = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(selected.getTime())) {
    return { code: "invalidDate" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selected < today) {
    return { code: "dateInPast" };
  }

  return null;
}

export function validatePreparationNotes(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "preparationRequired" };
  if (trimmed.length < 20) return { code: "preparationMinLength", min: 20 };
  if (trimmed.length > 2000) return { code: "maxLength", max: 2000 };
  return null;
}

export function validateDeliveryInstructions(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "deliveryRequired" };
  if (trimmed.length < 10) return { code: "deliveryMinLength", min: 10 };
  if (trimmed.length > 1000) return { code: "maxLength", max: 1000 };
  return null;
}

export function validateBudgetNote(value: string): GiftValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 200) return { code: "maxLength", max: 200 };
  return null;
}

export function validateGiftRequestField(
  field: keyof GiftRequestFormFields,
  value: string | boolean
): GiftValidationError | null {
  if (typeof value === "boolean") return null;

  switch (field) {
    case "senderName":
      return validateSenderName(value);
    case "senderEmail":
      return validateSenderEmail(value);
    case "senderPhone":
      return validateSenderPhone(value);
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
