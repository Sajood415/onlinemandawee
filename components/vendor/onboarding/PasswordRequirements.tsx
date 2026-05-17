"use client";

import { Check, X } from "lucide-react";

import { PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";

type PasswordRequirementsProps = {
  password: string;
};

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <ul className="mt-2 space-y-1.5" aria-label="Password requirements">
      {PASSWORD_REQUIREMENTS.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.key}
            className={`flex items-start gap-2 text-xs leading-relaxed ${
              met ? "text-emerald-700" : "text-neutral-600"
            }`}
          >
            {met ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
            )}
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
