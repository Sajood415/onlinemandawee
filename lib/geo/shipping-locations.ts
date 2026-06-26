import { COUNTRY_DIAL_CODES } from "@/lib/phone/country-dial-codes";

export type ShippingCityOption = {
  name: string;
  postalCodes: string[];
};

export const SHIPPING_COUNTRIES = COUNTRY_DIAL_CODES.map((country) => ({
  iso: country.iso,
  name: country.name,
  flag: country.flag,
}));

const CITIES_BY_ISO: Record<string, ShippingCityOption[]> = {
  AF: [
    { name: "Kabul", postalCodes: ["1001", "1002", "1003", "1004", "1005"] },
    { name: "Herat", postalCodes: ["3001", "3002"] },
    { name: "Kandahar", postalCodes: ["2501", "2502"] },
    { name: "Mazar-i-Sharif", postalCodes: ["1701", "1702"] },
    { name: "Jalalabad", postalCodes: ["2601"] },
    { name: "Kunduz", postalCodes: ["1801"] },
    { name: "Baghlan", postalCodes: ["1901"] },
    { name: "Ghazni", postalCodes: ["2201"] },
    { name: "Balkh", postalCodes: ["1703"] },
    { name: "Farah", postalCodes: ["2701"] },
    { name: "Lashkar Gah", postalCodes: ["2801"] },
    { name: "Taloqan", postalCodes: ["1851"] },
  ],
  PK: [
    { name: "Karachi", postalCodes: ["74000", "75300", "75500"] },
    { name: "Lahore", postalCodes: ["54000", "54500"] },
    { name: "Islamabad", postalCodes: ["44000", "44220"] },
    { name: "Rawalpindi", postalCodes: ["46000"] },
    { name: "Peshawar", postalCodes: ["25000"] },
    { name: "Quetta", postalCodes: ["87300"] },
    { name: "Multan", postalCodes: ["60000"] },
    { name: "Faisalabad", postalCodes: ["38000"] },
  ],
  IN: [
    { name: "Mumbai", postalCodes: ["400001", "400050", "400070"] },
    { name: "Delhi", postalCodes: ["110001", "110020", "110092"] },
    { name: "Bangalore", postalCodes: ["560001", "560034"] },
    { name: "Hyderabad", postalCodes: ["500001", "500081"] },
    { name: "Chennai", postalCodes: ["600001", "600028"] },
    { name: "Kolkata", postalCodes: ["700001", "700091"] },
  ],
  US: [
    { name: "New York", postalCodes: ["10001", "10011", "10036"] },
    { name: "Los Angeles", postalCodes: ["90001", "90012", "90028"] },
    { name: "Chicago", postalCodes: ["60601", "60614", "60657"] },
    { name: "Houston", postalCodes: ["77001", "77002", "77019"] },
    { name: "San Francisco", postalCodes: ["94102", "94107", "94110"] },
    { name: "Washington", postalCodes: ["20001", "20005", "20009"] },
  ],
  CA: [
    { name: "Toronto", postalCodes: ["M5V", "M5H", "M4B"] },
    { name: "Vancouver", postalCodes: ["V5K", "V6B", "V6C"] },
    { name: "Montreal", postalCodes: ["H2X", "H3A", "H3B"] },
    { name: "Calgary", postalCodes: ["T2P", "T2G", "T3A"] },
    { name: "Ottawa", postalCodes: ["K1P", "K1N", "K2P"] },
  ],
  GB: [
    { name: "London", postalCodes: ["SW1A", "EC1A", "W1A"] },
    { name: "Manchester", postalCodes: ["M1", "M2", "M3"] },
    { name: "Birmingham", postalCodes: ["B1", "B2", "B5"] },
    { name: "Leeds", postalCodes: ["LS1", "LS2", "LS6"] },
    { name: "Glasgow", postalCodes: ["G1", "G2", "G3"] },
  ],
  DE: [
    { name: "Berlin", postalCodes: ["10115", "10117", "10969"] },
    { name: "Munich", postalCodes: ["80331", "80333", "80539"] },
    { name: "Hamburg", postalCodes: ["20095", "20354", "22041"] },
    { name: "Frankfurt", postalCodes: ["60311", "60313", "60329"] },
  ],
  AE: [
    { name: "Dubai", postalCodes: ["00000", "11111", "22222"] },
    { name: "Abu Dhabi", postalCodes: ["00000", "11111"] },
    { name: "Sharjah", postalCodes: ["00000"] },
  ],
  SA: [
    { name: "Riyadh", postalCodes: ["11564", "12211", "13315"] },
    { name: "Jeddah", postalCodes: ["21442", "21577", "23335"] },
    { name: "Dammam", postalCodes: ["32241", "32414"] },
  ],
  TR: [
    { name: "Istanbul", postalCodes: ["34000", "34110", "34710"] },
    { name: "Ankara", postalCodes: ["06000", "06100"] },
    { name: "Izmir", postalCodes: ["35000", "35210"] },
  ],
  IR: [
    { name: "Tehran", postalCodes: ["11369", "14155", "15117"] },
    { name: "Mashhad", postalCodes: ["91335", "91735"] },
    { name: "Isfahan", postalCodes: ["81464", "81746"] },
  ],
  AU: [
    { name: "Sydney", postalCodes: ["2000", "2010", "2060"] },
    { name: "Melbourne", postalCodes: ["3000", "3004", "3141"] },
    { name: "Brisbane", postalCodes: ["4000", "4006", "4101"] },
    { name: "Perth", postalCodes: ["6000", "6003", "6005"] },
  ],
};

