import React, { useState, useMemo } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import {
  PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  BottomNavigation,
  configureFonts,
} from "react-native-paper";
import { UserProvider } from "./context/UserContext";
import { StatusBar } from "expo-status-bar";
import { StripeProvider } from '@stripe/stripe-react-native';

import DatingScreen from "./screens/DatingScreen";
import ExploreScreen from "./screens/ExploreScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ChatScreen from "./screens/ChatScreen";
import PremiumScreen from "./screens/PremiumScreen";
import RequestsScreen from "./screens/RequestsScreen";
import CheckoutScreen from "./screens/PaymentScreen";
import { STRIPE_PUBLISHABLE_KEY } from "./services/stripeConfig";
import SigninScreen from "./screens/SigninScreen";

export default function App() {
  // const [activeTab, setActiveTab] = useState("dating");
  // const [isDarkMode, setIsDarkMode] = useState(false);

  // const theme = useMemo(
  //   () => (isDarkMode ? darkTheme : lightTheme),
  //   [isDarkMode]
  // );

  // const toggleTheme = () => {
  //   setIsDarkMode(!isDarkMode);
  // };

  // const routes = [
  //   {
  //     key: "dating",
  //     focusedIcon: "heart",
  //     unfocusedIcon: "heart-outline",
  //   },
  //   {
  //     key: "explore",
  //     focusedIcon: "compass",
  //     unfocusedIcon: "compass-outline",
  //   },
  //   {
  //     key: "messages",
  //     focusedIcon: "message",
  //     unfocusedIcon: "message-outline",
  //   },
  //   {
  //     key: "premium",
  //     focusedIcon: "star",
  //     unfocusedIcon: "star-outline",
  //   },
  //   {
  //     key: "payment",
  //     focusedIcon: "credit-card",
  //     unfocusedIcon: "credit-card-outline",
  //   },
  //   {
  //     key: "profile",
  //     focusedIcon: "account",
  //     unfocusedIcon: "account-outline",
  //   },
  // ];

  // const renderScene = BottomNavigation.SceneMap({
  //   dating: () => <DatingScreen />,
  //   explore: () => <ExploreScreen />,
  //   messages: () => <ChatScreen />,
  //   premium: () => <PremiumScreen />,
  //   payment: () => <CheckoutScreen />,
  //   profile: () => (
  //     <ProfileScreen isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
  //   ),
  // });

  // return (
  //   <PaperProvider theme={theme}>
  //     <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
  //       <UserProvider>
  //         <SafeAreaView
  //           style={[
  //             styles.container,
  //             { backgroundColor: theme.colors.background },
  //           ]}
  //         >
  //           <StatusBar style={isDarkMode ? "light" : "dark"} />

  //           <BottomNavigation
  //             navigationState={{
  //               index: routes.findIndex((r) => r.key === activeTab),
  //               routes,
  //             }}
  //             onIndexChange={(index) => setActiveTab(routes[index].key)}
  //             renderScene={renderScene}
  //             barStyle={{ backgroundColor: theme.colors.surface }}
  //           />
  //         </SafeAreaView>
  //       </UserProvider>
  //     </StripeProvider>
  //   </PaperProvider>
  // );

  return (
    <SigninScreen >
    </ SigninScreen> 
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Custom theme colors based on your light and dark mode specs
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "rgb(120, 69, 172)",
    onPrimary: "rgb(255, 255, 255)",
    primaryContainer: "rgb(240, 219, 255)",
    onPrimaryContainer: "rgb(44, 0, 81)",
    secondary: "rgb(102, 90, 111)",
    onSecondary: "rgb(255, 255, 255)",
    secondaryContainer: "rgb(237, 221, 246)",
    onSecondaryContainer: "rgb(33, 24, 42)",
    tertiary: "rgb(128, 81, 88)",
    onTertiary: "rgb(255, 255, 255)",
    tertiaryContainer: "rgb(255, 217, 221)",
    onTertiaryContainer: "rgb(50, 16, 23)",
    error: "rgb(186, 26, 26)",
    onError: "rgb(255, 255, 255)",
    errorContainer: "rgb(255, 218, 214)",
    onErrorContainer: "rgb(65, 0, 2)",
    background: "rgb(255, 251, 255)",
    onBackground: "rgb(29, 27, 30)",
    surface: "rgb(255, 251, 255)",
    onSurface: "rgb(29, 27, 30)",
    surfaceVariant: "rgb(233, 223, 235)",
    onSurfaceVariant: "rgb(74, 69, 78)",
    outline: "rgb(124, 117, 126)",
    outlineVariant: "rgb(204, 196, 206)",
    shadow: "rgb(0, 0, 0)",
    scrim: "rgb(0, 0, 0)",
    inverseSurface: "rgb(50, 47, 51)",
    inverseOnSurface: "rgb(245, 239, 244)",
    inversePrimary: "rgb(220, 184, 255)",
    elevation: {
      level0: "transparent",
      level1: "rgb(248, 242, 251)",
      level2: "rgb(244, 236, 248)",
      level3: "rgb(240, 231, 246)",
      level4: "rgb(239, 229, 245)",
      level5: "rgb(236, 226, 243)",
    },
    surfaceDisabled: "rgba(29, 27, 30, 0.12)",
    onSurfaceDisabled: "rgba(29, 27, 30, 0.38)",
    backdrop: "rgba(51, 47, 55, 0.4)",
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "rgb(220, 184, 255)",
    onPrimary: "rgb(71, 12, 122)",
    primaryContainer: "rgb(95, 43, 146)",
    onPrimaryContainer: "rgb(240, 219, 255)",
    secondary: "rgb(208, 193, 218)",
    onSecondary: "rgb(54, 44, 63)",
    secondaryContainer: "rgb(77, 67, 87)",
    onSecondaryContainer: "rgb(237, 221, 246)",
    tertiary: "rgb(243, 183, 190)",
    onTertiary: "rgb(75, 37, 43)",
    tertiaryContainer: "rgb(101, 58, 65)",
    onTertiaryContainer: "rgb(255, 217, 221)",
    error: "rgb(255, 180, 171)",
    onError: "rgb(105, 0, 5)",
    errorContainer: "rgb(147, 0, 10)",
    onErrorContainer: "rgb(255, 180, 171)",
    background: "rgb(29, 27, 30)",
    onBackground: "rgb(231, 225, 229)",
    surface: "rgb(29, 27, 30)",
    onSurface: "rgb(231, 225, 229)",
    surfaceVariant: "rgb(74, 69, 78)",
    onSurfaceVariant: "rgb(204, 196, 206)",
    outline: "rgb(150, 142, 152)",
    outlineVariant: "rgb(74, 69, 78)",
    shadow: "rgb(0, 0, 0)",
    scrim: "rgb(0, 0, 0)",
    inverseSurface: "rgb(231, 225, 229)",
    inverseOnSurface: "rgb(50, 47, 51)",
    inversePrimary: "rgb(120, 69, 172)",
    elevation: {
      level0: "transparent",
      level1: "rgb(39, 35, 41)",
      level2: "rgb(44, 40, 48)",
      level3: "rgb(50, 44, 55)",
      level4: "rgb(52, 46, 57)",
      level5: "rgb(56, 49, 62)",
    },
    surfaceDisabled: "rgba(231, 225, 229, 0.12)",
    onSurfaceDisabled: "rgba(231, 225, 229, 0.38)",
    backdrop: "rgba(51, 47, 55, 0.4)",
  },
};
