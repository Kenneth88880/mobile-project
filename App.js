import React, { useState, useMemo, useEffect, useRef } from "react";
import { StyleSheet, View, LogBox, Dimensions } from "react-native";
import {
  PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  BottomNavigation,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StripeProvider } from "@stripe/stripe-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  useAnimatedStyle,
} from "react-native-reanimated";

// save fonts for later import { useFonts } from "expo-font";
import { CURRENT_USER_ID, setCurrentUserId } from "./services/UserConfig";
import DatingScreen from "./screens/DatingScreen";
import ExploreScreenNew from "./screens/ExploreScreenNew";
import ProfileScreen from "./screens/ProfileScreen";
import ChatScreen from "./screens/ChatScreen";
import RequestsScreen from "./screens/RequestsScreen";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";
import PremiumScreen from "./screens/PremiumScreen";
import CheckoutScreen from "./screens/CheckoutScreen";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { Recaptcha } from "@google-cloud/recaptcha-enterprise-react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

const AnimatedView = ({ offset, translateX, children }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + offset }],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", width: SCREEN_WIDTH, height: "100%" },
        animatedStyle,
      ]}  
    >
      {children}
    </Animated.View>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dating");
  const [displayTab, setDisplayTab] = useState("dating");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const cardSwipingRef = useRef(false);
  const chatGestures = useRef(false);
  // const [fontsLoaded] = useFonts({      FOR FONTS LATER
  //   FredokaBubble: require("./assets/fonts/Fredoka_SemiExpanded-Light.ttf"),
  // });
  // ✅ All your existing useEffects are here — add the reCAPTCHA one here too
  useEffect(() => {
    const extra = Constants.expoConfig?.extra ?? {};
    const siteKey =
      Platform.OS === "ios"
        ? extra.recaptchaIosSiteKey
        : extra.recaptchaAndroidSiteKey;

    if (!siteKey) {
      console.warn("⚠️ reCAPTCHA site key not configured");
      return;
    }

    Recaptcha.fetchClient(siteKey)
      .then(() => console.log("✅ reCAPTCHA client initialized"))
      .catch((err) => console.warn("⚠️ reCAPTCHA init failed:", err));
  }, []);

  const API_URL =
    "https://us-central1-doubly-messenging.cloudfunctions.net/api";

  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  // Tracks when the user is dragging the category bar in ExploreScreenNew
  const categoryScrollingRef = useRef(false);

  const routes = [
    { key: "dating", focusedIcon: "home", unfocusedIcon: "home-outline" },
    { key: "likes", focusedIcon: "heart", unfocusedIcon: "heart-outline" },
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
    {
      key: "payment",
      focusedIcon: "card",
      unfocusedIcon: "card-outline",
    },
    // {
    //   key: "premium",
    //   focusedIcon: "dollar",
    //   unfocusedIcon: "dollar-outline",
    // },
    {
      key: "profile",
      focusedIcon: "account",
      unfocusedIcon: "account-outline",
    },
  ];

  LogBox.ignoreLogs([
    "This method is deprecated",
    "Non-serializable values were found in the navigation state",
    "setLayoutAnimationEnabledExperimental is currently a no-op in the New Architecture",
  ]);

  useEffect(() => {
    fetchPublishableKey();
  }, []);

  useEffect(() => {
    if (__DEV__) {
      auth().settings.appVerificationDisabledForTesting = true;
    }
  }, []);

  useEffect(() => {
    loadThemePreference();
    loadDevModePreference();
  }, []);

  useEffect(() => {
    let profileUnsubscribe = null;
    const authUnsubscribe = auth().onAuthStateChanged(async (user) => {
      console.log("Auth state changed:", user ? user.uid : "null");
      console.log("the key we got was: ", publishableKey)
      setUser(user);
      if (user) {
        const { creationTime, lastSignInTime } = user.metadata;
        setIsNewUser(creationTime === lastSignInTime);
        setCurrentUserId(user.uid);
        await checkProfileComplete(user.uid);
        profileUnsubscribe = firestore()
          .collection("profiles")
          .doc(user.uid)
          .onSnapshot(
            (doc) => {
              if (doc.exists) {
                const profileData = doc.data();
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
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
      }
    });
    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (displayTab === activeTab) {
      translateX.value = 0;
    }
  }, [displayTab]);

  const fetchPublishableKey = async () => {
    try {
      const response = await fetch(`${API_URL}/config`);
      const data = await response.json();
      setPublishableKey(data.publishableKey);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme !== null) setIsDarkMode(savedTheme === "dark");
    } catch (error) {
      console.error(error);
    }
  };

  const loadDevModePreference = async () => {
    try {
      const savedDevMode = await AsyncStorage.getItem("devMode");
      if (savedDevMode !== null) setDevMode(savedDevMode === "true");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDevModeChange = async (newValue) => {
    setDevMode(newValue);
    try {
      await AsyncStorage.setItem("devMode", newValue.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const checkProfileComplete = async (userId) => {
    try {
      setCheckingProfile(true);
      const profileDoc = await firestore()
        .collection("profiles")
        .doc(userId)
        .get();
      if (profileDoc.exists) {
        const profileData = profileDoc.data();
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
      console.error(error);
    }
  };

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .failOffsetY([-15, 15])
        .onUpdate((event) => {
          if (
            isAnimating.value ||
            categoryScrollingRef.current ||
            cardSwipingRef.current ||
            chatGestures.current
          )
            return;

          const currentIndex = routes.findIndex((r) => r.key === activeTab);
          const isAtStart = currentIndex === 0 && event.translationX > 0;
          const isAtEnd =
            currentIndex === routes.length - 1 && event.translationX < 0;
          translateX.value =
            isAtStart || isAtEnd
              ? event.translationX * 0.2
              : event.translationX;
        })
        .onEnd((event) => {
          if (
            isAnimating.value ||
            categoryScrollingRef.current ||
            cardSwipingRef.current ||
            chatGestures.current
          )
            return;

          const { translationX, velocityX } = event;
          const currentIndex = routes.findIndex((r) => r.key === activeTab);

          const goNext =
            (translationX < -30 || velocityX < -300) &&
            currentIndex < routes.length - 1;
          const goPrev =
            (translationX > 30 || velocityX > 300) && currentIndex > 0;

          if (goNext) {
            const nextKey = routes[currentIndex + 1].key;
            isAnimating.value = true;
            runOnJS(setActiveTab)(nextKey);
            translateX.value = withTiming(
              -SCREEN_WIDTH,
              { duration: 200 },
              () => {
                "worklet";
                runOnJS(setDisplayTab)(nextKey);
                isAnimating.value = false;
              },
            );
          } else if (goPrev) {
            const nextKey = routes[currentIndex - 1].key;
            isAnimating.value = true;
            runOnJS(setActiveTab)(nextKey);
            translateX.value = withTiming(
              SCREEN_WIDTH,
              { duration: 200 },
              () => {
                "worklet";
                runOnJS(setDisplayTab)(nextKey);
                isAnimating.value = false;
              },
            );
          } else {
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          }
        }),
    [activeTab, displayTab, routes, translateX],
  );

  const sceneMap = {
    dating: () => (
      <DatingScreen
        devMode={devMode}
        onCardSwipeStart={() => {
          cardSwipingRef.current = true;
        }}
        onCardSwipeEnd={() => {
          cardSwipingRef.current = false;
        }}
      />
    ),
    likes: () => <RequestsScreen />,
    explore: () => (
      <ExploreScreenNew
        onCategoryScrollStart={() => {
          categoryScrollingRef.current = true;
        }}
        onCategoryScrollEnd={() => {
          categoryScrollingRef.current = false;
        }}
        currentUserId={CURRENT_USER_ID}
      />
    ),
    messages: () => <ChatScreen />,
    payment: () => <CheckoutScreen />,
    // premium: () => <PremiumScreen />,
    profile: () => (
      <ProfileScreen
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        devMode={devMode}
        setDevMode={handleDevModeChange}
      />
    ),
  };

  const visibleRoutes = useMemo(() => {
    const displayIndex = routes.findIndex((r) => r.key === displayTab);
    const activeIndex = routes.findIndex((r) => r.key === activeTab);
    return routes.filter(
      (_, i) =>
        Math.abs(i - displayIndex) <= 1 || Math.abs(i - activeIndex) <= 1,
    );
  }, [displayTab, activeTab]);

  if (checkingProfile) {
    return (
      <PaperProvider theme={theme}>
        <StripeProvider
          publishableKey={publishableKey}
          urlScheme="doubly-yrvn0tmogrdrliugnun4w"
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            />
          </GestureHandlerRootView>
        </StripeProvider>
      </PaperProvider>
    );
  }

  if (user && !profileComplete) {
    return (
      <PaperProvider theme={theme}>
        <StripeProvider
          publishableKey={publishableKey}
          urlScheme="doubly-yrvn0tmogrdrliugnun4w"
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SignUpScreen isInSignupFlow={true} onNavigateToSignIn={() => {}} />
          </GestureHandlerRootView>
        </StripeProvider>
      </PaperProvider>
    );
  }

  if (user && profileComplete) {
    return (
      <PaperProvider theme={theme}>
        <StripeProvider
          publishableKey={publishableKey}
          urlScheme="doubly-yrvn0tmogrdrliugnun4w"
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView
              style={[
                styles.safeArea,
                { backgroundColor: theme.colors.elevation.level2 },
              ]}
              edges={["top", "left", "right"]}
            >
              <StatusBar style={isDarkMode ? "light" : "dark"} />

              <GestureDetector gesture={swipeGesture}>
                <View style={{ flex: 1 }}>
                  {visibleRoutes.map((route) => {
                    const displayIndex = routes.findIndex(
                      (r) => r.key === displayTab,
                    );
                    const routeIndex = routes.findIndex(
                      (r) => r.key === route.key,
                    );
                    const offset = (routeIndex - displayIndex) * SCREEN_WIDTH;
                    return (
                      <AnimatedView
                        key={route.key}
                        offset={offset}
                        translateX={translateX}
                      >
                        {sceneMap[route.key]()}
                      </AnimatedView>
                    );
                  })}
                </View>
              </GestureDetector>

              <View
                style={{
                  backgroundColor: theme.colors.elevation.level2,
                  height: 70,
                }}
              >
                <BottomNavigation
                  navigationState={{
                    index: routes.findIndex((r) => r.key === activeTab),
                    routes,
                  }}
                  onIndexChange={(index) => {
                    setActiveTab(routes[index].key);
                    setDisplayTab(routes[index].key);
                  }}
                  renderScene={() => null}
                  barStyle={{
                    backgroundColor: theme.colors.elevation.level2,
                    height: 70,
                  }}
                  activeColor={theme.colors.primary}
                  inactiveColor={theme.colors.onSurfaceVariant}
                  safeAreaInsets={{ bottom: 0 }}
                />
              </View>
            </SafeAreaView>
          </GestureHandlerRootView>
        </StripeProvider>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StripeProvider
        publishableKey={publishableKey}
        urlScheme="doubly-yrvn0tmogrdrliugnun4w"
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          {showRegister ? (
            <SignUpScreen onNavigateToSignIn={() => setShowRegister(false)} />
          ) : (
            <SignInScreen onNavigateToRegister={() => setShowRegister(true)} />
          )}
        </GestureHandlerRootView>
      </StripeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});

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
