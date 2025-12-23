import Constants from "expo-constants";

const GOOGLE_PLACES_CONFIG = {
  PLACES_API_KEY: Constants.expoConfig?.extra?.googlePlacesApiKey,
};

export default GOOGLE_PLACES_CONFIG;

export const { PLACES_API_KEY, DEFAULT_LOCATION } = GOOGLE_PLACES_CONFIG;
