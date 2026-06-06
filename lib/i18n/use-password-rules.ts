"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import {
  HAS_LOWERCASE,
  HAS_SPECIAL,
  HAS_UPPERCASE,
  PASSWORD_MIN_LENGTH,
  type PasswordRuleKey,
} from "@/lib/auth/password-policy";

export function usePasswordRules() {
  const t = useTranslations("Auth.passwordRequirements");

  return useMemo(() => {
    const requirements: {
      key: PasswordRuleKey;
      label: string;
      test: (password: string) => boolean;
    }[] = [
      {
        key: "length",
        label: t("length"),
        test: (password) => password.length >= PASSWORD_MIN_LENGTH,
      },
      {
        key: "upper",
        label: t("upper"),
        test: (password) => HAS_UPPERCASE.test(password),
      },
      {
        key: "lower",
        label: t("lower"),
        test: (password) => HAS_LOWERCASE.test(password),
      },
      {
        key: "special",
        label: t("special"),
        test: (password) => HAS_SPECIAL.test(password),
      },
    ];

    const getValidationMessage = (password: string): string | null => {
      const failed = requirements.find((rule) => !rule.test(password));
      if (!failed) return null;
      return t("missing", { rule: failed.label.toLowerCase() });
    };

    return { requirements, getValidationMessage, ariaLabel: t("ariaLabel") };
  }, [t]);
}
