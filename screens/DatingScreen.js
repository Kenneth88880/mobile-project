import React, { useEffect, useState, useRef } from "react";
import { View, Animated, Alert, StyleSheet } from "react-native";
import {
  Text,
  Chip,
  ActivityIndicator,
  useTheme,
} from "react-native-paper";
import { EmptyState } from "../components/CommonComponents";
import {
  getAllDuoPairs,
  saveRating,
  getCurrentDuoPartner,
  saveDuoLike,
  deleteDuoLikeBetween,
  saveDuoSwipe,
  getUserProfile,
  getDuoPartnerProfile,
  checkDuoPreferenceMatch,
  hasUserRatedProfile,
} from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import { isWithinDistance } from "../utils/locationUtils";
import DuoCard from "./DatingPage/DuoCard";
import SwipeButtons from "./DatingPage/SwipeButtons";
import RatingModal from "./DatingPage/RatingModal";
import ProfileView from "./DatingPage/ProfileView";

export default function DatingScreen({ isActive = true, devMode = false }) {
  const theme = useTheme();
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingProfile, setRatingProfile] = useState(null);
  const [currentDuo, setCurrentDuo] = useState(null);
  const [swipeFeedback, setSwipeFeedback] = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [hasRatedUser, setHasRatedUser] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loadedPairs, setLoadedPairs] = useState([]);
  const [hasMorePairs, setHasMorePairs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allFilteredPairs, setAllFilteredPairs] = useState([]);
  const pairsPerPage = 15;

  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const currentUserId = CURRENT_USER_ID;

  // This prevents swiped duos from reappearing when navigating between tabs
  useEffect(() => {
    if (isActive) {
      loadData();
    }
  }, [isActive]);

  const loadData = async () => {
    setLoading(true);
    try {
      // OPTIMIZATION: Load user profile and duo partner in parallel
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

      // Get all duo pairs (already excludes swiped/liked)
      const fetchedPairs = await getAllDuoPairs(currentUserId);

      // OPTIMIZATION: Show first batch immediately without filtering
      const quickLoadPairs = fetchedPairs.slice(0, 5);
      setLoadedPairs(quickLoadPairs);
      setLoading(false); // Show UI immediately with first 5 profiles

      // NOW do the expensive filtering in the background
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

              if (!user1.gender || !user2.gender) {
                return false;
              }

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

      // Filter by distance if user has maxDistance preference set
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

      // DEV MODE: Filter to only show test accounts if dev mode is enabled
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
      const newPairs = allFilteredPairs.slice(
        nextIndex,
        nextIndex + pairsPerPage,
      );

      if (newPairs.length > 0) {
        setLoadedPairs([...loadedPairs, ...newPairs]);
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
    setHasRatedUser(false);
  };


  // Check rating status when viewing a profile OR when component becomes active
  useEffect(() => {
    const checkRatingStatus = async () => {
      if (selectedProfile) {
        try {
          const profileId = selectedProfile.userId || selectedProfile.id;
          const ratingCheck = await hasUserRatedProfile(
            currentUserId,
            profileId,
          );
          setHasRatedUser(ratingCheck.exists);
          setExistingRating(ratingCheck.exists ? ratingCheck.rating : null);
        } catch (error) {
          console.error("Error checking rating status:", error);
          setHasRatedUser(false);
          setExistingRating(null);
        }
      } else {
        setHasRatedUser(false);
        setExistingRating(null);
      }
    };

    checkRatingStatus();
  }, [selectedProfile, currentUserId, isActive]);

  const handleNextImage = () => {
    if (selectedProfile?.photos?.length > 1) {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % selectedProfile.photos.length,
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedProfile?.photos?.length > 1) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? selectedProfile.photos.length - 1 : prevIndex - 1,
      );
    }
  };

  // Instagram-style tap navigation
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

  const handleSwipeComplete = async (direction) => {
    if (currentPairIndex >= loadedPairs.length) return;

    const currentDuoPair = loadedPairs[currentPairIndex];
    const action = direction === "right" ? "like" : "pass";

    if (!currentDuo) {
      Alert.alert("No Duo", "You need a duo partner to swipe! Go to Profile.");
      setCurrentPairIndex((prevIndex) => prevIndex + 1);
      return;
    }

    setSwipeFeedback(action);

    const toX = direction === "right" ? 500 : -500;
    const toRotate = direction === "right" ? 20 : -20;

    Animated.parallel([
      Animated.timing(pan.x, {
        toValue: toX,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotate, {
        toValue: toRotate,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(async () => {
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

        pan.setValue({ x: 0, y: 0 });
        rotate.setValue(0);
        opacity.setValue(1);
        scale.setValue(1);
        setSwipeFeedback(null);

        if (loadedPairs.length - 1 <= 5 && hasMorePairs && !loadingMore) {
          loadMorePairs();
        }
      } catch (error) {
        console.error("Error in swipe complete:", error);
        Alert.alert("Error", "Failed to save your decision. Please try again.");

        pan.setValue({ x: 0, y: 0 });
        rotate.setValue(0);
        opacity.setValue(1);
        scale.setValue(1);
        setSwipeFeedback(null);
      }
    });
  };

  // --- Render states ---

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

  if (showRatingModal && ratingProfile) {
    return (
      <RatingModal
        ratingProfile={ratingProfile}
        existingRating={existingRating}
        hoveredStar={hoveredStar}
        setHoveredStar={setHoveredStar}
        submitRating={submitRating}
        onClose={() => {
          setShowRatingModal(false);
          setRatingProfile(null);
          setExistingRating(null);
          setHoveredStar(0);
        }}
      />
    );
  }

  if (selectedProfile) {
    return (
      <ProfileView
        selectedProfile={selectedProfile}
        currentImageIndex={currentImageIndex}
        handleBackToDouble={handleBackToDouble}
        handleImageTap={handleImageTap}
        hasRatedUser={hasRatedUser}
        existingRating={existingRating}
        isDatingScreen={true}
      />
    );
  }

  // Main Duo Card View
  const currentDuoPair = loadedPairs[currentPairIndex];
  const topProfile = currentDuoPair?.user1Profile || currentDuoPair?.user1 || {};
  const bottomProfile = currentDuoPair?.user2Profile || currentDuoPair?.user2 || {};
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
        pan={pan}
        rotate={rotate}
        opacity={opacity}
        scale={scale}
      />

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
  instructions: {
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },
});
