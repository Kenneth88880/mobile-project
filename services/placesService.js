import Constants from "expo-constants";

// app.config.js exposes the key as extra.googlePlacesApiKey
const API_KEY =
  Constants.expoConfig?.extra?.googlePlacesApiKey ??
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
  "";

if (!API_KEY) {
  console.warn(
    "placesService: GOOGLE_PLACES_API_KEY is not set. " +
      "Make sure your .env contains EXPO_PUBLIC_GOOGLE_PLACES_API_KEY or " +
      "you expose it via app.config.js → extra.googlePlacesApiKey."
  );
}

const BASE = "https://places.googleapis.com/v1";

// ─── Nearby Search (New) ──────────────────────────────────────────────────
export async function searchNearbyPlaces({
  latitude,
  longitude,
  radius = 1500,
  includedTypes,
  excludedTypes,
  includedPrimaryTypes,
  maxResultCount = 20,
  rankPreference,
} = {}) {
  const body = {
    maxResultCount,
    locationRestriction: {
      circle: { center: { latitude, longitude }, radius },
    },
  };

  if (includedTypes?.length) body.includedTypes = includedTypes;
  if (excludedTypes?.length) body.excludedTypes = excludedTypes;
  if (includedPrimaryTypes?.length) body.includedPrimaryTypes = includedPrimaryTypes;
  if (rankPreference) body.rankPreference = rankPreference;

  const res = await fetch(`${BASE}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.location",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.types",
        "places.photos",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.currentOpeningHours",
        "places.editorialSummary",
      ].join(","),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nearby Search failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.places || []).map(normalisePlaceResult);
}

// ─── Place Details (New) ──────────────────────────────────────────────────
export async function getPlaceDetails(placeId) {
  const res = await fetch(`${BASE}/places/${placeId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": [
        "id",
        "displayName",
        "formattedAddress",
        "shortFormattedAddress",
        "location",
        "primaryType",
        "primaryTypeDisplayName",
        "types",
        "photos",
        "rating",
        "userRatingCount",
        "priceLevel",
        "websiteUri",
        "nationalPhoneNumber",
        "currentOpeningHours",
        "editorialSummary",
      ].join(","),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Place Details failed (${res.status}): ${err}`);
  }

  return normalisePlaceResult(await res.json());
}

// ─── Photo URL ────────────────────────────────────────────────────────────
/**
 * Build a photo URL from a photos[].name resource string.
 * e.g. "places/PLACE_ID/photos/PHOTO_RESOURCE"
 */
export function getPhotoUrl(photoName, maxWidth = 600) {
  if (!photoName) return null;
  return `${BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatPriceLevel(level) {
  const map = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };
  return map[level] || null;
}

function formatType(type) {
  if (!type) return "";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalisePlaceResult(raw) {
  const firstPhoto = raw.photos?.[0];
  return {
    id: raw.id,
    place_id: raw.id,
    name: raw.displayName?.text ?? "",
    category:
      raw.primaryTypeDisplayName?.text || formatType(raw.primaryType) || "",
    types: raw.types || [],
    primaryType: raw.primaryType || "",
    address: raw.formattedAddress || raw.shortFormattedAddress || "",
    latitude: raw.location?.latitude,
    longitude: raw.location?.longitude,
    phone: raw.nationalPhoneNumber || null,
    website: raw.websiteUri || null,
    photo_name: firstPhoto?.name || null,
    image_url: firstPhoto ? getPhotoUrl(firstPhoto.name, 600) : null,
    rating: raw.rating ?? null,
    user_ratings_total: raw.userRatingCount ?? null,
    price_range: formatPriceLevel(raw.priceLevel),
    editorial_summary: raw.editorialSummary?.text || null,
    opening_hours: raw.currentOpeningHours || null,
  };
}
