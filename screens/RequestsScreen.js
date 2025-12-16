import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
  Image,
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
// ✅ FIXED: Using React Native Firebase instead of web SDK
import firestore from "@react-native-firebase/firestore";
import {
  acceptDuoLike,
  getCurrentDuoPartner,
  deleteDuoLike,
  getUserProfile,
  saveDuoSwipe,
  saveRating,
} from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import {
  EmptyState,
  ProfilePhoto,
  StarRating,
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

    // ✅ FIXED: Using React Native Firebase syntax
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

            // ✅ Better logging for debugging
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
                // ✅ FIX: Store original user IDs for acceptance checking
                fromUser1Id: likeData.fromUser1,
                fromUser2Id: likeData.fromUser2,
                acceptedBy: likeData.acceptedBy || [],
                timestamp: likeData.timestamp,
                status: likeData.status,
              });
            } else {
              console.error("⚠️ Missing profile data for like:", doc.id, {
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

    const success = await acceptDuoLike(
      likeId,
      currentUserId,
      currentDuo.duoId,
      fromDuoId
    );
    if (success) {
      Alert.alert("Accepted!", "You've accepted this duo request");
    } else {
      Alert.alert("Error", "Failed to accept request");
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

  const handleProfileClick = (profile) => {
    setSelectedProfile(profile);
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
    if (
      selectedProfile?.photos &&
      currentImageIndex > 1 &&
      currentImageIndex > 0
    ) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleRateProfile = () => {
    setShowRatingModal(true);
  };

  const submitRating = async (rating) => {
    if (selectedProfile) {
      await saveRating(currentUserId, selectedProfile.userId, rating);
      Alert.alert(
        "Success",
        `You rated ${selectedProfile.name} ${rating} stars!`
      );
      setShowRatingModal(false);
    }
  };

  // Rating Modal
  if (showRatingModal && selectedProfile) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Surface style={styles.modalSurface} elevation={4}>
          <Card style={styles.ratingCard}>
            <Card.Title
              title={`Rate ${selectedProfile.name}`}
              subtitle="How would you rate this profile?"
            />
            <Card.Content>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <IconButton
                    key={star}
                    icon="star"
                    size={48}
                    iconColor="#FFD700"
                    onPress={() => submitRating(star)}
                  />
                ))}
              </View>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => setShowRatingModal(false)}>Cancel</Button>
            </Card.Actions>
          </Card>
        </Surface>
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
          <IconButton icon="star" onPress={handleRateProfile} />
        </Surface>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Card style={styles.profileCard}>
            {currentPhoto ? (
              <Card.Cover
                source={{ uri: currentPhoto }}
                style={styles.profileCover}
              />
            ) : (
              <View style={styles.noPhotoContainer}>
                <ProfilePhoto size={120} />
                <Text variant="bodyLarge">No photos available</Text>
              </View>
            )}

            {hasPhotos && selectedProfile.photos.length > 1 && (
              <View style={styles.photoNavigation}>
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
                      // ✅ FIX: Handle tags being string, array, or undefined
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
            // ✅ FIX: Use the stored original user IDs from duoLikes document
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

            // ✅ Debug logging for acceptance tracking
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

            // ✅ Debug: Check if profiles exist
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
                    {/* First Profile */}
                    <View style={styles.profileButton}>
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
                    </View>

                    <Text variant="displaySmall" style={styles.plusSign}>
                      +
                    </Text>

                    {/* Second Profile */}
                    <View style={styles.profileButton}>
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
                    </View>
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
  modalSurface: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  ratingCard: {
    width: "100%",
    maxWidth: 400,
  },
  ratingStars: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileCover: {
    height: 400,
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
});
