export default {
  expo: {
    name: "Doubly",
    slug: "doubly",
    version: "1.0.0",
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
        projectId: "094bfe3f-c9f2-4df3-af59-aef5b61ad64b",
      },
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    },
  },
};
