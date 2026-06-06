import { z } from "zod";

export const HAS_UPPERCASE = /[A-Z]/;
export const HAS_LOWERCASE = /[a-z]/;
export const HAS_SPECIAL = /[^A-Za-z0-9]/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordRuleKey = "length" | "upper" | "lower" | "special";

export const PASSWORD_REQUIREMENTS: {
  key: PasswordRuleKey;
  label: string;
  test: (password: string) => boolean;
}[] = [
  {
    key: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: "upper",
    label: "One uppercase letter (A–Z)",
    test: (password) => HAS_UPPERCASE.test(password),
  },
  {
    key: "lower",
    label: "One lowercase letter (a–z)",
    test: (password) => HAS_LOWERCASE.test(password),
  },
  {
    key: "special",
    label: "One special character (!@#$…)",
    test: (password) => HAS_SPECIAL.test(password),
  },
];

export const isPasswordValid = (password: string) =>
  PASSWORD_REQUIREMENTS.every((rule) => rule.test(password));

export const getPasswordValidationMessage = (password: string): string | null => {
  const failed = PASSWORD_REQUIREMENTS.find((rule) => !rule.test(password));
  if (!failed) return null;
  return `Password must meet all requirements (missing: ${failed.label.toLowerCase()}).`;
};

export const passwordFieldSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "Password must be at least 8 characters")
  .max(PASSWORD_MAX_LENGTH)
  .refine((value) => HAS_UPPERCASE.test(value), {
    message: "Password must include at least one uppercase letter",
  })
  .refine((value) => HAS_LOWERCASE.test(value), {
    message: "Password must include at least one lowercase letter",
  })
  .refine((value) => HAS_SPECIAL.test(value), {
    message: "Password must include at least one special character",
  });
