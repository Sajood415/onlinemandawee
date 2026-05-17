import { z } from "zod";

import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_ISO,
  getCountryByDial,
  getCountryByIso,
  type CountryDialCode,
} from "@/lib/phone/country-dial-codes";

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const normalizeNationalDigits = (value: string) =>
  value.replace(/\D/g, "").replace(/^0+/, "");

export const formatE164Phone = (
  countryIso: string,
  nationalNumber: string
): string => {
  const country = getCountryByIso(countryIso);
  const national = normalizeNationalDigits(nationalNumber);
  if (!national) return "";
  return `+${country.dial}${national}`;
};

export const splitE164Phone = (
  value: string
): { country: CountryDialCode; national: string } | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.startsWith("+")
    ? trimmed.slice(1).replace(/\D/g, "")
    : trimmed.replace(/\D/g, "");

  if (!digits) return null;

  const country = getCountryByDial(digits);
  if (!country) {
    return {
      country: getCountryByIso(DEFAULT_COUNTRY_ISO),
      national: digits,
    };
  }

  return {
    country,
    national: digits.slice(country.dial.length),
  };
};

export const validateNationalNumber = (
  countryIso: string,
  nationalNumber: string
): string | null => {
  const country = getCountryByIso(countryIso);
  const national = normalizeNationalDigits(nationalNumber);

  if (!national) {
    return "Enter your phone number.";
  }

  if (!/^\d+$/.test(national)) {
    return "Phone number must contain digits only.";
  }

  if (national.length < country.minLength || national.length > country.maxLength) {
    return `${country.name} numbers must be ${country.minLength}${
      country.maxLength !== country.minLength ? `–${country.maxLength}` : ""
    } digits (without the leading 0).`;
  }

  return null;
};

export const getPhoneValidationMessage = (e164: string): string | null => {
  const trimmed = e164.trim();
  if (!trimmed) {
    return "Enter your phone number with country code.";
  }

  const parsed = splitE164Phone(trimmed);
  if (!parsed) {
    return "Enter a valid phone number.";
  }

  const nationalError = validateNationalNumber(parsed.country.iso, parsed.national);
  if (nationalError) return nationalError;

  const formatted = formatE164Phone(parsed.country.iso, parsed.national);
  if (!E164_REGEX.test(formatted)) {
    return "Enter a valid international phone number.";
  }

  return null;
};

export const isValidPhone = (e164: string) => getPhoneValidationMessage(e164) === null;

export const phoneFieldSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .max(20)
  .refine((value) => isValidPhone(value), {
    message:
      "Enter a valid phone number with country code (e.g. +93701234567).",
  });
