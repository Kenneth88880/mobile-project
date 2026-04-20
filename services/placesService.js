import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSubscriptionStatus } from "./profileService";
import { CURRENT_USER_ID } from "./UserConfig";

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
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_PREFIX = "places_cache:";
const BASE_PLACES_KEY = "base_places";

// In-memory cache for the current session (faster than AsyncStorage)
const memoryCache = new Map();

// Dev-only request counter
let requestCount = 0;

const UID = CURRENT_USER_ID;

// ─── Session Guard ────────────────────────────────────────────────────────
// Caps API calls per app session to protect against bots and runaway bugs.
// Cached results do NOT count toward these limits — only real API calls.
// Limits reset when the user closes and reopens the app.
const SESSION_LIMITS = {
  nearbySearch: getSubscriptionStatus(UID) === "active" ? 50 : 25, 
  placeDetails: getSubscriptionStatus(UID) === "active" ? 30 : 15, 
};

const sessionCounts = {
  nearbySearch: 0,
  placeDetails: 0,
};

export const SESSION_LIMIT_ERROR = "SESSION_LIMIT_EXCEEDED";

function checkSessionLimit(type) {
  if (sessionCounts[type] >= SESSION_LIMITS[type]) {
    if (__DEV__)
      console.warn(
        `[PlacesAPI] Session limit reached for ${type} (${SESSION_LIMITS[type]} calls)`
      );
    throw new Error(SESSION_LIMIT_ERROR);
  }
  sessionCounts[type]++;
  if (__DEV__)
    console.log(
      `[PlacesAPI] ${type} session count: ${sessionCounts[type]}/${SESSION_LIMITS[type]}`
    );
}

// ─── Cache Helpers ────────────────────────────────────────────────────────
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

  // Fall back to AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        if (__DEV__) console.log(`[PlacesCache] Storage hit: ${key}`);
        memoryCache.set(key, { data, timestamp });
        return data;
      }
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    }
  } catch (e) {
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
    console.warn("[PlacesCache] Write error:", e);
  }
}

// ─── Base Places Cache ────────────────────────────────────────────────────
// Persists the initial all-category interleaved pool across component
// remounts and app reopens within the 2 hour TTL, preventing the 8
// parallel Nearby Search calls from firing on every screen remount.

export async function getBasePlacesCache() {
  return getCached(BASE_PLACES_KEY);
}

export async function setBasePlacesCache(places) {
  await setCached(BASE_PLACES_KEY, places);
  if (__DEV__)
    console.log(`[PlacesCache] Base places cached: ${places.length} results`);
}

export async function clearBasePlacesCache() {
  memoryCache.delete(BASE_PLACES_KEY);
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + BASE_PLACES_KEY);
    if (__DEV__) console.log(`[PlacesCache] Base places cache cleared`);
  } catch (e) {
    console.warn("[PlacesCache] Clear base places error:", e);
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
// Field mask is Pro tier only — no atmosphere fields.
// Atmosphere fields are deferred to getPlaceDetails() which only fires
// on explicit user tap, keeping Nearby Search off the Enterprise billing tier.
export async function searchNearbyPlaces({
  latitude,
  longitude,
  radius = 1500,
  includedTypes,
  excludedTypes,
  includedPrimaryTypes,
  maxResultCount = 10,
  rankPreference,
} = {}) {
  const cacheKey = JSON.stringify({
    latitude: latitude?.toFixed(3), // ~111m precision
    longitude: longitude?.toFixed(3),
    radius,
    includedTypes,
    excludedTypes,
    includedPrimaryTypes,
    maxResultCount,
    rankPreference,
  });

  // Cache check comes before session limit — cached results are free
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // Only count real API calls against the session limit
  checkSessionLimit("nearbySearch");

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
  if (includedPrimaryTypes?.length)
    body.includedPrimaryTypes = includedPrimaryTypes;
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
        "places.photos",
      ].join(","),
    },
    body: JSON.stringify(body),
  });

  if (__DEV__) console.log(`[PlacesAPI] Nearby Search status: ${res.status}`);

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
// Only fires on explicit user tap. Full atmosphere fields are fine here
// since this is called rarely compared to Nearby Search.
// Unused fields (types, currentOpeningHours) have been removed.
export async function getPlaceDetails(placeId) {
  const cacheKey = `details:${placeId}`;

  // Cache check before session limit — tapping the same place twice is free
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // Only count real API calls against the session limit
  checkSessionLimit("placeDetails");

  if (__DEV__) {
    requestCount++;
    console.log(`[PlacesAPI] Place Details call #${requestCount} — ${placeId}`);
  }

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
        "photos",
        "rating",
        "userRatingCount",
        "priceLevel",
        "websiteUri",
        "nationalPhoneNumber",
        "editorialSummary",
        // "types" — removed, never displayed in UI
        // "currentOpeningHours" — removed, never displayed in UI
      ].join(","),
    },
  });

  if (__DEV__) console.log(`[PlacesAPI] Place Details status: ${res.status}`);

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
export async function clearPlacesCache() {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    if (__DEV__)
      console.log(`[PlacesCache] Cleared ${cacheKeys.length} entries`);
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
  // Photos can come from Nearby Search (places[].photos) or Place Details (photos)
  // Both return an array of objects with a "name" field (resource path string)
  // e.g. "places/ChIJ.../photos/AXCi..."
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  const firstPhoto = photos.find((p) => typeof p?.name === "string") || null;
  const photoName = firstPhoto?.name || null;

  return {
    id: raw.id,
    place_id: raw.id,
    name: raw.displayName?.text ?? "",
    category:
      raw.primaryTypeDisplayName?.text || formatType(raw.primaryType) || "",
    primaryType: raw.primaryType || "",
    address: raw.formattedAddress || raw.shortFormattedAddress || "",
    latitude: raw.location?.latitude,
    longitude: raw.location?.longitude,
    phone: raw.nationalPhoneNumber || null,
    website: raw.websiteUri || null,
    photo_name: photoName,
    // Use 800px so the list card and detail screen share the same URL —
    // React Native's image cache serves the detail hero for free since
    // it was already downloaded for the list card.
    image_url: photoName ? getPhotoUrl(photoName, 800) : null,
    rating: raw.rating ?? null,
    user_ratings_total: raw.userRatingCount ?? null,
    price_range: formatPriceLevel(raw.priceLevel),
    editorial_summary: raw.editorialSummary?.text || null,
  };
}