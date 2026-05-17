"use client";

import { useEffect, useId, useState } from "react";

import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_ISO,
} from "@/lib/phone/country-dial-codes";
import {
  formatE164Phone,
  getPhoneValidationMessage,
  splitE164Phone,
  validateNationalNumber,
} from "@/lib/phone/phone-policy";

type PhoneNumberFieldProps = {
  id?: string;
  label?: string;
  /** Shows a red asterisk after the label for required fields */
  required?: boolean;
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  hint?: string;
};

export function PhoneNumberField({
  id: idProp,
  label = "Phone",
  required = false,
  value,
  onChange,
  disabled = false,
  hint,
}: PhoneNumberFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [national, setNational] = useState("");

  useEffect(() => {
    const parsed = splitE164Phone(value);
    if (parsed) {
      setCountryIso(parsed.country.iso);
      setNational(parsed.national);
    } else if (!value.trim()) {
      setNational("");
    }
  }, [value]);

  const emitChange = (iso: string, nationalDigits: string) => {
    const formatted = formatE164Phone(iso, nationalDigits);
    onChange(formatted);
  };

  const handleCountryChange = (iso: string) => {
    setCountryIso(iso);
    emitChange(iso, national);
  };

  const handleNationalChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 15);
    setNational(digits);
    emitChange(countryIso, digits);
  };

  const nationalError = national ? validateNationalNumber(countryIso, national) : null;
  const fullError = value ? getPhoneValidationMessage(value) : null;
  const showError = national.length > 0 && (nationalError ?? fullError);

  const selected = COUNTRY_DIAL_CODES.find((c) => c.iso === countryIso);

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600" htmlFor={id}>
        {label}
        {required ? (
          <>
            {" "}
            <abbr className="font-semibold text-red-600 no-underline" title="Required" aria-label="required">
              *
            </abbr>
          </>
        ) : null}
      </label>

      <div className="flex min-h-11 w-full overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <label className="sr-only" htmlFor={`${id}-country`}>
          Country code
        </label>
        <select
          id={`${id}-country`}
          className="h-11 shrink-0 cursor-pointer border-0 border-e border-neutral-200 bg-neutral-50 py-0 ps-2.5 pe-7 text-[15px] leading-none outline-none sm:ps-3"
          value={countryIso}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={disabled}
          aria-label="Country calling code"
        >
          {COUNTRY_DIAL_CODES.map((country) => (
            <option key={country.iso} value={country.iso}>
              {country.flag} +{country.dial}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={id}>
          Phone number
        </label>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="tel-national"
          className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 tabular-nums"
          value={national}
          onChange={(e) => handleNationalChange(e.target.value)}
          disabled={disabled}
          placeholder={
            selected ? `${"0".repeat(selected.minLength)}…` : "Phone number"
          }
          aria-invalid={Boolean(showError)}
          aria-describedby={showError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      </div>

      {hint && !showError ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-neutral-500">
          {hint}
        </p>
      ) : null}
      {showError ? (
        <p id={`${id}-error`} className="text-xs leading-relaxed text-red-600" role="alert">
          {nationalError ?? fullError}
        </p>
      ) : null}
    </div>
  );
}
