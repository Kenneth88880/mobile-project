import "dotenv/config";

export default {
  expo: {
    name: "Doubly",
    slug: "doubly-yrvn0tmogrdrliugnun4w",
    owner: "doubly-connections-inc",
    version: "1.0.6",
    orientation: "portrait",
    icon: "./assets/doubly-icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/doubly-text-black.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.doublyconnections.doubly",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "We need your location to show you potential matches nearby.",
        NSPhotoLibraryUsageDescription:
          "We need access to your photos to let you upload profile pictures.",
        NSCameraUsageDescription:
          "We need access to your camera to take profile pictures.",
        ITSAppUsesNonExemptEncryption: false,
      },
      config: {
        googleSignIn: {
          reservedClientId:
            "com.googleusercontent.apps.418458858405-4o85k2vfuoqjdduvjobjgsds6k9bmvfm",
        },
        googleMapsApiKey: process.env.GOOGLE_PLACES_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      package: "com.doublyconnections.doubly",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
      ],
    },
    plugins: [
      "@react-native-firebase/app", 
      "./expo-firebase-plugin.cjs",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "", // Replace with actual merchant ID
          enableGooglePay: false, // or true if you want Google Pay
        },
      ],
      "expo-router",
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.0",
            useFrameworks: "static",
            useSPM: true,
          },
           android: {
            compileSdkVersion: 36,            
            targetSdkVersion: 35,
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "5d554221-bb9c-4245-884a-1b887d6673aa",
      },
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    },
  },
};
