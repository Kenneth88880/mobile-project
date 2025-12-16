module.exports = {
  expo: {
    name: "Doubly",
    slug: "doubly",
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
      bundleIdentifier: "com.yourcompany.doubly", // ← Changed
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.yourcompany.doubly", // ← Changed
      googleServicesFile: "./google-services.json", // ← Fixed path
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
        projectId: "094bfe3f-c9f2-4df3-af59-aef5b61ad64b",
      },
    },
    owner: "k0k0",
  },
};
