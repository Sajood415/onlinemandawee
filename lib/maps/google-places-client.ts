"use client";

/**
 * Client-side loader for the Google Maps "places" library (Places API (New)).
 * Uses the modern, non-deprecated `AutocompleteSuggestion` request API so it
 * works on both old and newly-created Google Cloud API keys, and renders its
 * own dropdown UI instead of relying on Google's web component.
 */

export type ParsedGooglePlace = {
  addressLine1: string;
  city: string;
  country: string;
  countryCode: string;
  postalCode: string;
  formattedAddress: string;
  lat: number | null;
  lng: number | null;
};

let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

export function getGoogleMapsBrowserApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key ? key : null;
}

function loadScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(
      "google-maps-js-sdk"
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js-sdk";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

/** Loads (once) and returns the Places library, or null if no browser API key is configured. */
export async function loadGooglePlacesLibrary(): Promise<google.maps.PlacesLibrary | null> {
  if (typeof window === "undefined") return null;

  const apiKey = getGoogleMapsBrowserApiKey();
  if (!apiKey) return null;

  if (!placesLibraryPromise) {
    placesLibraryPromise = loadScript(apiKey).then(() =>
      google.maps.importLibrary("places")
    ) as Promise<google.maps.PlacesLibrary>;
  }

  try {
    return await placesLibraryPromise;
  } catch {
    placesLibraryPromise = null;
    return null;
  }
}

function findComponent(
  components: google.maps.places.AddressComponent[],
  type: string
) {
  return components.find((component) => component.types.includes(type));
}

/** Extracts { addressLine1, city, country, postalCode, lat, lng } from a fetched Place. */
export function parseGooglePlace(place: google.maps.places.Place): ParsedGooglePlace {
  const components = place.addressComponents ?? [];

  const streetNumber = findComponent(components, "street_number")?.longText ?? "";
  const route = findComponent(components, "route")?.longText ?? "";
  const city =
    findComponent(components, "locality")?.longText ??
    findComponent(components, "postal_town")?.longText ??
    findComponent(components, "administrative_area_level_2")?.longText ??
    "";
  const countryComponent = findComponent(components, "country");
  const postalCode = findComponent(components, "postal_code")?.longText ?? "";

  const addressLine1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  const location = place.location;

  return {
    addressLine1: addressLine1 || place.formattedAddress?.split(",")[0]?.trim() || "",
    city,
    country: countryComponent?.longText ?? "",
    countryCode: countryComponent?.shortText ?? "",
    postalCode,
    formattedAddress: place.formattedAddress ?? "",
    lat: location ? location.lat() : null,
    lng: location ? location.lng() : null,
  };
}
