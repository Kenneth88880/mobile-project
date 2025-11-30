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
import { db } from "../services/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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

export default function RequestsScreen() {
  const theme = useTheme();
  const [duoLikes, setDuoLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDuo, setCurrentDuo] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const currentUserId = CURRENT_USER_ID;

  useEffect(() => {
    loadDuoPartner();
  }, []);

  const loadDuoPartner = async () => {
    setLoading(true);
    try {
      const duo = await getCurrentDuoPartner(currentUserId);
      setCurrentDuo(duo);
      if (!duo) setLoading(false);
    } catch (error) {
      console.error("Error loading duo partner:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentDuo) return;

    const likesQuery = query(
      collection(db, "duoLikes"),
      where("toDuoId", "==", currentDuo.duoId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      likesQuery,
      async (snapshot) => {
        const likes = [];
        for (const doc of snapshot.docs) {
          const likeData = doc.data();
          const user1Profile = await getUserProfile(likeData.fromUser1);
          const user2Profile = await getUserProfile(likeData.fromUser2);

          if (user1Profile && user2Profile) {
            likes.push({
              id: doc.id,
              fromDuoId: likeData.fromDuoId,
              toDuoId: likeData.toDuoId,
              user1: user1Profile,
              user2: user2Profile,
              acceptedBy: likeData.acceptedBy || [],
              timestamp: likeData.timestamp,
              status: likeData.status,
            });
          }
        }

        setDuoLikes(likes);
        setLoading(false);
      },
      (error) => {
        console.error("Error in duo likes listener:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
                {selectedProfile.name || "Unknown"},{" "}
                {selectedProfile.age || "?"}
              </Text>

              {selectedProfile.description && (
                <Text variant="bodyLarge" style={styles.description}>
                  {selectedProfile.description}
                </Text>
              )}

              {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  <Text variant="titleSmall">Interests:</Text>
                  <View style={styles.tagsDisplay}>
                    {selectedProfile.tags.map((tag, index) => (
                      <Chip key={index} style={styles.tag} compact>
                        {tag}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" icon="star" onPress={handleRateProfile}>
                Rate Profile
              </Button>
            </Card.Actions>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (!currentDuo) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Surface style={styles.header} elevation={2}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon source="heart" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium">Like Requests</Text>
          </View>
        </Surface>
        <EmptyState
          icon="account-multiple"
          title="No Duo Partner"
          message="You need to be in a duo to receive double date requests! Go to your Profile tab to find a duo partner."
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Surface style={styles.header} elevation={2}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon source="heart" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium">Like Requests</Text>
          </View>
        </Surface>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading requests...
          </Text>
        </View>
      </View>
    );
  }

  if (duoLikes.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Surface style={styles.header} elevation={2}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon source="heart" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium">Like Requests</Text>
          </View>
          <Chip icon="account-multiple">
            Your duo with {currentDuo.partnerName}
          </Chip>
        </Surface>
        <EmptyState
          icon="email-heart"
          title="No Requests Yet"
          message={`When other duos like you, they'll appear here!\n\nBoth you and ${currentDuo.partnerName} need to accept before matching.`}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon source="heart" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium">Like Requests</Text>
          </View>
          <Chip icon="account-multiple" style={styles.duoChip}>
            Your duo with {currentDuo.partnerName}
          </Chip>
        </View>
      </Surface>

      <View style={styles.requestsList}>
        {duoLikes.map((like) => {
          const fromUser1Accepted =
            like.acceptedBy?.includes(like.user1.userId) || false;
          const fromUser2Accepted =
            like.acceptedBy?.includes(like.user2.userId) || false;
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
                  <Button
                    mode="text"
                    onPress={() => handleProfileClick(like.user1)}
                    style={styles.profileButton}
                  >
                    <View style={styles.profileCard}>
                      <ProfilePhoto uri={like.user1.photos?.[0]} size={80} />
                      <Text variant="titleMedium" style={styles.profileName}>
                        {like.user1.name}, {like.user1.age}
                      </Text>
                      {fromUser1Accepted && (
                        <Chip icon="check" style={styles.acceptedChip} compact>
                          Accepted
                        </Chip>
                      )}
                    </View>
                  </Button>

                  <Text variant="displaySmall" style={styles.plusSign}>
                    +
                  </Text>

                  <Button
                    mode="text"
                    onPress={() => handleProfileClick(like.user2)}
                    style={styles.profileButton}
                  >
                    <View style={styles.profileCard}>
                      <ProfilePhoto uri={like.user2.photos?.[0]} size={80} />
                      <Text variant="titleMedium" style={styles.profileName}>
                        {like.user2.name}, {like.user2.age}
                      </Text>
                      {fromUser2Accepted && (
                        <Chip icon="check" style={styles.acceptedChip} compact>
                          Accepted
                        </Chip>
                      )}
                    </View>
                  </Button>
                </View>

                <Divider style={styles.divider} />

                <Surface style={styles.statusSection} elevation={1}>
                  <Text variant="titleSmall">Acceptance Status:</Text>
                  <Text variant="bodyMedium" style={styles.statusText}>
                    Their duo: {sendingDuoAcceptances}/2 accepted
                  </Text>
                  <Text variant="bodyMedium" style={styles.statusText}>
                    Your duo:{" "}
                    {currentUserAccepted ? "You (accepted)" : "You (pending)"} •{" "}
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
                          onPress={() => handleDecline(like.id, like.fromDuoId)}
                          style={styles.actionButton}
                        >
                          Decline
                        </Button>
                        <Button
                          mode="contained"
                          icon="check"
                          onPress={() => handleAccept(like.id, like.fromDuoId)}
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
        })}
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
