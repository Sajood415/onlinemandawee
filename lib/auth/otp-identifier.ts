import { isValidPhone } from "@/lib/phone/phone-policy";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parseOtpIdentifier = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalizedEmail = normalizeEmailForAuth(trimmed);
  if (EMAIL_REGEX.test(normalizedEmail)) {
    return {
      kind: "email" as const,
      value: normalizedEmail,
    };
  }

  if (isValidPhone(trimmed)) {
    return {
      kind: "phone" as const,
      value: trimmed,
    };
  }

  return null;
};
