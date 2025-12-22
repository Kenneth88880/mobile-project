// locationUtils.js
import * as Location from 'expo-location';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';

/**
 * Calculate distance between two coordinates using the Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
};

/**
 * Format distance for display
 * - If less than 1km, show in meters
 * - If less than 100km, show with 1 decimal
 * - Otherwise, round to nearest km
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 100) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
};

/**
 * Get user's current location
 * Returns { latitude, longitude, city } or null if permission denied
 */
export const getCurrentLocation = async () => {
  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    // Reverse geocode to get city
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const city = address.city || address.subregion || address.region || 'Unknown';
        
        return {
          latitude,
          longitude,
          city,
        };
      }
    } catch (geocodeError) {
      console.error('Error reverse geocoding:', geocodeError);
      // Still return coordinates even if city lookup fails
      return {
        latitude,
        longitude,
        city: 'Unknown',
      };
    }

    return {
      latitude,
      longitude,
      city: 'Unknown',
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

/**
 * Calculate and format distance between user and profile
 * Returns formatted string like "5.2km away" or "In your city" or null
 */
export const getDistanceToProfile = (userLocation, profileLocation) => {
  if (!userLocation || !profileLocation) {
    return null;
  }

  const { latitude: userLat, longitude: userLon, city: userCity } = userLocation;
  const { latitude: profileLat, longitude: profileLon, city: profileCity } = profileLocation;

  // Check if both have valid coordinates
  if (!userLat || !userLon || !profileLat || !profileLon) {
    // If no coordinates but we have cities, show city
    if (userCity && profileCity) {
      if (userCity.toLowerCase() === profileCity.toLowerCase()) {
        return `📍 In ${profileCity}`;
      }
      return `📍 ${profileCity}`;
    }
    return null;
  }

  // Calculate distance
  const distance = calculateDistance(userLat, userLon, profileLat, profileLon);
  
  // If very close (less than 500m), say "Nearby"
  if (distance < 0.5) {
    return '📍 Nearby';
  }
  
  // If same city and less than 20km, show "In [city]"
  if (userCity && profileCity && 
      userCity.toLowerCase() === profileCity.toLowerCase() && 
      distance < 20) {
    return `📍 In ${profileCity}`;
  }
  
  // Otherwise show distance
  return `📍 ${formatDistance(distance)}`;
};

/**
 * Generate geohash for a location
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string} geohash string
 */
export const generateGeohash = (latitude, longitude) => {
  if (!latitude || !longitude) {
    return null;
  }
  return geohashForLocation([latitude, longitude]);
};

/**
 * Get geohash query bounds for a given center point and radius
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radiusInKm - Radius in kilometers
 * @returns {Array} Array of [start, end] bound pairs for querying
 */
export const getGeohashQueryBounds = (latitude, longitude, radiusInKm) => {
  if (!latitude || !longitude || !radiusInKm) {
    return [];
  }

  const radiusInM = radiusInKm * 1000; // Convert to meters
  const center = [latitude, longitude];

  return geohashQueryBounds(center, radiusInM);
};

/**
 * Check if a profile is within the maximum distance
 * @param {object} userLocation - {latitude, longitude}
 * @param {object} profileLocation - {latitude, longitude}
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {boolean} true if within range
 */
export const isWithinDistance = (userLocation, profileLocation, maxDistanceKm) => {
  if (!userLocation?.latitude || !userLocation?.longitude ||
      !profileLocation?.latitude || !profileLocation?.longitude) {
    return false;
  }

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    profileLocation.latitude,
    profileLocation.longitude
  );

  return distance <= maxDistanceKm;
};

/**
 * Filter profiles by distance using geohash
 * This is a client-side filter to be used after fetching from Firestore
 * @param {Array} profiles - Array of profile objects
 * @param {object} userLocation - {latitude, longitude}
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {Array} Filtered profiles within distance
 */
export const filterProfilesByDistance = (profiles, userLocation, maxDistanceKm) => {
  if (!profiles || !userLocation?.latitude || !userLocation?.longitude) {
    return profiles || [];
  }

  return profiles.filter(profile => {
    if (!profile.latitude || !profile.longitude) {
      return false; // Exclude profiles without location
    }

    return isWithinDistance(userLocation, profile, maxDistanceKm);
  });
};