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

export type HawalaTransferFieldErrors = Partial<Record<keyof HawalaTransferFormFields, string>>;

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

function validateNameField(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (trimmed.length > 100) return `${label} must be at most 100 characters.`;
  if (!LETTERS_ONLY_REGEX.test(trimmed)) return `${label} must contain letters only.`;
  return null;
}

function validatePhoneField(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!PHONE_REGEX.test(trimmed)) return `${label} must contain numbers only.`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return `${label} must be at least 7 digits.`;
  if (digits.length > 15) return `${label} must be at most 15 digits.`;
  return null;
}

function validateCountryField(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (!LETTERS_ONLY_REGEX.test(trimmed)) return `${label} must contain letters only.`;
  return null;
}

function validateAddressField(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 5) return `${label} must be at least 5 characters.`;
  if (trimmed.length > 500) return `${label} must be at most 500 characters.`;
  return null;
}

function validateBankNameField(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  return null;
}

function validateAccountNumberField(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 4) return `${label} must be at least 4 characters.`;
  if (!ACCOUNT_NUMBER_REGEX.test(trimmed)) {
    return `${label} can only contain letters and numbers.`;
  }
  return null;
}

export function validateHawalaEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function validateHawalaAmount(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Amount is required.";
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount greater than 0.";
  if (amount > 1_000_000) return "Amount is too large.";
  return null;
}

export function validateHawalaTransferField(
  field: keyof HawalaTransferFormFields,
  value: string
): string | null {
  switch (field) {
    case "senderName":
      return validateNameField(value, "Sender name");
    case "senderPhone":
      return validatePhoneField(value, "Sender phone");
    case "senderEmail":
      return validateHawalaEmail(value);
    case "senderCountry":
      return validateCountryField(value, "Sender country");
    case "senderAddress":
      return validateAddressField(value, "Sender address");
    case "senderBankName":
      return validateBankNameField(value, "Sender bank name");
    case "senderAccountNumber":
      return validateAccountNumberField(value, "Sender account number");
    case "receiverName":
      return validateNameField(value, "Receiver name");
    case "receiverPhone":
      return validatePhoneField(value, "Receiver phone");
    case "receiverCountry":
      return validateCountryField(value, "Receiver country");
    case "receiverAddress":
      return validateAddressField(value, "Receiver address");
    case "receiverBankName":
      return validateBankNameField(value, "Receiver bank name");
    case "receiverAccountNumber":
      return validateAccountNumberField(value, "Receiver account number");
    case "sendAmount":
      return validateHawalaAmount(value);
    case "note": {
      if (value.trim().length > 500) return "Note must be at most 500 characters.";
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
