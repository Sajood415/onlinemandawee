/** Zod `flatten()`-shaped payloads from API error responses */
type FlattenedFieldErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

const FIELD_LABELS: Record<string, string> = {
  description: "Store description",
  storeName: "Store name",
  businessType: "Business type",
  logoUrl: "Logo",
  documentType: "ID type",
  documentUrl: "ID document",
  selfieWithIdUrl: "Selfie with ID",
  businessLicenseUrl: "Business license",
  addressLine1: "Address line 1",
  city: "City",
  country: "Country",
  postalCode: "Postal code",
  proofOfAddressUrl: "Proof of address",
  accountName: "Account name",
  accountNumberOrIban: "Account number or IBAN",
  bankName: "Bank name",
  stripeEmail: "Stripe email",
  method: "Payout method",
};

function titleCaseField(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function humanizeFieldValidationMessage(
  fieldKey: string,
  rawMessage: string
): string {
  const label = FIELD_LABELS[fieldKey] ?? titleCaseField(fieldKey);

  const tooBig = rawMessage.match(
    /Too big:\s*expected string to have <=(\d+)\s*characters?/i
  );
  if (tooBig) {
    const n = tooBig[1];
    return `${label} cannot be longer than ${n} characters. Please shorten it and try again.`;
  }

  const tooSmall = rawMessage.match(
    /Too small:\s*expected string to have >=(\d+)\s*characters?/i
  );
  if (tooSmall) {
    const n = tooSmall[1];
    return `${label} must be at least ${n} characters.`;
  }

  const invalidEmail = /invalid/i.test(rawMessage) && /email/i.test(rawMessage);
  if (invalidEmail) {
    return `Please enter a valid email for ${label.toLowerCase()}.`;
  }

  const invalidEnum = /Invalid enum/i.test(rawMessage);
  if (invalidEnum) {
    return `${label} has an invalid value. Please choose a valid option.`;
  }

  const requiredLike =
    /\bRequired\b/i.test(rawMessage) || /expected string,/i.test(rawMessage);
  if (requiredLike) {
    return `Please fill in ${label.toLowerCase()}.`;
  }

  return `${label}: ${rawMessage}`;
}

/** Returns a single user-facing sentence for flattened Zod validation errors */
export function formatFlattenedValidationError(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const d = details as FlattenedFieldErrors;
  const formErrors = d.formErrors?.filter(Boolean) ?? [];

  const fieldPairs: Array<{ field: string; messages: string[] }> = [];
  if (d.fieldErrors && typeof d.fieldErrors === "object") {
    for (const [field, msgs] of Object.entries(d.fieldErrors)) {
      if (!msgs?.length) continue;
      fieldPairs.push({ field, messages: msgs.filter(Boolean) });
    }
  }

  if (!formErrors.length && !fieldPairs.length) {
    return null;
  }

  const parts: string[] = [];

  for (const fe of formErrors) {
    parts.push(fe);
  }

  for (const { field, messages } of fieldPairs) {
    for (const msg of messages) {
      parts.push(humanizeFieldValidationMessage(field, msg));
    }
  }

  if (!parts.length) {
    return null;
  }

  return parts.slice(0, 3).join(" ");
}
