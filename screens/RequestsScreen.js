import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from "react-native";
import { db } from "../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { acceptDuoLike, getCurrentDuoPartner, deleteDuoLike, getUserProfile, saveDuoSwipe, saveRating } from "../profileService";
import { CURRENT_USER_ID } from "../UserConfig";

export default function RequestsScreen() {
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

  // Load current duo partner first
  const loadDuoPartner = async () => {
    setLoading(true);
    try {
      const duo = await getCurrentDuoPartner(currentUserId);
      setCurrentDuo(duo);
      
      if (!duo) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading duo partner:", error);
      setLoading(false);
    }
  };

  // Set up real-time listener for duo likes
  useEffect(() => {
    if (!currentDuo) return;

    console.log("Setting up real-time listener for duo likes...");
    
    // Listen to duo likes in real-time
    const likesQuery = query(
      collection(db, "duoLikes"),
      where("toDuoId", "==", currentDuo.duoId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(likesQuery, async (snapshot) => {
      console.log(`Received ${snapshot.docs.length} duo likes from Firestore`);
      
      const likes = [];
      for (const doc of snapshot.docs) {
        const likeData = doc.data();
        
        // Get profiles for the duo that liked you
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
    }, (error) => {
      console.error("Error in duo likes listener:", error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => {
      console.log("Cleaning up duo likes listener");
      unsubscribe();
    };
  }, [currentDuo]);

  const loadData = async () => {
    // This is now handled by the real-time listener
    // Just reload the duo partner
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

    const success = await acceptDuoLike(likeId, currentUserId, currentDuo.duoId, fromDuoId);
    
    if (success) {
      Alert.alert("Accepted!", "You've accepted this duo request");
      // No need to reload - real-time listener will update automatically
    } else {
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleDecline = async (likeId, fromDuoId) => {
    if (!currentDuo) return;
    
    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this duo like? This will permanently remove it and you won't see them again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            // Save the decline swipe so they never see this duo again
            await saveDuoSwipe(currentDuo.duoId, fromDuoId, "pass");
            
            // Delete the duo like
            const success = await deleteDuoLike(likeId);
            if (success) {
              Alert.alert("Declined", "Request has been removed - you won't see this duo again");
              // No need to reload - real-time listener will update automatically
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
    if (selectedProfile && selectedProfile.photos && selectedProfile.photos.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % selectedProfile.photos.length
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedProfile && selectedProfile.photos && selectedProfile.photos.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? selectedProfile.photos.length - 1 : prevIndex - 1
      );
    }
  };

  const handleRateProfile = () => {
    setShowRatingModal(true);
  };

  const submitRating = async (rating) => {
    if (selectedProfile) {
      await saveRating(currentUserId, selectedProfile.userId, rating);
      Alert.alert("Rating Submitted", `You rated ${selectedProfile.name} ${rating} stars!`);
      setShowRatingModal(false);
    }
  };

  // Rating Modal
  if (showRatingModal && selectedProfile) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.ratingModal}>
          <Text style={styles.modalTitle}>Rate {selectedProfile.name}</Text>
          <Text style={styles.modalSubtitle}>How would you rate this profile?</Text>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => submitRating(star)}
              >
                <Text style={styles.starText}>⭐</Text>
                <Text style={styles.starNumber}>{star}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowRatingModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If viewing a single profile
  if (selectedProfile) {
    const hasPhotos = selectedProfile.photos && selectedProfile.photos.length > 0;
    const currentPhoto = hasPhotos ? selectedProfile.photos[currentImageIndex] : null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedProfile(null)} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Requests</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileViewContainer}>
            <View style={styles.imageCard}>
              {currentPhoto ? (
                <>
                  <Image 
                    source={{ uri: currentPhoto }} 
                    style={styles.fullProfileImage} 
                    resizeMode="cover" 
                  />
                  
                  {/* Left tap zone for previous image */}
                  {hasPhotos && selectedProfile.photos.length > 1 && (
                    <>
                      <TouchableOpacity 
                        style={styles.leftTapZone}
                        onPress={handlePrevImage}
                        activeOpacity={1}
                      />
                      
                      {/* Right tap zone for next image */}
                      <TouchableOpacity 
                        style={styles.rightTapZone}
                        onPress={handleNextImage}
                        activeOpacity={1}
                      />
                    </>
                  )}
                  
                  {hasPhotos && selectedProfile.photos.length > 1 && (
                    <View style={styles.dotsContainer} pointerEvents="none">
                      {selectedProfile.photos.map((_, index) => (
                        <View 
                          key={index} 
                          style={[
                            styles.dot,
                            index === currentImageIndex && styles.activeDot
                          ]} 
                        />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noPhotoContainer}>
                  <Text style={styles.noPhotoText}>📷</Text>
                  <Text style={styles.noPhotoSubtext}>No photos available</Text>
                </View>
              )}
            </View>

            <View style={styles.profileInfoCard}>
              <Text style={styles.profileDetailName}>
                {selectedProfile.name || "Unknown"}, {selectedProfile.age || "?"}
              </Text>
              <Text style={styles.profileDetailDescription}>
                {selectedProfile.description || "No description"}
              </Text>
              <Text style={styles.profileDetailTags}>
                {selectedProfile.tags || "No tags"}
              </Text>
              
              <TouchableOpacity 
                style={styles.rateButton}
                onPress={handleRateProfile}
              >
                <Text style={styles.rateButtonText}>⭐ Rate this profile</Text>
              </TouchableOpacity>
            </View>

            {hasPhotos && selectedProfile.photos.length > 1 && (
              <Text style={styles.instructions}>
                Tap left/right on image to see more photos
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!currentDuo) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>👯 No Duo Partner</Text>
        <Text style={styles.emptyText}>
          You need to be in a duo to receive double date requests!{"\n\n"}
          Go to your Profile tab to find a duo partner.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Loading requests...</Text>
      </View>
    );
  }

  if (duoLikes.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>💌 Duo Requests</Text>
          <Text style={styles.subtitle}>
            Your duo with {currentDuo.partnerName}
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Requests Yet</Text>
          <Text style={styles.emptyText}>
            When other duos like you, they'll appear here!{"\n\n"}
            Both you and {currentDuo.partnerName} need to accept before matching.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>💌 Duo Requests</Text>
        <Text style={styles.subtitle}>
          Your duo with {currentDuo.partnerName}
        </Text>
      </View>

      <View style={styles.requestsList}>
        {duoLikes.map((like) => {
          // Check who has accepted
          const fromUser1Accepted = like.acceptedBy?.includes(like.user1.userId) || false;
          const fromUser2Accepted = like.acceptedBy?.includes(like.user2.userId) || false;
          const currentUserAccepted = like.acceptedBy?.includes(currentUserId) || false;
          const partnerAccepted = currentDuo ? like.acceptedBy?.includes(currentDuo.partnerId) || false : false;
          
          // Count acceptances from the SENDING duo (who liked you)
          const sendingDuoAcceptances = (fromUser1Accepted ? 1 : 0) + (fromUser2Accepted ? 1 : 0);
          
          // Check if your duo has fully accepted
          const yourDuoFullyAccepted = currentUserAccepted && partnerAccepted;
          
          // Check if a match is ready (all 4 have accepted)
          const allAccepted = sendingDuoAcceptances === 2 && yourDuoFullyAccepted;

          return (
            <View key={like.id} style={styles.requestCard}>
              <Text style={styles.requestTitle}>
                {allAccepted ? "✅ Match Ready!" : "💕 Duo Like"}
              </Text>

              {/* Show the duo that liked you */}
              <View style={styles.duoPairContainer}>
                {/* User 1 */}
                <TouchableOpacity 
                  style={styles.profileCard}
                  onPress={() => handleProfileClick(like.user1)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: like.user1.photos[0] }} 
                    style={styles.profileImage} 
                  />
                  <Text style={styles.profileName}>
                    {like.user1.name}, {like.user1.age}
                  </Text>
                  <Text style={styles.tapToView}>Tap to view</Text>
                  {fromUser1Accepted && (
                    <View style={styles.acceptedBadge}>
                      <Text style={styles.acceptedText}>✓ Accepted</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.plusSign}>+</Text>

                {/* User 2 */}
                <TouchableOpacity 
                  style={styles.profileCard}
                  onPress={() => handleProfileClick(like.user2)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: like.user2.photos[0] }} 
                    style={styles.profileImage} 
                  />
                  <Text style={styles.profileName}>
                    {like.user2.name}, {like.user2.age}
                  </Text>
                  <Text style={styles.tapToView}>Tap to view</Text>
                  {fromUser2Accepted && (
                    <View style={styles.acceptedBadge}>
                      <Text style={styles.acceptedText}>✓ Accepted</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Acceptance Status */}
              <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>Acceptance Status:</Text>
                <Text style={styles.statusText}>
                  Their duo: {sendingDuoAcceptances}/2 accepted ✓
                </Text>
                <Text style={styles.statusText}>
                  Your duo: {currentUserAccepted ? "✓ You" : "○ You"} • {partnerAccepted ? `✓ ${currentDuo.partnerName}` : `○ ${currentDuo.partnerName}`}
                </Text>
              </View>

              {/* Action Buttons */}
              {!allAccepted && (
                <View style={styles.buttonContainer}>
                  {!currentUserAccepted ? (
                    <>
                      <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={() => handleAccept(like.id, like.fromDuoId)}
                      >
                        <Text style={styles.buttonText}>✓ Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.declineButton}
                        onPress={() => handleDecline(like.id, like.fromDuoId)}
                      >
                        <Text style={styles.buttonText}>✗ Decline</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.waitingCard}>
                      <Text style={styles.waitingText}>
                        ⏳ Waiting for {currentDuo.partnerName} to accept
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {allAccepted && (
                <View style={styles.matchedCard}>
                  <Text style={styles.matchedText}>
                    🎉 Match complete! Check Messages to chat!
                  </Text>
                </View>
              )}

              <Text style={styles.timestamp}>
                Liked on {new Date(like.timestamp?.toDate()).toLocaleDateString()}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  requestsList: {
    padding: 15,
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  duoPairContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  profileCard: {
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#e0e0e0",
  },
  fullProfileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  plusSign: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E90FF",
    marginHorizontal: 10,
  },
  acceptedBadge: {
    backgroundColor: "#4CAF50",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginTop: 5,
  },
  acceptedText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  statusContainer: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
  },
  declineButton: {
    backgroundColor: "#F44336",
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  waitingCard: {
    backgroundColor: "#FFF3CD",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  waitingText: {
    color: "#856404",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  matchedCard: {
    backgroundColor: "#D4EDDA",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  matchedText: {
    color: "#155724",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E90FF",
  },
  profileViewContainer: {
    padding: 15,
  },
  imageCard: {
    width: "100%",
    height: 500,
    borderRadius: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    overflow: "hidden",
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#e0e0e0",
  },
  leftTapZone: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "100%",
    backgroundColor: "transparent",
    zIndex: 100,
  },
  rightTapZone: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "50%",
    height: "100%",
    backgroundColor: "transparent",
    zIndex: 100,
  },
  dotsContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  profileInfoCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 15,
  },
  profileDetailName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  profileDetailDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 10,
  },
  profileDetailTags: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
  },
  instructions: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
  },
  tapToView: {
    fontSize: 12,
    color: "#1E90FF",
    marginTop: 5,
    textAlign: "center",
  },
  noPhotoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  noPhotoText: {
    fontSize: 80,
    marginBottom: 10,
  },
  noPhotoSubtext: {
    fontSize: 16,
    color: "#666",
  },
  rateButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 15,
    alignItems: "center",
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  starButton: {
    alignItems: "center",
    padding: 10,
  },
  starText: {
    fontSize: 40,
  },
  starNumber: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    color: "#333",
  },
  cancelButton: {
    backgroundColor: "#ccc",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#333",
  },
});