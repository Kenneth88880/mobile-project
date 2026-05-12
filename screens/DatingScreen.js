import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { Text, Chip, ActivityIndicator, useTheme } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { EmptyState } from "../components/CommonComponents";
import {
  getAllDuoPairs,
  getCurrentDuoPartner,
  saveDuoLike,
  deleteDuoLikeBetween,
  saveDuoSwipe,
  getUserProfile,
  getDuoPartnerProfile,
  checkDuoPreferenceMatch,
  clearAllCaches,
  blockUser,
  reportUser,
} from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import { isWithinDistance } from "../utils/locationUtils";
import DuoCard from "./DatingPage/DuoCard";
import SwipeButtons from "./DatingPage/SwipeButtons";
import ProfileView from "./DatingPage/ProfileView";

export default function DatingScreen({
  isActive = true,
  devMode = false,
  onCardSwipeStart,
  onCardSwipeEnd,
}) {
  const theme = useTheme();
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentDuo, setCurrentDuo] = useState(null);
  const [swipeFeedback, setSwipeFeedback] = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [loadedPairs, setLoadedPairs] = useState([]);
  const [hasMorePairs, setHasMorePairs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allFilteredPairs, setAllFilteredPairs] = useState([]);
  const pairsPerPage = 15;
  const profileCacheRef = useRef({});

  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const rotateVal = useSharedValue(0);
  const scaleVal = useSharedValue(1);
  const opacityVal = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { rotate: `${rotateVal.value}deg` },
      { scale: scaleVal.value },
    ],
    opacity: opacityVal.value,
  }));

  const currentUserId = CURRENT_USER_ID;

  useEffect(() => {
    if (isActive) {
      loadData();
    }
  }, [isActive]);

  const loadData = async () => {
    setLoading(true);
    clearAllCaches(); // THIS MAKES APP A BIT SLOW, DELETE IF NEEDED
    try {
      // Step 1 — need duo ID before calling getAllDuoPairs
      const [currentUserProfile, duo] = await Promise.all([
        getUserProfile(currentUserId),
        getCurrentDuoPartner(currentUserId),
      ]);

      const userLocation = {
        latitude: currentUserProfile?.latitude,
        longitude: currentUserProfile?.longitude,
        city: currentUserProfile?.city || "Unknown",
      };
      if (userLocation.latitude && userLocation.longitude) {
        setCurrentUserLocation(userLocation);
      }
      setCurrentDuo(duo);

      // Step 2 — pairs and partner profile fetch in parallel
      const [fetchedPairs, partnerProfile] = await Promise.all([
        getAllDuoPairs(currentUserId, duo?.duoId),
        duo?.partnerId
          ? getDuoPartnerProfile(duo.partnerId)
          : Promise.resolve(null),
      ]);

      let filteredPairs = fetchedPairs || [];

      if (duo?.partnerId && partnerProfile) {
        const currentUserPref =
          currentUserProfile.duoPreference?.interestedIn ||
          currentUserProfile.genderPreference ||
          [];
        const partnerPref =
          partnerProfile?.duoPreference?.interestedIn ||
          partnerProfile?.genderPreference ||
          [];

        if (
          currentUserProfile?.gender &&
          partnerProfile?.gender &&
          (currentUserPref.length > 0 || partnerPref.length > 0)
        ) {
          filteredPairs = filteredPairs.filter((pair) => {
            const user1 = pair.user1Profile || pair.user1 || {};
            const user2 = pair.user2Profile || pair.user2 || {};
            if (!user1.gender || !user2.gender) return false;
            return checkDuoPreferenceMatch(
              currentUserProfile,
              partnerProfile,
              user1,
              user2,
            );
          });
        }
      }

      const maxDistance = currentUserProfile?.maxDistance || 200;
      if (userLocation.latitude && userLocation.longitude) {
        filteredPairs = filteredPairs.filter((pair) => {
          const u1 = pair.user1Profile;
          const u2 = pair.user2Profile;
          return (
            (u1?.latitude &&
              u1?.longitude &&
              isWithinDistance(userLocation, u1, maxDistance)) ||
            (u2?.latitude &&
              u2?.longitude &&
              isWithinDistance(userLocation, u2, maxDistance))
          );
        });
      }

      filteredPairs = filteredPairs.filter((pair) => {
        const u1 = pair.user1Profile;
        const u2 = pair.user2Profile;
        return devMode
          ? u1?.isTestAccount === true && u2?.isTestAccount === true
          : u1?.isTestAccount !== true && u2?.isTestAccount !== true;
      });

      setAllFilteredPairs(filteredPairs);
      setLoadedPairs(filteredPairs.slice(0, pairsPerPage));
      setHasMorePairs(filteredPairs.length > pairsPerPage);
      setCurrentPairIndex(0);
    } catch (error) {
      console.error("Error in loadData:", error);
      setLoadedPairs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePairs = async () => {
    if (loadingMore || !hasMorePairs) return;
    setLoadingMore(true);
    try {
      const nextIndex = loadedPairs.length;
      const newPairs = allFilteredPairs.slice(
        nextIndex,
        nextIndex + pairsPerPage,
      );
      if (newPairs.length > 0) {
        setLoadedPairs((prev) => [...prev, ...newPairs]);
      }
      if (nextIndex + pairsPerPage >= allFilteredPairs.length) {
        setHasMorePairs(false);
      }
    } catch (error) {
      console.error("Error loading more pairs:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleProfileClick = async (profile) => {
    if (!profile) return;
    const profileId = profile.userId || profile.id;

    // Show card data immediately — no blank screen while fetching
    setSelectedProfile(profile);
    setCurrentImageIndex(0);

    try {
      // Always fetch the latest profile to ensure updated photos are shown
      const fullProfile = await getUserProfile(profileId);
      if (fullProfile) {
        const merged = {
          ...profile,
          ...fullProfile,
          city: fullProfile.city || profile.city,
          latitude: fullProfile.latitude || profile.latitude,
          longitude: fullProfile.longitude || profile.longitude,
          lastActive: fullProfile.lastActive || profile.lastActive,
          isOnline: fullProfile.isOnline || profile.isOnline,
        };
        profileCacheRef.current[profileId] = merged;
        setSelectedProfile(merged);
      }
    } catch (error) {
      console.error("Error loading full profile:", error);
      // Already showing profile from card data, no fallback needed
    }
  };

  const handleBackToDouble = () => {
    setSelectedProfile(null);
    setCurrentImageIndex(0);
  };

  const handleReportUser = (profile) => {
    const reportedId = profile?.userId || profile?.id;
    if (!reportedId) return;
    Alert.alert("Report User", "Why are you reporting this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Fake Profile",
        onPress: async () => {
          await reportUser(currentUserId, reportedId, "fake_profile");
          Alert.alert("Reported", "Thank you. Our moderation team will review this profile.");
        },
      },
      {
        text: "Inappropriate Content",
        onPress: async () => {
          await reportUser(currentUserId, reportedId, "inappropriate_content");
          Alert.alert("Reported", "Thank you. Our moderation team will review this profile.");
        },
      },
      {
        text: "Harassment",
        onPress: async () => {
          await reportUser(currentUserId, reportedId, "harassment");
          Alert.alert("Reported", "Thank you. Our moderation team will review this profile.");
        },
      },
    ]);
  };

  const handleBlockUser = (profile) => {
    const blockedId = profile?.userId || profile?.id;
    const name = profile?.name || "this user";
    if (!blockedId) return;
    Alert.alert(
      "Block User",
      `Block ${name}? They will no longer appear in your feed and cannot contact you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            const success = await blockUser(currentUserId, blockedId);
            if (success) {
              handleBackToDouble();
              setAllFilteredPairs((prev) =>
                prev.filter(
                  (p) =>
                    (p.user1Profile?.userId || p.user1Profile?.id) !== blockedId &&
                    (p.user2Profile?.userId || p.user2Profile?.id) !== blockedId,
                ),
              );
              setLoadedPairs((prev) =>
                prev.filter(
                  (p) =>
                    (p.user1Profile?.userId || p.user1Profile?.id) !== blockedId &&
                    (p.user2Profile?.userId || p.user2Profile?.id) !== blockedId,
                ),
              );
            } else {
              Alert.alert("Error", "Failed to block user. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleNextImage = () => {
    if (selectedProfile?.photos?.length > 1) {
      setCurrentImageIndex(
        (prev) => (prev + 1) % selectedProfile.photos.length,
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedProfile?.photos?.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedProfile.photos.length - 1 : prev - 1,
      );
    }
  };

  const handleImageTap = (event) => {
    if (selectedProfile?.photos?.length <= 1) return;
    const { locationX } = event.nativeEvent;
    const { width } = event.nativeEvent.target?.offsetWidth ||
      event.nativeEvent.target?.clientWidth || { width: 400 };
    if (locationX > width / 2) {
      handleNextImage();
    } else {
      handlePrevImage();
    }
  };

  const resetCard = () => {
    "worklet";
    panX.value = 0;
    panY.value = 0;
    rotateVal.value = 0;
    opacityVal.value = 1;
    scaleVal.value = 1;
  };

  const afterSwipeComplete = async (action, currentDuoPair) => {
    try {
      const currentDuoId = currentDuo?.duoId;
      if (!currentDuoId) {
        console.error("No duo ID found");
        return;
      }

      if (action === "like") {
        const duo1 = currentDuoId;
        const duo2 = currentDuoPair.id;
        const fromUser1 =
          currentDuo?.partnerProfile?.userId || currentDuo?.partnerId;
        const fromUser2 = currentUserId;
        const toUser1 = currentDuoPair.users[0];
        const toUser2 = currentDuoPair.users[1];
        await saveDuoLike(duo1, duo2, fromUser1, fromUser2, toUser1, toUser2);
      } else if (action === "pass") {
        const duo1 = currentDuoId;
        const duo2 = currentDuoPair.id;
        await saveDuoSwipe(duo1, duo2);
      }

      setCurrentPairIndex((prev) => prev + 1);
      panX.value = 0;
      panY.value = 0;
      rotateVal.value = 0;
      opacityVal.value = 1;
      scaleVal.value = 1;
      setSwipeFeedback(null);

      if (loadedPairs.length - 1 <= 5 && hasMorePairs && !loadingMore) {
        loadMorePairs();
      }
    } catch (error) {
      console.error("Error in swipe complete:", error);
      Alert.alert("Error", "Failed to save your decision. Please try again.");
      panX.value = 0;
      panY.value = 0;
      rotateVal.value = 0;
      opacityVal.value = 1;
      scaleVal.value = 1;
      setSwipeFeedback(null);
    }
  };

  const handleSwipeComplete = (direction) => {
    if (currentPairIndex >= loadedPairs.length) return;

    const currentDuoPair = loadedPairs[currentPairIndex];
    const action = direction === "right" ? "like" : "pass";

    if (!currentDuo) {
      Alert.alert("No Duo", "You need a duo partner to swipe! Go to Profile.");
      setCurrentPairIndex((prev) => prev + 1);
      return;
    }

    setSwipeFeedback(action);

    const toX = direction === "right" ? 500 : -500;
    const toRotate = direction === "right" ? 20 : -20;

    panX.value = withTiming(toX, { duration: 300 });
    rotateVal.value = withTiming(toRotate, { duration: 300 });
    opacityVal.value = withTiming(0, { duration: 300 }, (finished) => {
      "worklet";
      if (finished) runOnJS(afterSwipeComplete)(action, currentDuoPair);
    });
  };

  const SWIPE_THRESHOLD = 120;

  // left empty for now until we get the animation for seeing the next photos refined
  const swipeGesturePhotos = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .onBegin(() => {})
        .onUpdate((event) => {})
        .onEnd((event) => {})
        .onFinalize(() => {}),
    [],
  );

  const swipeGestureAccept = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({ bottom: -80 })
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .onBegin(() => {
          if (onCardSwipeStart) runOnJS(onCardSwipeStart)();
        })
        .onUpdate((event) => {
          panX.value = event.translationX * 0.75;
          panY.value = event.translationY * 0.15;
          rotateVal.value = event.translationX / 15;
          scaleVal.value = Math.max(
            0.95,
            1 - Math.abs(event.translationX) / 3000,
          );
        })
        .onEnd((event) => {
          if (onCardSwipeEnd) runOnJS(onCardSwipeEnd)();
          if (event.translationX > SWIPE_THRESHOLD) {
            runOnJS(handleSwipeComplete)("right");
          } else if (event.translationX < -SWIPE_THRESHOLD) {
            runOnJS(handleSwipeComplete)("left");
          } else {
            panX.value = withSpring(0, { damping: 20, stiffness: 180 });
            panY.value = withSpring(0, { damping: 20, stiffness: 180 });
            rotateVal.value = withSpring(0, { damping: 20, stiffness: 180 });
            scaleVal.value = withSpring(1, { damping: 20, stiffness: 180 });
          }
        })
        .onFinalize(() => {
          if (onCardSwipeEnd) runOnJS(onCardSwipeEnd)();
        }),
    [loadedPairs, currentPairIndex, currentDuo, hasMorePairs, loadingMore],
  );

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading profiles...
        </Text>
      </View>
    );
  }

  if (
    !loadedPairs ||
    loadedPairs.length === 0 ||
    currentPairIndex >= loadedPairs.length
  ) {
    const hasPreferences =
      currentDuo?.partnerProfile?.genderPreference?.length > 0 ||
      currentDuo?.partnerProfile?.duoPreference?.interestedIn?.length > 0;

    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon="heart-multiple"
          title="No Duo Pairs Available"
          message={
            !currentDuo
              ? "You need a duo partner first! Go to Profile → Edit to find a partner."
              : hasPreferences
                ? "No duos match your gender preferences right now. Check back later as more users join, or adjust your preferences in Profile!"
                : "No more duo pairs to show. Check back later or invite friends to join!"
          }
          actionLabel="Reload"
          onAction={loadData}
        />
      </View>
    );
  }

  if (selectedProfile) {
    return (
      <GestureHandlerRootView style={styles.gestureContainer}>
        <GestureDetector gesture={swipeGesturePhotos}>
          <ProfileView
            selectedProfile={selectedProfile}
            currentImageIndex={currentImageIndex}
            handleBackToDouble={handleBackToDouble}
            handleImageTap={handleImageTap}
            isDatingScreen={true}
            onReportUser={handleReportUser}
            onBlockUser={handleBlockUser}
          />
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  const currentDuoPair = loadedPairs[currentPairIndex];
  const topProfile =
    currentDuoPair?.user1Profile || currentDuoPair?.user1 || {};
  const bottomProfile =
    currentDuoPair?.user2Profile || currentDuoPair?.user2 || {};
  const topPhoto =
    topProfile?.photos?.[0] ||
    "https://via.placeholder.com/400x300?text=No+Photo";
  const bottomPhoto =
    bottomProfile?.photos?.[0] ||
    "https://via.placeholder.com/400x300?text=No+Photo";
  const topName = topProfile?.name || "Unknown";
  const topAge = topProfile?.age || "?";
  const bottomName = bottomProfile?.name || "Unknown";
  const bottomAge = bottomProfile?.age || "?";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium">Double Dating</Text>
      </View>

      {currentDuo ? (
        <Chip icon="account-multiple" style={styles.duoChip}>
          You & {currentDuo?.partnerProfile?.name || "Partner"}
        </Chip>
      ) : (
        <Chip icon="alert" style={styles.warningChip}>
          No Duo Partner - Go to Profile
        </Chip>
      )}

      <GestureHandlerRootView style={styles.gestureContainer}>
        <GestureDetector gesture={swipeGestureAccept}>
          <Animated.View style={[styles.animatedCard, cardAnimatedStyle]}>
            <DuoCard
              topProfile={topProfile}
              bottomProfile={bottomProfile}
              topPhoto={topPhoto}
              bottomPhoto={bottomPhoto}
              topName={topName}
              topAge={topAge}
              bottomName={bottomName}
              bottomAge={bottomAge}
              currentUserLocation={currentUserLocation}
              handleProfileClick={handleProfileClick}
              swipeFeedback={swipeFeedback}
              cardAnimatedStyle={cardAnimatedStyle}
            />
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      <SwipeButtons
        onPass={() => handleSwipeComplete("left")}
        onLike={() => handleSwipeComplete("right")}
      />

      <Text variant="bodySmall" style={styles.instructions}>
        Tap profiles to view details
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
  },
  duoChip: {
    margin: 8,
    alignSelf: "center",
  },
  warningChip: {
    margin: 8,
    alignSelf: "center",
    backgroundColor: "#FFD700",
  },
  gestureContainer: {
    flex: 1,
  },
  animatedCard: {
    flex: 1,
  },
  instructions: {
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },
});
