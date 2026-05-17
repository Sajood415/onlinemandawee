export type CountryDialCode = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  minLength: number;
  maxLength: number;
};

/** Common destinations for Online Mandawee; sorted by name in the UI selector. */
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: "AF", name: "Afghanistan", dial: "93", flag: "🇦🇫", minLength: 9, maxLength: 9 },
  { iso: "AU", name: "Australia", dial: "61", flag: "🇦🇺", minLength: 9, maxLength: 9 },
  { iso: "CA", name: "Canada", dial: "1", flag: "🇨🇦", minLength: 10, maxLength: 10 },
  { iso: "DE", name: "Germany", dial: "49", flag: "🇩🇪", minLength: 10, maxLength: 11 },
  { iso: "IN", name: "India", dial: "91", flag: "🇮🇳", minLength: 10, maxLength: 10 },
  { iso: "IR", name: "Iran", dial: "98", flag: "🇮🇷", minLength: 10, maxLength: 10 },
  { iso: "AE", name: "United Arab Emirates", dial: "971", flag: "🇦🇪", minLength: 9, maxLength: 9 },
  { iso: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧", minLength: 10, maxLength: 10 },
  { iso: "US", name: "United States", dial: "1", flag: "🇺🇸", minLength: 10, maxLength: 10 },
  { iso: "PK", name: "Pakistan", dial: "92", flag: "🇵🇰", minLength: 10, maxLength: 10 },
  { iso: "SA", name: "Saudi Arabia", dial: "966", flag: "🇸🇦", minLength: 9, maxLength: 9 },
  { iso: "TR", name: "Turkey", dial: "90", flag: "🇹🇷", minLength: 10, maxLength: 10 },
];

export const DEFAULT_COUNTRY_ISO = "AF";

export const getCountryByIso = (iso: string) =>
  COUNTRY_DIAL_CODES.find((c) => c.iso === iso) ??
  COUNTRY_DIAL_CODES.find((c) => c.iso === DEFAULT_COUNTRY_ISO)!;

export const getCountryByDial = (dial: string) =>
  [...COUNTRY_DIAL_CODES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => dial.startsWith(c.dial));
