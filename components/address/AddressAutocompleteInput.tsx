"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import {
  loadGooglePlacesLibrary,
  parseGooglePlace,
  type ParsedGooglePlace,
} from "@/lib/maps/google-places-client";

type Suggestion = {
  placeId: string;
  text: string;
  prediction: google.maps.places.PlacePrediction;
};

type AddressAutocompleteInputProps = {
  id?: string;
  className?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  onTextChange: (value: string) => void;
  onPlaceSelect: (place: ParsedGooglePlace) => void;
  onBlur?: () => void;
  countryCodes?: string[];
};

/**
 * A plain text input that, when a Google Maps browser API key is configured
 * (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), shows live address suggestions and
 * fills in the full address (street, city, country, postal code) on
 * selection. Degrades to a normal text input when no key is configured.
 */
export function AddressAutocompleteInput({
  id,
  className,
  value,
  placeholder,
  disabled,
  required,
  maxLength,
  onTextChange,
  onPlaceSelect,
  onBlur,
  countryCodes,
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placesAvailable, setPlacesAvailable] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placesLibraryRef = useRef<google.maps.PlacesLibrary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadGooglePlacesLibrary().then((library) => {
      if (cancelled || !library) return;
      placesLibraryRef.current = library;
      setPlacesAvailable(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const countryCodesKey = useMemo(() => countryCodes?.join(",") ?? "", [countryCodes]);

  const fetchSuggestions = (query: string) => {
    const library = placesLibraryRef.current;
    if (!library || query.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new library.AutocompleteSessionToken();
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      sessionToken: sessionTokenRef.current,
      includedRegionCodes: countryCodesKey ? countryCodesKey.split(",") : undefined,
    })
      .then((response) => {
        if (requestId !== requestIdRef.current) return;
        const next = response.suggestions
          .map((suggestion) => suggestion.placePrediction)
          .filter((prediction): prediction is google.maps.places.PlacePrediction => Boolean(prediction))
          .map((prediction) => ({
            placeId: prediction.placeId,
            text: prediction.text.text,
            prediction,
          }));
        setSuggestions(next);
        setOpen(next.length > 0);
        setHighlightedIndex(-1);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setOpen(false);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  };

  const handleTextChange = (nextValue: string) => {
    onTextChange(nextValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!placesAvailable) return;

    debounceRef.current = setTimeout(() => fetchSuggestions(nextValue), 300);
  };

  const selectSuggestion = async (suggestion: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    try {
      const place = suggestion.prediction.toPlace();
      const { place: fetchedPlace } = await place.fetchFields({
        fields: ["addressComponents", "formattedAddress", "location"],
      });
      const parsed = parseGooglePlace(fetchedPlace);
      onTextChange(parsed.addressLine1 || suggestion.text);
      onPlaceSelect(parsed);
    } catch {
      onTextChange(suggestion.text);
    } finally {
      sessionTokenRef.current = null;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0) {
        event.preventDefault();
        void selectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          className={className}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          autoComplete="off"
          onChange={(event) => handleTextChange(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId}>
              <button
                type="button"
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                  index === highlightedIndex ? "bg-neutral-50" : ""
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectSuggestion(suggestion)}
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
                <span className="text-neutral-800">{suggestion.text}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
