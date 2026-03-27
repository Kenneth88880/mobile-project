import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── API Key ──────────────────────────────────────────────────────────────
const API_KEY =
  Platform.select({
    ios: Constants.expoConfig?.extra?.googlePlacesApiKeyIOS,
    android: Constants.expoConfig?.extra?.googlePlacesApiKeyAndroid,
  }) ??
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

// ─── Cache Config ─────────────────────────────────────────────────────────
// Results are cached for 2 hours before being considered stale
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const CACHE_PREFIX = "places_cache:";

// In-memory cache for the current session (faster than AsyncStorage)
const memoryCache = new Map();

// Dev-only request counter to track how many API calls are made per session
let requestCount = 0;

async function getCached(key) {
  // Check memory cache first
  if (memoryCache.has(key)) {
    const { data, timestamp } = memoryCache.get(key);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      if (__DEV__) console.log(`[PlacesCache] Memory hit: ${key}`);
      return data;
    }
    memoryCache.delete(key);
  }

  // Fall back to AsyncStorage for persistence across sessions
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        if (__DEV__) console.log(`[PlacesCache] Storage hit: ${key}`);
        // Promote back to memory cache
        memoryCache.set(key, { data, timestamp });
        return data;
      }
      // Expired — clean up
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    }
  } catch (e) {
    // Cache read failure is non-fatal
    console.warn("[PlacesCache] Read error:", e);
  }

  return null;
}

async function setCached(key, data) {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Cache write failure is non-fatal
    console.warn("[PlacesCache] Write error:", e);
  }
}

// ─── Debounce Helper ──────────────────────────────────────────────────────
const debounceTimers = new Map();

export function debounceSearch(fn, key, delay = 500) {
  return (...args) => {
    if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key));
    return new Promise((resolve, reject) => {
      debounceTimers.set(
        key,
        setTimeout(async () => {
          try {
            resolve(await fn(...args));
          } catch (e) {
            reject(e);
          }
        }, delay)
      );
    });
  };
}

// ─── Nearby Search (New) ──────────────────────────────────────────────────
// Field mask is intentionally slim — only Basic + Pro tier fields.
// Atmosphere fields (rating, priceLevel, editorialSummary, currentOpeningHours)
// are deferred to getPlaceDetails(), which only fires when a user taps a place.
// This keeps Nearby Search off the Enterprise + Atmosphere billing tier (~$0.035)
// and on the Basic/Pro tier (~$0.017), roughly halving the cost per search.
export async function searchNearbyPlaces({
  latitude,
  longitude,
  radius = 1500,
  includedTypes,
  excludedTypes,
  includedPrimaryTypes,
  maxResultCount = 10, // reduced from 20 — users rarely scroll all 20 results
  rankPreference,
} = {}) {
  const cacheKey = JSON.stringify({
    latitude: latitude?.toFixed(3), // ~111m precision, avoids cache misses for tiny movements
    longitude: longitude?.toFixed(3),
    radius,
    includedTypes,
    excludedTypes,
    includedPrimaryTypes,
    maxResultCount,
    rankPreference,
  });

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  if (__DEV__) {
    requestCount++;
    console.log(`[PlacesAPI] Nearby Search call #${requestCount}`);
  }

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
      // Basic + Pro fields only — no atmosphere fields here
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.location",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.types",
        "places.photos",          // Pro tier, but cheap and needed for list cards
      ].join(","),
    },
    body: JSON.stringify(body),
  });

  if (__DEV__) {
    console.log(`[PlacesAPI] Nearby Search status: ${res.status}`);
  }

  if (!res.ok) {
    const err = await res.text();
    if (__DEV__) console.log(`[PlacesAPI] Nearby Search error: ${err}`);
    throw new Error(`Nearby Search failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const results = (data.places || []).map(normalisePlaceResult);

  await setCached(cacheKey, results);
  return results;
}

// ─── Place Details (New) ──────────────────────────────────────────────────
// Full atmosphere fields are fetched here, only when a user taps a specific place.
// Place Details calls are much less frequent than Nearby Search calls.
export async function getPlaceDetails(placeId) {
  const cacheKey = `details:${placeId}`;

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  if (__DEV__) {
    requestCount++;
    console.log(`[PlacesAPI] Place Details call #${requestCount} — ${placeId}`);
  }

  const res = await fetch(`${BASE}/places/${placeId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      // Full field mask here — atmosphere fields are fine on Details
      // since this only fires on explicit user tap
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

  if (__DEV__) {
    console.log(`[PlacesAPI] Place Details status: ${res.status}`);
  }

  if (!res.ok) {
    const err = await res.text();
    if (__DEV__) console.log(`[PlacesAPI] Place Details error: ${err}`);
    throw new Error(`Place Details failed (${res.status}): ${err}`);
  }

  const result = normalisePlaceResult(await res.json());
  await setCached(cacheKey, result);
  return result;
}

// ─── Photo URL ────────────────────────────────────────────────────────────
export function getPhotoUrl(photoName, maxWidth = 600) {
  if (!photoName) return null;
  return `${BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}

// ─── Cache Management ─────────────────────────────────────────────────────
// Call this if you ever need to force-refresh results (e.g. pull to refresh)
export async function clearPlacesCache() {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    if (__DEV__) console.log(`[PlacesCache] Cleared ${cacheKeys.length} entries`);
  } catch (e) {
    console.warn("[PlacesCache] Clear error:", e);
  }
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