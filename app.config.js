import "dotenv/config";

export default {
  expo: {
    name: "Doubly",
    slug: "doubly-yrvn0tmogrdrliugnun4w",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.doublyconnections.doubly",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      googleServicesFile: "./google-services.json",
      package: "com.doublyconnections.doubly",
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      //"./expo-firebase-plugin.cjs",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "dynamic",
            deploymentTarget: "15.1",
            buildReactNativeFromSource: true,
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "5d554221-bb9c-4245-884a-1b887d6673aa",
      },
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    },
  },
};
