// locationTracker.js
import * as Location from 'expo-location';
import { saveUserProfile, getUserProfile } from '../services/profileService';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Live Location Tracker
 * Handles real-time location updates and last active tracking
 */
class LocationTracker {
  constructor() {
    this.locationSubscription = null;
    this.updateInterval = null;
    this.currentUserId = null;
    this.isTracking = false;
    this.lastUpdateTime = null;
  }

  /**
   * Start live location tracking
   * Updates location every 5 minutes while app is active
   * Also updates "lastActive" timestamp
   * 
   * @param {string} userId - Current user ID
   * @param {number} updateIntervalMinutes - How often to update (default: 5 minutes)
   */
  async startTracking(userId, updateIntervalMinutes = 5) {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    this.currentUserId = userId;
    this.isTracking = true;

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
        this.isTracking = false;
        return false;
      }

      // Initial location update
      await this.updateLocationAndStatus();

      // Set up periodic updates
      const intervalMs = updateIntervalMinutes * 60 * 1000;
      this.updateInterval = setInterval(async () => {
        await this.updateLocationAndStatus();
      }, intervalMs);

      console.log(`Live location tracking started (updates every ${updateIntervalMinutes} minutes)`);
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Update user's location and last active timestamp
   */
  async updateLocationAndStatus() {
    if (!this.currentUserId) return;

    try {
      // Get current location
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Get city name
      let city = 'Unknown';
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          city = address.city || address.subregion || address.region || 'Unknown';
        }
      } catch (geocodeError) {
        console.error('Error getting city:', geocodeError);
      }

      // Get current profile
      const currentProfile = await getUserProfile(this.currentUserId);
      
      if (currentProfile) {
        // Update location and last active time
        await saveUserProfile(this.currentUserId, {
          ...currentProfile,
          latitude,
          longitude,
          city,
          lastActive: new Date().toISOString(), // ISO string for easy parsing
          isOnline: true, // User is currently active
        });

        this.lastUpdateTime = new Date();
        console.log(`Location updated for user ${this.currentUserId}: ${city} (${latitude}, ${longitude})`);
      }
    } catch (error) {
      console.error('Error updating location and status:', error);
    }
  }

  /**
   * Update only the last active status (no location change)
   * Call this on app interactions to show user is active
   */
  async updateLastActive() {
    if (!this.currentUserId) return;

    try {
      const currentProfile = await getUserProfile(this.currentUserId);
      
      if (currentProfile) {
        await saveUserProfile(this.currentUserId, {
          ...currentProfile,
          lastActive: new Date().toISOString(),
          isOnline: true,
        });
      }
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  /**
   * Mark user as offline
   * Call this when app goes to background or closes
   */
  async setOffline() {
    if (!this.currentUserId) return;

    try {
      const currentProfile = await getUserProfile(this.currentUserId);
      
      if (currentProfile) {
        await saveUserProfile(this.currentUserId, {
          ...currentProfile,
          lastActive: new Date().toISOString(),
          isOnline: false,
        });
      }
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
  }

  /**
   * Stop location tracking
   * Call when user logs out or wants to disable tracking
   */
  async stopTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Mark user as offline
    await this.setOffline();

    this.isTracking = false;
    this.currentUserId = null;
    console.log('Location tracking stopped');
  }

  /**
   * Check if tracking is active
   */
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      userId: this.currentUserId,
      lastUpdate: this.lastUpdateTime,
    };
  }
}

/**
 * Helper function to format "last active" time
 * Returns strings like "Active now", "Active 5m ago", "Active 2h ago", etc.
 */
export const formatLastActive = (lastActiveISO, isOnline = false) => {
  if (!lastActiveISO) {
    return 'Last seen: Unknown';
  }

  // If user is marked as online, show "Active now"
  if (isOnline) {
    return '🟢 Active now';
  }

  const lastActiveDate = new Date(lastActiveISO);
  const now = new Date();
  const diffMs = now - lastActiveDate;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return '🟢 Active now';
  } else if (diffMinutes < 60) {
    return `🟡 Active ${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `🟡 Active ${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `⚪ Active ${diffDays}d ago`;
  } else {
    return '⚪ Last seen: More than a week ago';
  }
};

/**
 * Get the colored status indicator
 */
export const getStatusIndicator = (lastActiveISO, isOnline = false) => {
  if (!lastActiveISO) {
    return '⚪'; // Gray - unknown
  }

  if (isOnline) {
    return '🟢'; // Green - online now
  }

  const lastActiveDate = new Date(lastActiveISO);
  const now = new Date();
  const diffMinutes = Math.floor((now - lastActiveDate) / 60000);

  if (diffMinutes < 5) {
    return '🟢'; // Green - recently active
  } else if (diffMinutes < 60) {
    return '🟡'; // Yellow - active within last hour
  } else {
    return '⚪'; // Gray - offline
  }
};

// Singleton instance
const locationTracker = new LocationTracker();

export default locationTracker;