export function findCountryIsoByName(name: string) {
  const normalized = name.trim().toLowerCase();
  return SHIPPING_COUNTRIES.find((country) => country.name.toLowerCase() === normalized)?.iso;
}

/** Normalize checkout country (full name or ISO) for delivery rule matching. */
export function normalizeDeliveryCountryCode(country?: string | null) {
  if (!country?.trim()) return undefined;
  const trimmed = country.trim();
  const iso = findCountryIsoByName(trimmed);
  if (iso) return iso.toUpperCase();
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  return trimmed;
}

export function countryCodesMatch(ruleCountryCode: string, targetCountry?: string) {
  if (!targetCountry?.trim()) return false;
  const normalizedTarget = normalizeDeliveryCountryCode(targetCountry);
  if (!normalizedTarget) return false;
  if (ruleCountryCode.toUpperCase() === normalizedTarget.toUpperCase()) {
    return true;
  }
  const targetName = SHIPPING_COUNTRIES.find(
    (country) => country.iso.toUpperCase() === normalizedTarget.toUpperCase()
  )?.name;
  return targetName?.toLowerCase() === ruleCountryCode.trim().toLowerCase();
}

export function getCitiesForCountryName(countryName: string): ShippingCityOption[] {
  const iso = findCountryIsoByName(countryName);
  if (!iso) return [];
  return CITIES_BY_ISO[iso] ?? [];
}

export function getCitiesForCountryIso(iso: string): ShippingCityOption[] {
  return CITIES_BY_ISO[iso] ?? [];
}

export function getPostalCodesForCity(countryName: string, cityName: string): string[] {
  const cities = getCitiesForCountryName(countryName);
  const city = cities.find(
    (entry) => entry.name.toLowerCase() === cityName.trim().toLowerCase()
  );
  return city?.postalCodes ?? [];
}

export function normalizeCountryName(countryName: string) {
  const normalized = countryName.trim().toLowerCase();
  if (!normalized) return "";
  return (
    SHIPPING_COUNTRIES.find((country) => country.name.toLowerCase() === normalized)?.name ??
    countryName.trim()
  );
}

export function normalizeCityNameForCountry(countryName: string, cityName: string) {
  const normalized = cityName.trim().toLowerCase();
  if (!normalized) return "";
  const match = getCitiesForCountryName(countryName).find(
    (city) => city.name.toLowerCase() === normalized
  );
  return match?.name ?? cityName.trim();
}

export function normalizePostalCodeForCity(
  countryName: string,
  cityName: string,
  postalCode: string
) {
  const normalized = postalCode.trim().toUpperCase();
  if (!normalized) return "";
  const match = getPostalCodesForCity(countryName, cityName).find(
    (code) => code.toUpperCase() === normalized
  );
  return match ?? normalized;
}
