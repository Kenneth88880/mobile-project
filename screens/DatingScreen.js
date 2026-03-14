import React, { useEffect, useState, useMemo } from "react";
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
    try {
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

      const fetchedPairs = await getAllDuoPairs(currentUserId);

      const quickLoadPairs = fetchedPairs.slice(0, 5);
      setLoadedPairs(quickLoadPairs);
      setLoading(false);

      let filteredPairs = fetchedPairs || [];

      if (duo && duo.partnerId) {
        try {
          const partnerProfile = await getDuoPartnerProfile(duo.partnerId);

          const currentUserPref =
            currentUserProfile.duoPreference?.interestedIn ||
            currentUserProfile.genderPreference ||
            [];
          const partnerPref =
            partnerProfile?.duoPreference?.interestedIn ||
            partnerProfile?.genderPreference ||
            [];

          const hasPreferences =
            currentUserPref.length > 0 || partnerPref.length > 0;

          if (
            currentUserProfile?.gender &&
            partnerProfile?.gender &&
            hasPreferences
          ) {
            filteredPairs = fetchedPairs.filter((pair) => {
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
        } catch (error) {
          console.error("Error loading partner profile for filtering:", error);
        }
      }

      const maxDistance = currentUserProfile?.maxDistance || 200;

      if (userLocation.latitude && userLocation.longitude && maxDistance) {
        filteredPairs = filteredPairs.filter((pair) => {
          const user1 = pair.user1Profile;
          const user2 = pair.user2Profile;
          const user1InRange =
            user1?.latitude &&
            user1?.longitude &&
            isWithinDistance(userLocation, user1, maxDistance);
          const user2InRange =
            user2?.latitude &&
            user2?.longitude &&
            isWithinDistance(userLocation, user2, maxDistance);
          return user1InRange || user2InRange;
        });

        console.log(
          `Filtered ${fetchedPairs.length} duos to ${filteredPairs.length} within ${maxDistance}km`,
        );
      }

      if (devMode) {
        filteredPairs = filteredPairs.filter((pair) => {
          const user1 = pair.user1Profile;
          const user2 = pair.user2Profile;
          return user1?.isTestAccount === true && user2?.isTestAccount === true;
        });
      } else {
        filteredPairs = filteredPairs.filter((pair) => {
          const user1 = pair.user1Profile;
          const user2 = pair.user2Profile;
          return user1?.isTestAccount !== true && user2?.isTestAccount !== true;
        });
      }

      setAllFilteredPairs(filteredPairs);
      setLoadedPairs(filteredPairs.slice(0, pairsPerPage));
      setHasMorePairs(filteredPairs.length > pairsPerPage);
      setCurrentPairIndex(0);
    } catch (error) {
      console.error("Error in loadData:", error);
      setLoadedPairs([]);
    }
  };

  const loadMorePairs = async () => {
    if (loadingMore || !hasMorePairs) return;
    setLoadingMore(true);
    try {
      const nextIndex = loadedPairs.length;
      const newPairs = allFilteredPairs.slice(nextIndex, nextIndex + pairsPerPage);
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
    try {
      const fullProfile = await getUserProfile(profile.userId || profile.id);
      if (fullProfile) {
        setSelectedProfile({
          ...profile,
          ...fullProfile,
          city: fullProfile.city || profile.city,
          latitude: fullProfile.latitude || profile.latitude,
          longitude: fullProfile.longitude || profile.longitude,
          lastActive: fullProfile.lastActive || profile.lastActive,
          isOnline: fullProfile.isOnline || profile.isOnline,
        });
      } else {
        setSelectedProfile(profile);
      }
    } catch (error) {
      console.error("Error loading full profile:", error);
      setSelectedProfile(profile);
    }
    setCurrentImageIndex(0);
  };

  const handleBackToDouble = () => {
    setSelectedProfile(null);
    setCurrentImageIndex(0);
  };

  const handleNextImage = () => {
    if (selectedProfile?.photos?.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedProfile.photos.length);
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
      if (action === "like") {
        await deleteDuoLikeBetween(currentDuo.duoId, currentDuoPair.id);
        await saveDuoLike(
          currentDuo.duoId,
          currentDuoPair.id,
          currentUserId,
          currentDuo.partnerId,
          currentDuoPair.users?.[0],
          currentDuoPair.users?.[1],
        );
      } else {
        await saveDuoSwipe(currentDuo.duoId, currentDuoPair.id, "pass");
      }

      setLoadedPairs((prevPairs) =>
        prevPairs.filter((pair) => pair.id !== currentDuoPair.id),
      );
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
        .onBegin(() => {
          
        })
        .onUpdate((event) => {
         
        })
        .onEnd((event) => {
          
        })
        .onFinalize(() => {
         
        }),
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
          scaleVal.value = Math.max(0.95, 1 - Math.abs(event.translationX) / 3000);
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading profiles...
        </Text>
      </View>
    );
  }

  if (!loadedPairs || loadedPairs.length === 0 || currentPairIndex >= loadedPairs.length) {
    const hasPreferences =
      currentDuo?.partnerProfile?.genderPreference?.length > 0 ||
      currentDuo?.partnerProfile?.duoPreference?.interestedIn?.length > 0;

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          />
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  const currentDuoPair = loadedPairs[currentPairIndex];
  const topProfile = currentDuoPair?.user1Profile || currentDuoPair?.user1 || {};
  const bottomProfile = currentDuoPair?.user2Profile || currentDuoPair?.user2 || {};
  const topPhoto = topProfile?.photos?.[0] || "https://via.placeholder.com/400x300?text=No+Photo";
  const bottomPhoto = bottomProfile?.photos?.[0] || "https://via.placeholder.com/400x300?text=No+Photo";
  const topName = topProfile?.name || "Unknown";
  const topAge = topProfile?.age || "?";
  const bottomName = bottomProfile?.name || "Unknown";
  const bottomAge = bottomProfile?.age || "?";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
        Tap profiles to view details • Swipe or use buttons to decide
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