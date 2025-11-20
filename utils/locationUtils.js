// locationUtils.js
import * as Location from 'expo-location';

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