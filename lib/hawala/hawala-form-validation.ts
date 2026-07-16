import type { HawalaCurrency } from "@/lib/hawala/constants";

export type HawalaTransferFormFields = {
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCountry: string;
  senderAddress: string;
  senderBankName: string;
  senderAccountNumber: string;
  receiverName: string;
  receiverPhone: string;
  receiverCountry: string;
  receiverAddress: string;
  receiverBankName: string;
  receiverAccountNumber: string;
  sendAmount: string;
  sendCurrency: HawalaCurrency;
  receiveCurrency: HawalaCurrency;
  note: string;
};

export type HawalaValidationErrorCode =
  | "required"
  | "minLength"
  | "maxLength"
  | "lettersOnly"
  | "numbersOnly"
  | "minDigits"
  | "maxDigits"
  | "alphanumeric"
  | "invalidEmail"
  | "amountRequired"
  | "amountPositive"
  | "amountTooLarge"
  | "noteMaxLength";

export type HawalaValidationError = {
  code: HawalaValidationErrorCode;
  min?: number;
  max?: number;
};

export type HawalaTransferFieldErrors = Partial<
  Record<keyof HawalaTransferFormFields, HawalaValidationError>
>;

const LETTERS_ONLY_REGEX = /^[A-Za-z\s'.-]+$/;
const PHONE_REGEX = /^[+\d\s-]+$/;
const ACCOUNT_NUMBER_REGEX = /^[A-Za-z0-9\s-]+$/;

export function sanitizeNameLikeInput(value: string) {
  return value.replace(/[^A-Za-z\s'.-]/g, "");
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/[^+\d\s-]/g, "");
}

export function sanitizeAccountNumberInput(value: string) {
  return value.replace(/[^A-Za-z0-9\s-]/g, "");
}

function validateNameField(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 2) return { code: "minLength", min: 2 };
  if (trimmed.length > 100) return { code: "maxLength", max: 100 };
  if (!LETTERS_ONLY_REGEX.test(trimmed)) return { code: "lettersOnly" };
  return null;
}

function validatePhoneField(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (!PHONE_REGEX.test(trimmed)) return { code: "numbersOnly" };
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return { code: "minDigits", min: 7 };
  if (digits.length > 15) return { code: "maxDigits", max: 15 };
  return null;
}

function validateCountryField(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 2) return { code: "minLength", min: 2 };
  if (!LETTERS_ONLY_REGEX.test(trimmed)) return { code: "lettersOnly" };
  return null;
}

function validateAddressField(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 5) return { code: "minLength", min: 5 };
  if (trimmed.length > 500) return { code: "maxLength", max: 500 };
  return null;
}

function validateBankNameField(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 2) return { code: "minLength", min: 2 };
  return null;
}

function validateAccountNumberField(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "required" };
  if (trimmed.length < 4) return { code: "minLength", min: 4 };
  if (!ACCOUNT_NUMBER_REGEX.test(trimmed)) return { code: "alphanumeric" };
  return null;
}

export function validateHawalaEmail(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { code: "invalidEmail" };
  return null;
}

export function validateHawalaAmount(value: string): HawalaValidationError | null {
  const trimmed = value.trim();
  if (!trimmed) return { code: "amountRequired" };
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return { code: "amountPositive" };
  if (amount > 1_000_000) return { code: "amountTooLarge" };
  return null;
}

export function validateHawalaTransferField(
  field: keyof HawalaTransferFormFields,
  value: string
): HawalaValidationError | null {
  switch (field) {
    case "senderName":
    case "receiverName":
      return validateNameField(value);
    case "senderPhone":
    case "receiverPhone":
      return validatePhoneField(value);
    case "senderEmail":
      return validateHawalaEmail(value);
    case "senderCountry":
    case "receiverCountry":
      return validateCountryField(value);
    case "senderAddress":
    case "receiverAddress":
      return validateAddressField(value);
    case "senderBankName":
    case "receiverBankName":
      return validateBankNameField(value);
    case "senderAccountNumber":
    case "receiverAccountNumber":
      return validateAccountNumberField(value);
    case "sendAmount":
      return validateHawalaAmount(value);
    case "note": {
      if (value.trim().length > 500) return { code: "noteMaxLength", max: 500 };
      return null;
    }
    default:
      return null;
  }
}

export function validateHawalaTransferForm(
  form: HawalaTransferFormFields
): HawalaTransferFieldErrors {
  const fields: Array<keyof HawalaTransferFormFields> = [
    "senderName",
    "senderPhone",
    "senderEmail",
    "senderCountry",
    "senderAddress",
    "senderBankName",
    "senderAccountNumber",
    "receiverName",
    "receiverPhone",
    "receiverCountry",
    "receiverAddress",
    "receiverBankName",
    "receiverAccountNumber",
    "sendAmount",
    "note",
  ];

  const errors: HawalaTransferFieldErrors = {};
  for (const field of fields) {
    const error = validateHawalaTransferField(field, form[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
