import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Chip,
  Surface,
  ActivityIndicator,
  IconButton,
  useTheme,
  Divider,
  Icon,
} from "react-native-paper";
import firestore from "@react-native-firebase/firestore";
import {
  acceptDuoLike,
  getCurrentDuoPartner,
  deleteDuoLike,
  getUserProfile,
  saveDuoSwipe,
  saveRating,
  hasUserRatedProfile,
} from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import {
  EmptyState,
  ProfilePhoto,
} from "../components/CommonComponents";

export default function RequestsScreen({ isActive = true }) {
  const theme = useTheme();
  const [duoLikes, setDuoLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDuo, setCurrentDuo] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingProfile, setRatingProfile] = useState(null);
  const [hasRatedUser, setHasRatedUser] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [hoveredStar, setHoveredStar] = useState(0);

  const currentUserId = CURRENT_USER_ID;

  // Reload duo partner when screen becomes active
  useEffect(() => {
    if (isActive) {
      loadDuoPartner();
    }
  }, [isActive]);

  const loadDuoPartner = async () => {
    setLoading(true);
    try {
      const duo = await getCurrentDuoPartner(currentUserId);
      console.log("Current duo loaded:", duo);
      setCurrentDuo(duo);
      if (!duo) {
        console.log("No duo partner found");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading duo partner:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentDuo) {
      console.log("No current duo, skipping listener setup");
      return;
    }

    console.log("Setting up duo likes listener for duoId:", currentDuo.duoId);

    const unsubscribe = firestore()
      .collection("duoLikes")
      .where("toDuoId", "==", currentDuo.duoId)
      .where("status", "==", "pending")
      .onSnapshot(
        async (snapshot) => {
          console.log("Duo likes snapshot received, docs:", snapshot.size);

          const likes = [];
          for (const doc of snapshot.docs) {
            const likeData = doc.data();
            console.log("Processing like:", doc.id, likeData);

            // Better logging for debugging
            console.log("Fetching profiles for:", {
              fromUser1: likeData.fromUser1,
              fromUser2: likeData.fromUser2,
            });

            const user1Profile = await getUserProfile(likeData.fromUser1);
            const user2Profile = await getUserProfile(likeData.fromUser2);

            console.log("Profiles loaded:", {
              user1: user1Profile
                ? `${user1Profile.name} (${user1Profile.userId})`
                : "MISSING",
              user2: user2Profile
                ? `${user2Profile.name} (${user2Profile.userId})`
                : "MISSING",
            });

            if (user1Profile && user2Profile) {
              likes.push({
                id: doc.id,
                fromDuoId: likeData.fromDuoId,
                toDuoId: likeData.toDuoId,
                user1: user1Profile,
                user2: user2Profile,
                // Store original user IDs for acceptance checking
                fromUser1Id: likeData.fromUser1,
                fromUser2Id: likeData.fromUser2,
                acceptedBy: likeData.acceptedBy || [],
                timestamp: likeData.timestamp,
                status: likeData.status,
              });
            } else {
              console.error("Missing profile data for like:", doc.id, {
                user1Profile: !!user1Profile,
                user2Profile: !!user2Profile,
                fromUser1: likeData.fromUser1,
                fromUser2: likeData.fromUser2,
              });
            }
          }

          console.log("Total duo likes loaded:", likes.length);
          setDuoLikes(likes);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading pending requests:", error);
          setLoading(false);
        }
      );

    return () => {
      console.log("Cleaning up duo likes listener");
      unsubscribe();
    };
  }, [currentDuo]);

  // Check rating status when viewing a profile OR when component becomes active
  useEffect(() => {
    const checkRatingStatus = async () => {
      if (selectedProfile) {
        try {
          const profileId = selectedProfile.userId || selectedProfile.id;
          const ratingCheck = await hasUserRatedProfile(
            currentUserId,
            profileId
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

  const loadData = async () => {
    await loadDuoPartner();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAccept = async (likeId, fromDuoId) => {
  if (!currentDuo) {
    Alert.alert("Error", "You need to be in a duo to accept requests");
    return;
  }

  try {
    console.log("Accepting duo like:", {
      likeId,
      currentUserId,
      currentDuoId: currentDuo.duoId,
      fromDuoId,
    });

    const success = await acceptDuoLike(
      likeId,
      currentUserId,
      currentDuo.duoId,
      fromDuoId
    );

    console.log("Accept result:", success);

    if (success) {
      Alert.alert("Accepted!", "You've accepted this duo request");
      // The listener should automatically update the UI
    } else {
      Alert.alert("Error", "Failed to accept request. Please try again.");
    }
  } catch (error) {
    console.error("Error accepting duo like:", error);
    Alert.alert(
      "Error",
      `Failed to accept request: ${error.message || "Unknown error"}`
    );
  }
};

  const handleDecline = async (likeId, fromDuoId) => {
    if (!currentDuo) return;

    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this duo like?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            await saveDuoSwipe(currentDuo.duoId, fromDuoId, "pass");
            const success = await deleteDuoLike(likeId);
            if (success) {
              Alert.alert("Declined", "Request has been removed");
            } else {
              Alert.alert("Error", "Failed to decline request");
            }
          },
        },
      ]
    );
  };

  const handleProfileClick = async (profile) => {
    if (!profile) {
      console.log("No profile provided to handleProfileClick");
      return;
    }

    try {
      // Get user ID from various possible fields
      const userId =
        profile.userId ||
        profile.id ||
        profile.fromUser1Id ||
        profile.fromUser2Id;

      if (!userId) {
        console.error("Profile has no userId:", profile);
        Alert.alert(
          "Error",
          "Could not identify user. Profile data may be incomplete."
        );
        return;
      }

      console.log("Fetching full profile for:", userId);
      console.log("Profile object:", {
        name: profile.name,
        hasUserId: !!profile.userId,
        hasId: !!profile.id,
        hasPhotos: !!profile.photos,
        photoCount: profile.photos?.length || 0,
      });

      // Fetch the full profile to ensure we have all data including photos
      const fullProfile = await getUserProfile(userId);

      if (fullProfile) {
        console.log("Full profile loaded:", {
          name: fullProfile.name,
          userId: fullProfile.userId,
          photoCount: fullProfile.photos?.length || 0,
          photos: fullProfile.photos,
        });

        setSelectedProfile({
          ...profile,
          ...fullProfile,
          // Ensure userId is set
          userId: fullProfile.userId || userId,
          id: fullProfile.userId || userId,
          // Ensure photos are included
          photos: fullProfile.photos || profile.photos || [],
        });
      } else {
        console.log("Could not load full profile, using existing profile data");
        // Fallback to existing profile data
        setSelectedProfile({
          ...profile,
          userId: userId,
          id: userId,
          photos: profile.photos || [],
        });
      }
    } catch (error) {
      console.error("Error loading full profile:", error);
      // Fallback to existing profile data
      setSelectedProfile({
        ...profile,
        photos: profile.photos || [],
      });
    }

    setCurrentImageIndex(0);
  };

  const handleNextImage = () => {
    if (
      selectedProfile?.photos &&
      currentImageIndex < selectedProfile.photos.length - 1
    ) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (selectedProfile?.photos && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Instagram-style tap navigation
  const handleImageTap = (event) => {
    if (!selectedProfile?.photos || selectedProfile.photos.length <= 1) return;

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

  const handleRateProfile = async (profile) => {
    if (!profile) return;

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
            : `You rated ${ratingProfile.name || "this user"} ${rating} stars!`
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
    const hasPhotos =
      selectedProfile.photos && selectedProfile.photos.length > 0;
    const currentPhoto = hasPhotos
      ? selectedProfile.photos[currentImageIndex]
      : null;

    console.log("Rendering profile view:", {
      name: selectedProfile.name,
      hasPhotos,
      photoCount: selectedProfile.photos?.length || 0,
      currentPhoto: currentPhoto ? "URL present" : "NO URL",
      currentImageIndex,
      actualPhotoURL: currentPhoto ? currentPhoto.substring(0, 100) : "NONE",
    });

    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Surface style={styles.header} elevation={2}>
          <IconButton
            icon="arrow-left"
            onPress={() => setSelectedProfile(null)}
          />
          <Text variant="titleLarge">Profile</Text>
          <View style={{ width: 48 }} />
        </Surface>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Card style={styles.profileImageCard}>
            {currentPhoto ? (
              <TouchableOpacity activeOpacity={0.9} onPress={handleImageTap}>
                <View style={styles.profileCover}>
                  <Image
                    key={currentPhoto}
                    source={{ uri: currentPhoto }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    onLoad={() => {
                      console.log(
                        "Image loaded successfully:",
                        currentPhoto.substring(0, 50) + "..."
                      );
                    }}
                    onError={(error) => {
                      console.error(
                        "Image load error:",
                        error.nativeEvent?.error
                      );
                      console.log("Failed to load image URL:", currentPhoto);
                    }}
                  />
                </View>
                {hasPhotos && selectedProfile.photos.length > 1 && (
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
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.noPhotoContainer}>
                <ProfilePhoto size={120} />
                <Text variant="bodyLarge">No photos available</Text>
              </View>
            )}
          </Card>

          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="headlineMedium">
                {selectedProfile.name}, {selectedProfile.age}
              </Text>

              {selectedProfile.description && (
                <Text variant="bodyLarge" style={styles.description}>
                  {selectedProfile.description}
                </Text>
              )}

              {selectedProfile.tags && (
                <View style={styles.tagsContainer}>
                  <Text variant="titleSmall">Interests:</Text>
                  <View style={styles.tagsDisplay}>
                    {(() => {
                      // FIX: Handle tags being string, array, or undefined
                      let tagsArray = [];
                      if (typeof selectedProfile.tags === "string") {
                        tagsArray = selectedProfile.tags
                          .split(" ")
                          .filter((tag) => tag.trim());
                      } else if (Array.isArray(selectedProfile.tags)) {
                        tagsArray = selectedProfile.tags;
                      }

                      return tagsArray.map((tag, index) => (
                        <Chip key={index} style={styles.tag} compact>
                          {tag}
                        </Chip>
                      ));
                    })()}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>

          {hasRatedUser ? (
            <Card
              style={{
                margin: 16,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              <Card.Content>
                <View style={{ alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
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
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading requests...
        </Text>
      </View>
    );
  }

  // No duo partner
  if (!currentDuo) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon="account-group"
          title="No Duo Partner"
          message="You need to set up a duo partner first to receive duo likes. Go to your profile to get started!"
          actionLabel="Refresh"
          onAction={onRefresh}
        />
      </View>
    );
  }

  // Main view
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <Text variant="headlineMedium">Duo Likes</Text>
          {currentDuo && (
            <Chip icon="account-group" style={styles.duoChip}>
              Duo with {currentDuo.partnerName}
            </Chip>
          )}
        </View>
      </Surface>

      <View style={styles.requestsList}>
        {duoLikes.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No Pending Requests"
            message="When other duos like you, they'll appear here!"
          />
        ) : (
          duoLikes.map((like) => {
            // FIX: Use the stored original user IDs from duoLikes document
            const fromUser1Accepted =
              like.acceptedBy?.includes(like.fromUser1Id) || false;
            const fromUser2Accepted =
              like.acceptedBy?.includes(like.fromUser2Id) || false;
            const currentUserAccepted =
              like.acceptedBy?.includes(currentUserId) || false;
            const partnerAccepted = currentDuo
              ? like.acceptedBy?.includes(currentDuo.partnerId) || false
              : false;

            const sendingDuoAcceptances =
              (fromUser1Accepted ? 1 : 0) + (fromUser2Accepted ? 1 : 0);
            const yourDuoFullyAccepted = currentUserAccepted && partnerAccepted;
            const allAccepted =
              sendingDuoAcceptances === 2 && yourDuoFullyAccepted;

            // Debug logging for acceptance tracking
            console.log("Rendering like card:", {
              likeId: like.id,
              user1: like.user1?.name,
              user2: like.user2?.name,
              fromUser1Id: like.fromUser1Id,
              fromUser2Id: like.fromUser2Id,
              fromUser1Accepted,
              fromUser2Accepted,
              currentUserAccepted,
              partnerAccepted,
              sendingDuoAcceptances,
              yourDuoFullyAccepted,
              allAccepted,
              acceptedBy: like.acceptedBy,
            });

            // Debug: Check if profiles exist
            console.log("Profile check:", {
              hasUser1: !!like.user1,
              hasUser2: !!like.user2,
              user1Name: like.user1?.name,
              user2Name: like.user2?.name,
              user1Age: like.user1?.age,
              user2Age: like.user2?.age,
            });

            return (
              <Card key={like.id} style={styles.requestCard}>
                <Card.Title
                  title={allAccepted ? "Match Ready!" : "Duo Like"}
                  titleVariant="titleLarge"
                  left={(props) => (
                    <Icon
                      source={allAccepted ? "check-circle" : "heart"}
                      size={24}
                      color={allAccepted ? "#4CAF50" : theme.colors.primary}
                    />
                  )}
                />
                <Card.Content>
                  <View style={styles.duoPairContainer}>
                    {/* First Profile - Clickable */}
                    <TouchableOpacity
                      style={styles.profileButton}
                      onPress={() => handleProfileClick(like.user1)}
                      disabled={!like.user1}
                    >
                      <View style={styles.profileCard}>
                        <ProfilePhoto uri={like.user1?.photos?.[0]} size={80} />
                        <Text variant="titleMedium" style={styles.profileName}>
                          {like.user1?.name || "?"}, {like.user1?.age || "?"}
                        </Text>
                        {fromUser1Accepted && (
                          <Chip
                            icon="check"
                            style={styles.acceptedChip}
                            compact
                          >
                            Accepted
                          </Chip>
                        )}
                      </View>
                    </TouchableOpacity>

                    <Text variant="displaySmall" style={styles.plusSign}>
                      +
                    </Text>

                    {/* Second Profile - Clickable */}
                    <TouchableOpacity
                      style={styles.profileButton}
                      onPress={() => handleProfileClick(like.user2)}
                      disabled={!like.user2}
                    >
                      <View style={styles.profileCard}>
                        <ProfilePhoto uri={like.user2?.photos?.[0]} size={80} />
                        <Text variant="titleMedium" style={styles.profileName}>
                          {like.user2?.name || "?"}, {like.user2?.age || "?"}
                        </Text>
                        {fromUser2Accepted && (
                          <Chip
                            icon="check"
                            style={styles.acceptedChip}
                            compact
                          >
                            Accepted
                          </Chip>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>

                  <Divider style={styles.divider} />

                  <Surface style={styles.statusSection} elevation={1}>
                    <Text variant="titleSmall">Acceptance Status:</Text>
                    <Text variant="bodyMedium" style={styles.statusText}>
                      Their duo: {sendingDuoAcceptances}/2 accepted
                    </Text>
                    <Text variant="bodyMedium" style={styles.statusText}>
                      Your duo:{" "}
                      {currentUserAccepted ? "You (accepted)" : "You (pending)"}{" "}
                      •{" "}
                      {partnerAccepted
                        ? `${currentDuo.partnerName} (accepted)`
                        : `${currentDuo.partnerName} (pending)`}
                    </Text>
                  </Surface>

                  {!allAccepted && (
                    <View style={styles.actionButtons}>
                      {!currentUserAccepted ? (
                        <>
                          <Button
                            mode="outlined"
                            icon="close"
                            onPress={() =>
                              handleDecline(like.id, like.fromDuoId)
                            }
                            style={styles.actionButton}
                          >
                            Decline
                          </Button>
                          <Button
                            mode="contained"
                            icon="check"
                            onPress={() =>
                              handleAccept(like.id, like.fromDuoId)
                            }
                            style={styles.actionButton}
                          >
                            Accept
                          </Button>
                        </>
                      ) : (
                        <Chip icon="clock" style={styles.waitingChip}>
                          Waiting for {currentDuo.partnerName} to accept
                        </Chip>
                      )}
                    </View>
                  )}

                  {allAccepted && (
                    <Chip icon="check-circle" style={styles.matchedChip}>
                      Match complete! Check Messages to chat!
                    </Chip>
                  )}

                  <Text variant="bodySmall" style={styles.timestamp}>
                    Liked on{" "}
                    {new Date(like.timestamp?.toDate()).toLocaleDateString()}
                  </Text>
                </Card.Content>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    padding: 16,
  },
  headerContent: {
    gap: 8,
  },
  duoChip: {
    alignSelf: "flex-start",
  },
  requestsList: {
    padding: 16,
  },
  requestCard: {
    marginBottom: 16,
  },
  duoPairContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  profileButton: {
    flex: 1,
  },
  profileCard: {
    alignItems: "center",
    padding: 8,
  },
  profileName: {
    marginTop: 8,
    textAlign: "center",
  },
  plusSign: {
    marginHorizontal: 8,
    color: "#2196F3",
  },
  acceptedChip: {
    marginTop: 4,
    backgroundColor: "#4CAF50",
  },
  divider: {
    marginVertical: 12,
  },
  statusSection: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  waitingChip: {
    backgroundColor: "#FF9800",
  },
  matchedChip: {
    marginTop: 12,
    backgroundColor: "#4CAF50",
  },
  timestamp: {
    marginTop: 12,
    textAlign: "center",
    opacity: 0.7,
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
  profileCover: {
    height: 400,
    backgroundColor: "#f0f0f0", // Light gray background to see if container renders
  },
  profileImageCard: {
    marginBottom: 0,
    overflow: "hidden",
  },
  noPhotoContainer: {
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  photoNavigation: {
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
  infoCard: {
    margin: 16,
  },
  description: {
    marginTop: 12,
    lineHeight: 24,
  },
  tagsContainer: {
    marginTop: 16,
  },
  tagsDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
  },
  rateButton: {
    margin: 16,
  },
});
