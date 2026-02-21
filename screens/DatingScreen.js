import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  Animated,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  IconButton,
  Chip,
  Surface,
  ActivityIndicator,
  useTheme,
} from "react-native-paper";
import { EmptyState, ProfileInfoCard } from "../components/CommonComponents";
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
import { getDistanceToProfile, isWithinDistance } from "../utils/locationUtils";
import { formatLastActive } from "../utils/locationTracker";

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
  const pairsPerPage = 15; // Increased from 5 to 15 for faster swiping

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
      // Then filter the rest in the background
      const quickLoadPairs = fetchedPairs.slice(0, 5);
      setLoadedPairs(quickLoadPairs);
      setLoading(false); // Show UI immediately with first 5 profiles

      // NOW do the expensive filtering in the background
      let filteredPairs = fetchedPairs || [];

      if (duo && duo.partnerId) {
        try {
          // Get partner's full profile with gender
          const partnerProfile = await getDuoPartnerProfile(duo.partnerId);

          // Only filter if BOTH users in the duo have gender AND at least one has preferences set
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
            // Filter pairs based on mutual gender preferences
            filteredPairs = fetchedPairs.filter((pair) => {
              const user1 = pair.user1Profile || pair.user1 || {};
              const user2 = pair.user2Profile || pair.user2 || {};

              // Skip if other duo doesn't have genders set
              if (!user1.gender || !user2.gender) {
                return false; // Don't show duos without gender set if filtering is active
              }

              // Check if preferences match (new strict logic)
              const preferencesMatch = checkDuoPreferenceMatch(
                currentUserProfile,
                partnerProfile,
                user1,
                user2,
              );

              if (!preferencesMatch) {
                // Filtered out - preferences don't match
              }

              return preferencesMatch;
            });
          } else {
            // No gender preferences set - showing all pairs
          }
        } catch (error) {
          console.error("Error loading partner profile for filtering:", error);
          // On error, show all pairs without filtering
        }
      } else {
        // No duo partner or gender not set - showing all pairs
      }

      // NEW: Filter by distance if user has maxDistance preference set
      const maxDistance = currentUserProfile?.maxDistance || 200; // Default 200km if not set

      if (userLocation.latitude && userLocation.longitude && maxDistance) {
        filteredPairs = filteredPairs.filter((pair) => {
          // Check if at least one member of the duo is within the max distance
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

          // Include the duo if at least one member is within range
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

          const user1IsTest = user1?.isTestAccount === true;
          const user2IsTest = user2?.isTestAccount === true;

          // Only show if BOTH people in the duo are test accounts
          return user1IsTest && user2IsTest;
        });
      } else {
        // REGULAR USERS: Filter OUT any duo that contains a test account
        filteredPairs = filteredPairs.filter((pair) => {
          const user1 = pair.user1Profile;
          const user2 = pair.user2Profile;

          // Exclude if EITHER person in the duo is a test account
          return user1?.isTestAccount !== true && user2?.isTestAccount !== true;
        });
      }

      // Store ALL filtered pairs for pagination
      setAllFilteredPairs(filteredPairs);

      // Update loaded pairs with properly filtered results
      const properlyFilteredPairs = filteredPairs.slice(0, pairsPerPage);
      setLoadedPairs(properlyFilteredPairs);
      setHasMorePairs(filteredPairs.length > pairsPerPage);
      setCurrentPairIndex(0);
    } catch (error) {
      console.error("Error in loadData:", error);
      // Don't alert on initial load - just show empty state
      setLoadedPairs([]);
    }
    // Note: setLoading(false) was already called earlier to show UI immediately
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
    if (!profile) return; // Safety check

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

  const handleRateProfile = async (profile) => {
    if (!profile) return; // Safety check

    try {
      const profileId = profile.userId || profile.id;

      // Check if user has already rated this profile
      const ratingCheck = await hasUserRatedProfile(currentUserId, profileId);

      if (ratingCheck.exists) {
        // User has already rated - allow them to edit
        setExistingRating(ratingCheck.rating);
      } else {
        setExistingRating(null);
      }

      setRatingProfile(profile);
      setShowRatingModal(true);
    } catch (error) {
      console.error("Error checking rating status:", error);
      Alert.alert("Error", "Failed to check rating status. Please try again.");
    }
  };

  const submitRating = async (rating) => {
    if (!ratingProfile) return;

    const ratedUserId = ratingProfile.userId || ratingProfile.id;

    try {
      // Submit the rating (will create or update)
      const success = await saveRating(currentUserId, ratedUserId, rating);

      if (success) {
        Alert.alert(
          "Success",
          existingRating
            ? `You updated your rating to ${rating} stars!`
            : `You rated ${ratingProfile.name || "this user"} ${rating} stars!`,
        );

        setShowRatingModal(false);
        setRatingProfile(null);
        setExistingRating(null);

        // Update the hasRatedUser state so UI reflects the change
        setHasRatedUser(true);
      } else {
        Alert.alert("Error", "Failed to save rating. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    }
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
          if (ratingCheck.exists) {
            setExistingRating(ratingCheck.rating);
          } else {
            setExistingRating(null);
          }
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
      event.nativeEvent.target?.clientWidth || { width: 400 }; // fallback

    // If tapped on right side (>50%), go next; left side, go previous
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

        // Remove the swiped pair from the list
        setLoadedPairs((prevPairs) =>
          prevPairs.filter((pair) => pair.id !== currentDuoPair.id),
        );

        // Reset animation values for next card
        pan.setValue({ x: 0, y: 0 });
        rotate.setValue(0);
        opacity.setValue(1);
        scale.setValue(1);
        setSwipeFeedback(null);

        // Preload more pairs earlier (when 5 left instead of waiting til end)
        if (loadedPairs.length - 1 <= 5 && hasMorePairs && !loadingMore) {
          loadMorePairs();
        }
      } catch (error) {
        console.error("Error in swipe complete:", error);
        Alert.alert("Error", "Failed to save your decision. Please try again.");

        // Reset animation even on error
        pan.setValue({ x: 0, y: 0 });
        rotate.setValue(0);
        opacity.setValue(1);
        scale.setValue(1);
        setSwipeFeedback(null);
      }
    });
  };

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
    // Check if user has preferences set
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

  const currentDuoPair = loadedPairs[currentPairIndex];

  // SAFETY: Get profiles safely with fallbacks
  const topProfile =
    currentDuoPair?.user1Profile || currentDuoPair?.user1 || {};
  const bottomProfile =
    currentDuoPair?.user2Profile || currentDuoPair?.user2 || {};

  // SAFETY: Get photo URLs safely
  const topPhoto =
    topProfile?.photos?.[0] ||
    "https://via.placeholder.com/400x300?text=No+Photo";
  const bottomPhoto =
    bottomProfile?.photos?.[0] ||
    "https://via.placeholder.com/400x300?text=No+Photo";

  // SAFETY: Get names and ages safely
  const topName = topProfile?.name || "Unknown";
  const topAge = topProfile?.age || "?";
  const bottomName = bottomProfile?.name || "Unknown";
  const bottomAge = bottomProfile?.age || "?";

  // Rating Modal
  if (showRatingModal && ratingProfile) {
    return (
      <View style={styles.modalOverlay}>
        <Card style={styles.ratingCard}>
          <Card.Title
            title={
              existingRating
                ? `Edit Your Rating`
                : `Rate ${ratingProfile.name || "User"}`
            }
            subtitle={
              existingRating
                ? `Current rating: ${existingRating} stars. Tap to change.`
                : "How would you rate this profile?"
            }
          />
          <Card.Content>
            <View style={styles.ratingStarsContainer}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isHighlighted =
                  star <= (hoveredStar || existingRating || 0);
                return (
                  <TouchableOpacity
                    key={star}
                    onPress={() => submitRating(star)}
                    onPressIn={() => setHoveredStar(star)}
                    onPressOut={() => setHoveredStar(0)}
                    style={styles.starButton}
                  >
                    <Text
                      style={[
                        styles.starIcon,
                        { color: isHighlighted ? "#FFD700" : "#E0E0E0" },
                      ]}
                    >
                      ★
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {hoveredStar > 0 && (
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 8,
                  color: theme.colors.primary,
                }}
              >
                {hoveredStar} star{hoveredStar !== 1 ? "s" : ""}
              </Text>
            )}
          </Card.Content>
          <Card.Actions>
            <Button
              onPress={() => {
                setShowRatingModal(false);
                setRatingProfile(null);
                setExistingRating(null);
                setHoveredStar(0);
              }}
            >
              Cancel
            </Button>
          </Card.Actions>
        </Card>
      </View>
    );
  }

  // Single Profile View
  if (selectedProfile) {
    // SAFETY: Safe access to profile data
    const profilePhotos = selectedProfile?.photos || [];
    const profileName = selectedProfile?.name || "Unknown";
    const profileAge = selectedProfile?.age || "?";
    const profileDescription =
      selectedProfile?.description || "No description available";
    const profileTags = selectedProfile?.tags || [];
    const profileCity = selectedProfile?.city;
    const profileLastActive = selectedProfile?.lastActive;
    const profileIsOnline = selectedProfile?.isOnline;
    const profileShowOnlineStatus = selectedProfile?.showOnlineStatus !== false;

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <Button
          mode="outlined"
          icon="arrow-left"
          onPress={handleBackToDouble}
          style={styles.backButton}
        >
          Back to Duo
        </Button>

        {profilePhotos.length > 0 ? (
          <Card style={styles.imageCard}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleImageTap}>
              <Card.Cover
                source={{ uri: profilePhotos[currentImageIndex] }}
                style={styles.cardCover}
              />
              {profilePhotos.length > 1 && (
                <View style={styles.dotsContainer}>
                  {profilePhotos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === currentImageIndex && styles.activeDot,
                      ]}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={styles.imageCard}>
            <Card.Cover
              source={{
                uri: "https://via.placeholder.com/400x300?text=No+Photo",
              }}
              style={styles.cardCover}
            />
          </Card>
        )}

        <ProfileInfoCard
          name={profileName}
          age={profileAge}
          description={profileDescription}
          tags={profileTags}
          city={profileCity}
          lastActive={
            profileShowOnlineStatus && profileLastActive
              ? formatLastActive(profileLastActive, profileIsOnline)
              : null
          }
          showOnlineStatus={profileShowOnlineStatus}
        />

        {hasRatedUser ? (
          <Card
            style={{ margin: 16, backgroundColor: theme.colors.surfaceVariant }}
          >
            <Card.Content>
              <View style={{ alignItems: "center", gap: 8 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <IconButton icon="star" size={24} iconColor="#FFD700" />
                  <Text variant="bodyLarge">
                    You rated this user {existingRating} stars
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => handleRateProfile(selectedProfile)}
                  style={{ marginTop: 8 }}
                >
                  Edit Rating
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Button
            mode="contained"
            icon="star"
            onPress={() => handleRateProfile(selectedProfile)}
            style={styles.rateButton}
          >
            Rate Profile
          </Button>
        )}
      </ScrollView>
    );
  }

  // Main Duo Card View
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

      <Animated.View
        style={[
          styles.cardsContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              {
                rotate: rotate.interpolate({
                  inputRange: [-20, 20],
                  outputRange: ["-20deg", "20deg"],
                }),
              },
              { scale },
            ],
            opacity,
          },
        ]}
      >
        <Card style={styles.duoCard}>
          <Card
            style={styles.halfCard}
            onPress={() => handleProfileClick(topProfile)}
          >
            <Card.Cover source={{ uri: topPhoto }} />
            <Card.Content style={styles.cardOverlay}>
              <Text variant="titleLarge" style={styles.overlayText}>
                {topName}, {topAge}
              </Text>
              {topProfile?.showOnlineStatus !== false &&
                topProfile?.lastActive && (
                  <Text variant="bodySmall" style={styles.overlayText}>
                    {formatLastActive(
                      topProfile.lastActive,
                      topProfile.isOnline,
                    )}
                  </Text>
                )}
              {currentUserLocation &&
              topProfile?.latitude &&
              topProfile?.longitude ? (
                <Text variant="bodySmall" style={styles.overlayText}>
                  {getDistanceToProfile(currentUserLocation, {
                    latitude: topProfile.latitude,
                    longitude: topProfile.longitude,
                    city: topProfile.city,
                  })}
                </Text>
              ) : (
                topProfile?.city && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <IconButton
                      icon="map-marker"
                      size={14}
                      iconColor="white"
                      style={{ margin: 0, padding: 0 }}
                    />
                    <Text variant="bodySmall" style={styles.overlayText}>
                      {topProfile.city}
                    </Text>
                  </View>
                )
              )}
            </Card.Content>
          </Card>

          <Card
            style={styles.halfCard}
            onPress={() => handleProfileClick(bottomProfile)}
          >
            <Card.Cover source={{ uri: bottomPhoto }} />
            <Card.Content style={styles.cardOverlay}>
              <Text variant="titleLarge" style={styles.overlayText}>
                {bottomName}, {bottomAge}
              </Text>
              {bottomProfile?.showOnlineStatus !== false &&
                bottomProfile?.lastActive && (
                  <Text variant="bodySmall" style={styles.overlayText}>
                    {formatLastActive(
                      bottomProfile.lastActive,
                      bottomProfile.isOnline,
                    )}
                  </Text>
                )}
              {currentUserLocation &&
              bottomProfile?.latitude &&
              bottomProfile?.longitude ? (
                <Text variant="bodySmall" style={styles.overlayText}>
                  {getDistanceToProfile(currentUserLocation, {
                    latitude: bottomProfile.latitude,
                    longitude: bottomProfile.longitude,
                    city: bottomProfile.city,
                  })}
                </Text>
              ) : (
                bottomProfile?.city && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <IconButton
                      icon="map-marker"
                      size={14}
                      iconColor="white"
                      style={{ margin: 0, padding: 0 }}
                    />
                    <Text variant="bodySmall" style={styles.overlayText}>
                      {bottomProfile.city}
                    </Text>
                  </View>
                )
              )}
            </Card.Content>
          </Card>
        </Card>

        {swipeFeedback && (
          <Surface style={styles.feedbackOverlay} elevation={4}>
            <Text variant="displaySmall" style={styles.feedbackText}>
              {swipeFeedback === "like" ? "LIKE" : "PASS"}
            </Text>
          </Surface>
        )}
      </Animated.View>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          icon="close"
          onPress={() => handleSwipeComplete("left")}
          style={styles.passButton}
          labelStyle={styles.buttonLabel}
          buttonColor={theme.colors.surface}
        >
          PASS DUO
        </Button>
        <Button
          mode="contained"
          icon="heart"
          onPress={() => handleSwipeComplete("right")}
          style={styles.likeButton}
          labelStyle={styles.buttonLabel}
        >
          LIKE DUO
        </Button>
      </View>

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
  scrollContent: {
    padding: 16,
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
  cardsContainer: {
    flex: 1,
    padding: 8,
  },
  duoCard: {
    flex: 1,
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  halfCard: {
    marginVertical: 8,
    height: 250,
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
  },
  overlayText: {
    color: "white",
  },
  feedbackOverlay: {
    position: "absolute",
    top: "40%",
    left: "25%",
    right: "25%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  feedbackText: {
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  passButton: {
    flex: 1,
    borderWidth: 2,
  },
  likeButton: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  instructions: {
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },
  backButton: {
    marginBottom: 8,
  },
  imageCard: {
    marginBottom: 16,
  },
  cardCover: {
    height: 400,
  },
  imageNavigation: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rateButton: {
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  ratingCard: {
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  ratingStarsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 48,
    fontWeight: "bold",
  },
});
