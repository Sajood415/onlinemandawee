"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className = "", ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const t = useTranslations("Common");

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${className} pr-10`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-500 transition hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    );
  }
);
