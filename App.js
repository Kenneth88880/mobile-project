import React, { useState, useMemo, useEffect } from "react";
import { StyleSheet, View, Platform } from "react-native";
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
import { getAuth, onAuthStateChanged } from "firebase/auth";

import { setCurrentUserId } from "./services/UserConfig";
import DatingScreen from "./screens/DatingScreen";
import ExploreScreen from "./screens/ExploreScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ChatScreen from "./screens/ChatScreen";
import RequestsScreen from "./screens/RequestsScreen";
import PremiumScreen from "./screens/PremiumScreen";
import CheckoutScreen from "./screens/PaymentScreen";
import { STRIPE_PUBLISHABLE_KEY } from "./services/stripeConfig";
import SigninScreen from "./screens/SigninScreen";

const auth = getAuth();

export default function App() {
  const [activeTab, setActiveTab] = useState("dating");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
      }
    });

    return unsubscribe;
  }, []);

  const theme = useMemo(
    () => (isDarkMode ? darkTheme : lightTheme),
    [isDarkMode]
  );

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const routes = [
    {
      key: "dating",
      focusedIcon: "home",
      unfocusedIcon: "home-outline",
    },
    {
      key: "explore",
      focusedIcon: "compass",
      unfocusedIcon: "compass-outline",
    },
    {
      key: "likes",
      focusedIcon: "heart",
      unfocusedIcon: "heart-outline",
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
    dating: () => <DatingScreen />,
    likes: () => <RequestsScreen />,
    explore: () => <ExploreScreen />,
    messages: () => <ChatScreen />,
    //premium: () => <PremiumScreen />, //commenting out premiium tab
    // payment: () => <CheckoutScreen />,  // COMMENTED OUT - Payment disabled
    profile: () => (
      <ProfileScreen isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
    ),
  });

  if (user) {
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
  } else {
    return (
      <PaperProvider theme={theme}>
        <SigninScreen />
      </PaperProvider>
    );
  }
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
