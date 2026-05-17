import {
  getPasswordValidationMessage,
  isPasswordValid,
} from "@/lib/auth/password-policy";
import {
  getPhoneValidationMessage,
  isValidPhone,
} from "@/lib/phone/phone-policy";

export { getPasswordValidationMessage, isPasswordValid };
export { getPhoneValidationMessage, isValidPhone };

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
