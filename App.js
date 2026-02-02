import React, { useState, useMemo, useEffect } from "react";
import { StyleSheet, View, Platform, LogBox } from "react-native";
import {
  PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  BottomNavigation,
  Surface,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StripeProvider } from "@stripe/stripe-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// ✅ FIXED: Using React Native Firebase instead of web SDK
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

import { setCurrentUserId } from "./services/UserConfig";
import DatingScreen from "./screens/DatingScreen";
import ExploreScreen from "./screens/ExploreScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ChatScreen from "./screens/ChatScreen";
import RequestsScreen from "./screens/RequestsScreen";
import PremiumScreen from "./screens/PremiumScreen";
import CheckoutScreen from "./screens/PaymentScreen";
import Constants from "expo-constants";
const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.stripePublishableKey;
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState("dating");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [devMode, setDevMode] = useState(false);

  LogBox.ignoreLogs([
    "This method is deprecated",
    "Non-serializable values were found in the navigation state",
  ]);

  // Configure Firebase auth for development
  useEffect(() => {
    if (__DEV__) {
      // Disable app verification for development to avoid SMS limits and reCAPTCHA blocking
      auth().settings.appVerificationDisabledForTesting = true;
      console.log("Firebase auth: app verification disabled for testing");
    }
  }, []);

  // Load theme preference on app start
  useEffect(() => {
    loadThemePreference();
    loadDevModePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === "dark");
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    }
  };

  const loadDevModePreference = async () => {
    try {
      const savedDevMode = await AsyncStorage.getItem("devMode");
      if (savedDevMode !== null) {
        setDevMode(savedDevMode === "true");
      }
    } catch (error) {
      console.error("Error loading dev mode preference:", error);
    }
  };

  const handleDevModeChange = async (newValue) => {
    setDevMode(newValue);
    try {
      await AsyncStorage.setItem("devMode", newValue.toString());
    } catch (error) {
      console.error("Error saving dev mode preference:", error);
    }
  };

  useEffect(() => {
    let profileUnsubscribe = null;

    // ✅ FIXED: React Native Firebase auth listener
    const authUnsubscribe = auth().onAuthStateChanged(async (user) => {
      console.log("Auth state changed:", user ? user.uid : "null");
      setUser(user);
      if (user) {
        const { creationTime, lastSignInTime } = user.metadata;
        setIsNewUser(creationTime === lastSignInTime);
        setCurrentUserId(user.uid);

        // Check if profile is complete initially
        await checkProfileComplete(user.uid);

        // Listen for profile changes in real-time
        profileUnsubscribe = firestore()
          .collection("profiles")
          .doc(user.uid)
          .onSnapshot(
            (doc) => {
              if (doc.exists) {
                const profileData = doc.data();
                // Safely check if profile is complete
                const isComplete = !!(
                  profileData &&
                  profileData.name &&
                  profileData.age &&
                  profileData.gender &&
                  Array.isArray(profileData.genderPreference) &&
                  profileData.genderPreference.length > 0 &&
                  Array.isArray(profileData.photos) &&
                  profileData.photos.length > 0 &&
                  Array.isArray(profileData.tags) &&
                  profileData.tags.length >= 3
                );
                setProfileComplete(isComplete);
                setCheckingProfile(false);
              } else {
                setProfileComplete(false);
                setCheckingProfile(false);
              }
            },
            (error) => {
              console.error("Error listening to profile changes:", error);
              setProfileComplete(false);
              setCheckingProfile(false);
            },
          );
      } else {
        setCurrentUserId(null);
        setProfileComplete(false);
        setCheckingProfile(false);

        // Unsubscribe from profile listener if user logs out
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  const checkProfileComplete = async (userId) => {
    try {
      setCheckingProfile(true);
      const profileDoc = await firestore()
        .collection("profiles")
        .doc(userId)
        .get();

      if (profileDoc.exists) {
        const profileData = profileDoc.data();
        // Profile is complete if it has name, age, gender, genderPreference, photos, and tags
        const isComplete = !!(
          profileData &&
          profileData.name &&
          profileData.age &&
          profileData.gender &&
          Array.isArray(profileData.genderPreference) &&
          profileData.genderPreference.length > 0 &&
          Array.isArray(profileData.photos) &&
          profileData.photos.length > 0 &&
          Array.isArray(profileData.tags) &&
          profileData.tags.length >= 3
        );
        setProfileComplete(isComplete);
      } else {
        setProfileComplete(false);
      }
    } catch (error) {
      console.error("Error checking profile:", error);
      setProfileComplete(false);
    } finally {
      setCheckingProfile(false);
    }
  };

  // Removed old isNewUser logic - now handled by profile completion check

  const theme = useMemo(
    () => (isDarkMode ? darkTheme : lightTheme),
    [isDarkMode],
  );

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme ? "dark" : "light");
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const routes = [
    {
      key: "dating",
      focusedIcon: "home",
      unfocusedIcon: "home-outline",
    },
    {
      key: "likes",
      focusedIcon: "heart",
      unfocusedIcon: "heart-outline",
    },
    {
      key: "explore",
      focusedIcon: "compass",
      unfocusedIcon: "compass-outline",
    },
    {
      key: "messages",
      focusedIcon: "message",
      unfocusedIcon: "message-outline",
    },
    // Commented out premium tab
    //{
    //  key: "premium",
    //  focusedIcon: "star",
    //  unfocusedIcon: "star-outline",
    //},
    // COMMENTED OUT - Payment feature disabled until Stripe is configured
    // {
    //   key: "payment",
    //   focusedIcon: "credit-card",
    //   unfocusedIcon: "credit-card-outline",
    // },
    {
      key: "profile",
      focusedIcon: "account",
      unfocusedIcon: "account-outline",
    },
  ];

  const renderScene = BottomNavigation.SceneMap({
    dating: () => (
      <DatingScreen isActive={activeTab === "dating"} devMode={devMode} />
    ),
    likes: () => <RequestsScreen isActive={activeTab === "likes"} />,
    explore: () => <ExploreScreen isActive={activeTab === "explore"} />,
    messages: () => <ChatScreen isActive={activeTab === "messages"} />,
    //premium: () => <PremiumScreen />, //commenting out premiium tab
    // payment: () => <CheckoutScreen />,  // COMMENTED OUT - Payment disabled
    profile: () => (
      <ProfileScreen
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        devMode={devMode}
        setDevMode={handleDevModeChange}
      />
    ),
  });

  // Show loading while checking profile
  if (checkingProfile) {
    return (
      <PaperProvider theme={theme}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          {/* You can add a loading spinner here if desired */}
        </View>
      </PaperProvider>
    );
  }

  // If user is authenticated but profile is not complete, show SignUpScreen
  if (user && !profileComplete) {
    // Check if user signed up with email and hasn't verified yet
    const needsEmailVerification =
      user.providerData.some(
        (provider) => provider.providerId === "password",
      ) && !user.emailVerified;

    return (
      <PaperProvider theme={theme}>
        <SignUpScreen
          isInSignupFlow={true}
          needsEmailVerification={needsEmailVerification}
          userEmail={user.email}
          onNavigateToSignIn={() => {
            // Don't allow navigation to sign in if already signed up
            // User must complete the signup process
          }}
        />
      </PaperProvider>
    );
  }

  // If user is authenticated and profile is complete, show main app
  if (user && profileComplete) {
    return (
      <PaperProvider theme={theme}>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <SafeAreaView
            style={[
              styles.safeArea,
              { backgroundColor: theme.colors.elevation.level2 },
            ]}
            edges={["top", "left", "right"]}
          >
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <BottomNavigation
              navigationState={{
                index: routes.findIndex((r) => r.key === activeTab),
                routes,
              }}
              onIndexChange={(index) => setActiveTab(routes[index].key)}
              renderScene={renderScene}
              barStyle={{
                backgroundColor: theme.colors.elevation.level2,
                height: 70,
              }}
              activeColor={theme.colors.primary}
              inactiveColor={theme.colors.onSurfaceVariant}
              safeAreaInsets={{ bottom: 0 }}
            />
          </SafeAreaView>
        </StripeProvider>
      </PaperProvider>
    );
  }

  // If no user, show sign in/sign up screens
  return (
    <PaperProvider theme={theme}>
      {showRegister ? (
        <SignUpScreen onNavigateToSignIn={() => setShowRegister(false)} />
      ) : (
        <SignInScreen onNavigateToRegister={() => setShowRegister(true)} />
      )}
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

// Custom theme colors based on Material Design colors from colours/light.css
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "rgb(139, 74, 97)",
    surfaceTint: "rgb(139, 74, 97)",
    onPrimary: "rgb(255, 255, 255)",
    primaryContainer: "rgb(255, 217, 226)",
    onPrimaryContainer: "rgb(111, 51, 73)",
    secondary: "rgb(116, 86, 95)",
    onSecondary: "rgb(255, 255, 255)",
    secondaryContainer: "rgb(255, 217, 226)",
    onSecondaryContainer: "rgb(90, 63, 71)",
    tertiary: "rgb(124, 86, 53)",
    onTertiary: "rgb(255, 255, 255)",
    tertiaryContainer: "rgb(255, 220, 194)",
    onTertiaryContainer: "rgb(98, 63, 32)",
    error: "rgb(186, 26, 26)",
    onError: "rgb(255, 255, 255)",
    errorContainer: "rgb(255, 218, 214)",
    onErrorContainer: "rgb(147, 0, 10)",
    background: "rgb(255, 248, 248)",
    onBackground: "rgb(34, 25, 28)",
    surface: "rgb(255, 248, 248)",
    onSurface: "rgb(34, 25, 28)",
    surfaceVariant: "rgb(242, 221, 226)",
    onSurfaceVariant: "rgb(81, 67, 71)",
    outline: "rgb(131, 115, 119)",
    outlineVariant: "rgb(213, 194, 198)",
    shadow: "rgb(0, 0, 0)",
    scrim: "rgb(0, 0, 0)",
    inverseSurface: "rgb(55, 46, 48)",
    inverseOnSurface: "rgb(253, 237, 240)",
    inversePrimary: "rgb(255, 176, 201)",
    elevation: {
      level0: "transparent",
      level1: "rgb(255, 240, 242)",
      level2: "rgb(250, 234, 237)",
      level3: "rgb(245, 228, 231)",
      level4: "rgb(245, 228, 231)",
      level5: "rgb(239, 223, 225)",
    },
    surfaceDisabled: "rgba(34, 25, 28, 0.12)",
    onSurfaceDisabled: "rgba(34, 25, 28, 0.38)",
    backdrop: "rgba(55, 46, 48, 0.4)",
  },
};

// Custom theme colors based on Material Design colors from colours/dark.css
const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "rgb(255, 176, 201)",
    surfaceTint: "rgb(255, 176, 201)",
    onPrimary: "rgb(84, 29, 51)",
    primaryContainer: "rgb(111, 51, 73)",
    onPrimaryContainer: "rgb(255, 217, 226)",
    secondary: "rgb(226, 189, 199)",
    onSecondary: "rgb(66, 41, 49)",
    secondaryContainer: "rgb(90, 63, 71)",
    onSecondaryContainer: "rgb(255, 217, 226)",
    tertiary: "rgb(239, 189, 148)",
    onTertiary: "rgb(72, 41, 12)",
    tertiaryContainer: "rgb(98, 63, 32)",
    onTertiaryContainer: "rgb(255, 220, 194)",
    error: "rgb(255, 180, 171)",
    onError: "rgb(105, 0, 5)",
    errorContainer: "rgb(147, 0, 10)",
    onErrorContainer: "rgb(255, 218, 214)",
    background: "rgb(25, 17, 19)",
    onBackground: "rgb(239, 223, 225)",
    surface: "rgb(25, 17, 19)",
    onSurface: "rgb(239, 223, 225)",
    surfaceVariant: "rgb(81, 67, 71)",
    onSurfaceVariant: "rgb(213, 194, 198)",
    outline: "rgb(158, 140, 144)",
    outlineVariant: "rgb(81, 67, 71)",
    shadow: "rgb(0, 0, 0)",
    scrim: "rgb(0, 0, 0)",
    inverseSurface: "rgb(239, 223, 225)",
    inverseOnSurface: "rgb(55, 46, 48)",
    inversePrimary: "rgb(139, 74, 97)",
    elevation: {
      level0: "transparent",
      level1: "rgb(34, 25, 28)",
      level2: "rgb(38, 29, 32)",
      level3: "rgb(49, 40, 42)",
      level4: "rgb(49, 40, 42)",
      level5: "rgb(60, 50, 53)",
    },
    surfaceDisabled: "rgba(239, 223, 225, 0.12)",
    onSurfaceDisabled: "rgba(239, 223, 225, 0.38)",
    backdrop: "rgba(55, 46, 48, 0.4)",
  },
};
