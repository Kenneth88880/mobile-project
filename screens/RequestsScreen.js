import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from "react-native";
import { db } from "../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { acceptDuoLike, getCurrentDuoPartner, deleteDuoLike, getUserProfile, saveDuoSwipe } from "../profileService";
import { CURRENT_USER_ID } from "../UserConfig";

export default function RequestsScreen() {
  const [duoLikes, setDuoLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDuo, setCurrentDuo] = useState(null);
  
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

  const handleDecline = async (likeId) => {
    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this duo like? This will permanently remove it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            const success = await deleteDuoLike(likeId);
            if (success) {
              Alert.alert("Declined", "Request has been removed");
              // No need to reload - real-time listener will update automatically
            } else {
              Alert.alert("Error", "Failed to decline request");
            }
          },
        },
      ]
    );
  };

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
                <View style={styles.profileCard}>
                  <Image 
                    source={{ uri: like.user1.photos[0] }} 
                    style={styles.profileImage} 
                  />
                  <Text style={styles.profileName}>
                    {like.user1.name}, {like.user1.age}
                  </Text>
                  {fromUser1Accepted && (
                    <View style={styles.acceptedBadge}>
                      <Text style={styles.acceptedText}>✓ Accepted</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.plusSign}>+</Text>

                {/* User 2 */}
                <View style={styles.profileCard}>
                  <Image 
                    source={{ uri: like.user2.photos[0] }} 
                    style={styles.profileImage} 
                  />
                  <Text style={styles.profileName}>
                    {like.user2.name}, {like.user2.age}
                  </Text>
                  {fromUser2Accepted && (
                    <View style={styles.acceptedBadge}>
                      <Text style={styles.acceptedText}>✓ Accepted</Text>
                    </View>
                  )}
                </View>
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
                        onPress={() => handleDecline(like.id)}
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
});