export type SupplyRequestFormFields = {
  productName: string;
  brand: string;
  modelSku: string;
  quantity: string;
  description: string;
  referenceUrl: string;
  categoryHint: string;
  budgetMin: string;
  budgetMax: string;
  neededByDate: string;
  urgencyNote: string;
  allowAlternatives: boolean;
  deliveryMode: "SHIP" | "PICKUP";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  whatsapp: string;
  preferredContact: string;
  city: string;
  province: string;
  address: string;
};

export type SupplyValidationErrorCode =
  | "required"
  | "minLength"
  | "maxLength"
  | "invalidEmail"
  | "invalidDate"
  | "dateInPast"
  | "invalidQuantity"
  | "invalidBudget"
  | "addressRequired";

export type SupplyValidationError = {
  code: SupplyValidationErrorCode;
  min?: number;
  max?: number;
};

export type SupplyRequestFieldErrors = Partial<
  Record<keyof SupplyRequestFormFields, SupplyValidationError>
>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateSupplyRequestFields(
  fields: SupplyRequestFormFields
): SupplyRequestFieldErrors {
  const errors: SupplyRequestFieldErrors = {};

  if (!fields.productName.trim()) {
    errors.productName = { code: "required" };
  } else if (fields.productName.trim().length < 2) {
    errors.productName = { code: "minLength", min: 2 };
  }

  const qty = Number(fields.quantity);
  if (!fields.quantity.trim() || !Number.isInteger(qty) || qty < 1) {
    errors.quantity = { code: "invalidQuantity" };
  }

  if (!fields.description.trim()) {
    errors.description = { code: "required" };
  } else if (fields.description.trim().length < 10) {
    errors.description = { code: "minLength", min: 10 };
  }

  if (!fields.customerName.trim()) {
    errors.customerName = { code: "required" };
  }

  if (!fields.customerEmail.trim()) {
    errors.customerEmail = { code: "required" };
  } else if (!isValidEmail(fields.customerEmail.trim())) {
    errors.customerEmail = { code: "invalidEmail" };
  }

  if (!fields.customerPhone.trim()) {
    errors.customerPhone = { code: "required" };
  }

  if (!fields.city.trim()) {
    errors.city = { code: "required" };
  }

  if (fields.deliveryMode === "SHIP" && fields.address.trim().length < 5) {
    errors.address = { code: "addressRequired" };
  }

  if (fields.neededByDate.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.neededByDate.trim())) {
      errors.neededByDate = { code: "invalidDate" };
    } else {
      const selected = new Date(`${fields.neededByDate.trim()}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errors.neededByDate = { code: "dateInPast" };
      }
    }
  }

  const minBudget = fields.budgetMin.trim() ? Number(fields.budgetMin) : null;
  const maxBudget = fields.budgetMax.trim() ? Number(fields.budgetMax) : null;
  if (
    minBudget != null &&
    maxBudget != null &&
    (!Number.isFinite(minBudget) ||
      !Number.isFinite(maxBudget) ||
      maxBudget < minBudget)
  ) {
    errors.budgetMax = { code: "invalidBudget" };
  }

  return errors;
}
