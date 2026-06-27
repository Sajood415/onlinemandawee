import "server-only";

import { env } from "@/config/env";

import { formatPostalAddress, type PostalAddressParts } from "@/lib/address/format-postal-address";

export type GeoCoordinates = {
  lat: number;
  lng: number;
};

export type PostalAddress = PostalAddressParts & {
  addressLine1: string;
  city: string;
  country: string;
};

export class MapsApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function normalizeCountryCode(country: string) {
  const value = country.trim().toLowerCase();
  if (value === "afghanistan" || value === "af") return "af";
  if (value === "united states" || value === "usa" || value === "us") return "us";
  if (value === "united kingdom" || value === "uk" || value === "gb") return "gb";
  if (value === "canada" || value === "ca") return "ca";
  return undefined;
}

function buildGeocodeQueries(address: PostalAddress) {
  const queries = [
    formatPostalAddress(address),
    [address.addressLine1, address.city, address.country].filter(Boolean).join(", "),
    [address.city, address.postalCode, address.country].filter(Boolean).join(", "),
    [address.city, address.country].filter(Boolean).join(", "),
  ];

  return [...new Set(queries.map((query) => query.trim()).filter((query) => query.length > 0))];
}

function shouldUseDevFallback() {
  return env.NODE_ENV === "development" && !env.GOOGLE_MAPS_API_KEY;
}

function getApiKey() {
  const key = env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    if (shouldUseDevFallback()) {
      return null;
    }
    throw new MapsApiError(
      "MAPS_NOT_CONFIGURED",
      "Delivery distance calculation is not configured. Set GOOGLE_MAPS_API_KEY in .env.local and enable Geocoding API + Distance Matrix API."
    );
  }
  return key;
}

function haversineKm(origin: GeoCoordinates, destination: GeoCoordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(destination.lat - origin.lat);
  const lngDelta = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(lngDelta / 2) ** 2;
  const straightLineKm = 2 * earthRadiusKm * Math.asin(Math.sqrt(a));

  return straightLineKm * 1.3;
}

async function geocodeQueryWithNominatim(
  query: string,
  countryCode?: string
): Promise<GeoCoordinates | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  if (countryCode) {
    url.searchParams.set("countrycodes", countryCode);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": `${env.APP_NAME}/1.0 (delivery-dev-fallback)`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string }>;
  const match = data[0];
  if (!match) {
    return null;
  }

  return {
    lat: Number(match.lat),
    lng: Number(match.lon),
  };
}

async function geocodeAddressWithNominatim(address: PostalAddress): Promise<GeoCoordinates> {
  const countryCode = normalizeCountryCode(address.country);

  for (const query of buildGeocodeQueries(address)) {
    const result = await geocodeQueryWithNominatim(query, countryCode);
    if (result) {
      return result;
    }
  }

  throw new MapsApiError(
    "ADDRESS_NOT_FOUND",
    "We could not find that address. Please verify the street, city, and country."
  );
}

type GoogleGeocodeResult =
  | { kind: "ok"; coordinates: GeoCoordinates }
  | { kind: "not_found" }
  | { kind: "api_error"; message: string };

async function geocodeQueryWithGoogle(
  query: string,
  key: string
): Promise<GoogleGeocodeResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    return { kind: "api_error", message: "Google Geocoding request failed." };
  }

  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
  };

  if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
    return {
      kind: "api_error",
      message: data.error_message ?? "Google Geocoding API rejected the request.",
    };
  }

  const location = data.results?.[0]?.geometry?.location;
  if (data.status !== "OK" || !location) {
    return { kind: "not_found" };
  }

  return {
    kind: "ok",
    coordinates: { lat: location.lat, lng: location.lng },
  };
}

async function geocodeAddressWithGoogle(
  address: PostalAddress,
  key: string
): Promise<GeoCoordinates> {
  let apiErrorMessage: string | null = null;

  for (const query of buildGeocodeQueries(address)) {
    const result = await geocodeQueryWithGoogle(query, key);
    if (result.kind === "ok") {
      return result.coordinates;
    }
    if (result.kind === "api_error") {
      apiErrorMessage = result.message;
      break;
    }
  }

  if (apiErrorMessage) {
    console.warn(`[maps] Google geocoding unavailable (${apiErrorMessage}) — trying OpenStreetMap.`);
    return geocodeAddressWithNominatim(address);
  }

  throw new MapsApiError(
    "ADDRESS_NOT_FOUND",
    "We could not find that delivery address. Please verify the street, city, and country."
  );
}

export async function geocodeAddress(address: PostalAddress): Promise<GeoCoordinates> {
  const key = getApiKey();

  if (!key) {
    console.warn(
      "[maps] GOOGLE_MAPS_API_KEY is missing — using OpenStreetMap geocoding for local development."
    );
    return geocodeAddressWithNominatim(address);
  }

  try {
    return await geocodeAddressWithGoogle(address, key);
  } catch (error) {
    if (error instanceof MapsApiError && error.code === "ADDRESS_NOT_FOUND") {
      console.warn("[maps] Google geocoding missed — trying OpenStreetMap fallback.");
      return geocodeAddressWithNominatim(address);
    }
    throw error;
  }
}

async function getDrivingDistanceKmWithGoogle(
  origin: GeoCoordinates,
  destination: GeoCoordinates,
  key: string
): Promise<number> {
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destinations", `${destination.lat},${destination.lng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("units", "metric");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    throw new MapsApiError(
      "DISTANCE_UNAVAILABLE",
      "Could not calculate delivery distance. Please try again."
    );
  }

  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    rows?: Array<{
      elements?: Array<{
        status: string;
        distance?: { value: number };
      }>;
    }>;
  };

  if (data.status !== "OK") {
    const detail = data.error_message ? ` ${data.error_message}` : "";
    throw new MapsApiError(
      "DISTANCE_UNAVAILABLE",
      `Could not calculate delivery distance.${detail}`
    );
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK" || element.distance == null) {
    // Driving routes are often missing in Afghanistan (ZERO_RESULTS). Estimate from coordinates.
    const routeStatus = element?.status ?? "missing";
    if (routeStatus === "ZERO_RESULTS" || routeStatus === "NOT_FOUND" || routeStatus === "missing") {
      console.warn(
        `[maps] Distance Matrix returned ${routeStatus} — using straight-line estimate.`
      );
      return haversineKm(origin, destination);
    }

    throw new MapsApiError(
      "DISTANCE_UNAVAILABLE",
      "Could not calculate driving distance to your address. Please check the address and try again."
    );
  }

  return element.distance.value / 1000;
}

export async function getDrivingDistanceKm(
  origin: GeoCoordinates,
  destination: GeoCoordinates
): Promise<number> {
  const key = getApiKey();

  if (!key) {
    return haversineKm(origin, destination);
  }

  try {
    return await getDrivingDistanceKmWithGoogle(origin, destination, key);
  } catch (error) {
    if (error instanceof MapsApiError && error.code === "DISTANCE_UNAVAILABLE") {
      console.warn("[maps] Distance Matrix failed — using straight-line estimate.", error.message);
      return haversineKm(origin, destination);
    }
    throw error;
  }
}
