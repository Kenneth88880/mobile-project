module.exports = {
  expo: {
    name: "mobile-project",
    slug: "mobile-project",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.galaxies.firebase",
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.galaxies.firebase",
      googleServicesFile: "services/google-services.json",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],

    ],
    extra: {
      router: {},
      eas: {
        projectId: "dfbf77be-2a46-4218-bf66-c8c8f00a4956",
      },
    },
    owner: "k0k0",
  },
};
