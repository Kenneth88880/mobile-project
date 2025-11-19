import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Image,
  ScrollView,
  Animated,
  Alert,
  StyleSheet,
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
import {
  ProfilePhoto,
  StarRating,
  EmptyState,
  ProfileInfoCard,
} from "../components/CommonComponents";
import {
  getAllDuoPairs,
  saveRating,
  getCurrentDuoPartner,
  saveDuoLike,
  deleteDuoLikeBetween,
  saveDuoSwipe,
  getUserProfile,
} from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import { getDistanceToProfile } from "../utils/locationUtils";
import { formatLastActive } from "../utils/locationTracker";

export default function DatingScreen() {
  const theme = useTheme();
  const [duoPairs, setDuoPairs] = useState([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingProfile, setRatingProfile] = useState(null);
  const [currentDuo, setCurrentDuo] = useState(null);
  const [swipeFeedback, setSwipeFeedback] = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const currentUserId = CURRENT_USER_ID;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUserProfile = await getUserProfile(currentUserId);
      if (currentUserProfile?.latitude && currentUserProfile?.longitude) {
        setCurrentUserLocation({
          latitude: currentUserProfile.latitude,
          longitude: currentUserProfile.longitude,
          city: currentUserProfile.city || "Unknown",
        });
      }

      const duo = await getCurrentDuoPartner(currentUserId);
      setCurrentDuo(duo);

      const fetchedPairs = await getAllDuoPairs(currentUserId);
      setDuoPairs(fetchedPairs);
      setCurrentPairIndex(0);
    } catch (error) {
      console.error("Error in loadData:", error);
      Alert.alert("Error", "Failed to load duo pairs.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = async (profile) => {
    try {
      const fullProfile = await getUserProfile(profile.userId);
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

  const handleRateProfile = (profile) => {
    setRatingProfile(profile);
    setShowRatingModal(true);
  };

  const submitRating = async (rating) => {
    if (ratingProfile) {
      await saveRating(currentUserId, ratingProfile.userId, rating);
      Alert.alert(
        "Success",
        `You rated ${ratingProfile.name} ${rating} stars!`
      );
      setShowRatingModal(false);
      setRatingProfile(null);
    }
  };

  const handleNextImage = () => {
    if (selectedProfile?.photos?.length > 1) {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % selectedProfile.photos.length
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedProfile?.photos?.length > 1) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? selectedProfile.photos.length - 1 : prevIndex - 1
      );
    }
  };

  const handleSwipeComplete = async (direction) => {
    if (currentPairIndex >= duoPairs.length) return;

    const currentDuoPair = duoPairs[currentPairIndex];
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
      if (action === "like") {
        await deleteDuoLikeBetween(currentDuo.duoId, currentDuoPair.duoId);
        await saveDuoLike(
          currentDuo.duoId,
          currentDuoPair.duoId,
          currentUserId,
          currentDuo.partnerId,
          currentDuoPair.user1.userId,
          currentDuoPair.user2.userId
        );
      } else {
        await saveDuoSwipe(currentDuo.duoId, currentDuoPair.duoId, "pass");
      }

      setDuoPairs((prevPairs) =>
        prevPairs.filter((pair) => pair.duoId !== currentDuoPair.duoId)
      );

      pan.setValue({ x: 0, y: 0 });
      rotate.setValue(0);
      opacity.setValue(1);
      scale.setValue(1);
      setSwipeFeedback(null);
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

  if (currentPairIndex >= duoPairs.length) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon="heart-multiple"
          title="No More Duo Pairs"
          message="Duo pairs are two people teaming up for double dating."
          actionLabel="Reload"
          onAction={loadData}
        />
      </View>
    );
  }

  const currentDuoPair = duoPairs[currentPairIndex];
  const topProfile = currentDuoPair?.user1;
  const bottomProfile = currentDuoPair?.user2;

  // Rating Modal
  if (showRatingModal && ratingProfile) {
    return (
      <View style={styles.modalOverlay}>
        <Card style={styles.ratingCard}>
          <Card.Title
            title={`Rate ${ratingProfile.name}`}
            subtitle="How would you rate this profile?"
          />
          <Card.Content>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <IconButton
                  key={star}
                  icon="star"
                  size={40}
                  onPress={() => submitRating(star)}
                />
              ))}
            </View>
          </Card.Content>
          <Card.Actions>
            <Button
              onPress={() => {
                setShowRatingModal(false);
                setRatingProfile(null);
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
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <Button
          mode="text"
          icon="arrow-left"
          onPress={handleBackToDouble}
          style={styles.backButton}
        >
          Back to Double Dating
        </Button>

        <Card style={styles.imageCard}>
          <Card.Cover
            source={{ uri: selectedProfile.photos[currentImageIndex] }}
            style={styles.cardCover}
          />

          {selectedProfile.photos.length > 1 && (
            <View style={styles.imageNavigation}>
              <IconButton icon="chevron-left" onPress={handlePrevImage} />
              <View style={styles.dotsContainer}>
                {selectedProfile.photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentImageIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
              <IconButton icon="chevron-right" onPress={handleNextImage} />
            </View>
          )}
        </Card>

        <ProfileInfoCard
          name={selectedProfile.name}
          age={selectedProfile.age}
          description={selectedProfile.description}
          tags={selectedProfile.tags}
          city={selectedProfile.city}
          lastActive={
            selectedProfile.showOnlineStatus !== false &&
            selectedProfile.lastActive
              ? formatLastActive(
                  selectedProfile.lastActive,
                  selectedProfile.isOnline
                )
              : null
          }
          showOnlineStatus={selectedProfile.showOnlineStatus !== false}
        />

        <Button
          mode="contained"
          icon="star"
          onPress={() => handleRateProfile(selectedProfile)}
          style={styles.rateButton}
        >
          Rate this profile
        </Button>
      </ScrollView>
    );
  }

  // Double Dating View
  const cardTransform = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      {
        rotate: rotate.interpolate({
          inputRange: [-20, 0, 20],
          outputRange: ["-20deg", "0deg", "20deg"],
        }),
      },
      { scale: scale },
    ],
    opacity: opacity,
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Surface style={styles.header} elevation={2}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <IconButton icon="heart-multiple" size={24} style={{ margin: 0 }} />
          <Text variant="titleLarge">Double Dating</Text>
        </View>
        <IconButton
          icon="refresh"
          size={24}
          onPress={loadData}
          style={{ margin: 0 }}
        />
      </Surface>

      {currentDuo ? (
        <Chip icon="account-multiple" style={styles.duoChip}>
          Your duo: You + {currentDuo.partnerName}
        </Chip>
      ) : (
        <Chip icon="alert" style={styles.warningChip}>
          Find a duo partner in Profile to like duos!
        </Chip>
      )}

      <Animated.View style={[styles.cardsContainer, cardTransform]}>
        <Card style={styles.duoCard} elevation={0}>
          <Card
            style={styles.halfCard}
            onPress={() => handleProfileClick(topProfile)}
          >
            <Card.Cover source={{ uri: topProfile.photos[0] }} />
            <Card.Content style={styles.cardOverlay}>
              <Text variant="titleLarge" style={styles.overlayText}>
                {topProfile.name}, {topProfile.age}
              </Text>
              {topProfile.showOnlineStatus !== false &&
                topProfile.lastActive && (
                  <Text variant="bodySmall" style={styles.overlayText}>
                    {formatLastActive(
                      topProfile.lastActive,
                      topProfile.isOnline
                    )}
                  </Text>
                )}
              {currentUserLocation &&
              topProfile.latitude &&
              topProfile.longitude ? (
                <Text variant="bodySmall" style={styles.overlayText}>
                  {getDistanceToProfile(currentUserLocation, {
                    latitude: topProfile.latitude,
                    longitude: topProfile.longitude,
                    city: topProfile.city,
                  })}
                </Text>
              ) : (
                topProfile.city && (
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
            <Card.Cover source={{ uri: bottomProfile.photos[0] }} />
            <Card.Content style={styles.cardOverlay}>
              <Text variant="titleLarge" style={styles.overlayText}>
                {bottomProfile.name}, {bottomProfile.age}
              </Text>
              {bottomProfile.showOnlineStatus !== false &&
                bottomProfile.lastActive && (
                  <Text variant="bodySmall" style={styles.overlayText}>
                    {formatLastActive(
                      bottomProfile.lastActive,
                      bottomProfile.isOnline
                    )}
                  </Text>
                )}
              {currentUserLocation &&
              bottomProfile.latitude &&
              bottomProfile.longitude ? (
                <Text variant="bodySmall" style={styles.overlayText}>
                  {getDistanceToProfile(currentUserLocation, {
                    latitude: bottomProfile.latitude,
                    longitude: bottomProfile.longitude,
                    city: bottomProfile.city,
                  })}
                </Text>
              ) : (
                bottomProfile.city && (
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
    flexDirection: "row",
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
  ratingStars: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
  },
});
