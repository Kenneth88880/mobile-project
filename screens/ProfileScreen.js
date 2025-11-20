import React, { useContext, useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from "react-native";
import { UserContext } from "../context/UserContext";
import PhotoPicker from "../components/PhotoPicker";
import ProfileInfo from "../components/ProfileInfo";
import DatingCard from "../components/DatingCard";
import { 
  saveUserProfile, 
  getUserProfile, 
  getAverageRating,
  sendDuoRequest,
  getIncomingDuoRequests,
  getOutgoingDuoRequests,
  acceptDuoRequest,
  declineDuoRequest,
  cancelDuoRequest,
  getCurrentDuoPartner,
  leaveDuo,
  searchUserById,
  deleteAllDuoLikes
} from "../services/profileService.js";
import { CURRENT_USER_ID } from "../services/UserConfig";

export default function ProfileScreen() {
  const { userData, setUserData } = useContext(UserContext);
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duoRequests, setDuoRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [currentDuo, setCurrentDuo] = useState(null);
  const [searchUserId, setSearchUserId] = useState("");
  
  const currentUserId = CURRENT_USER_ID;

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Load user profile
      const profile = await getUserProfile(currentUserId);
      if (profile) {
        setUserData({
          name: profile.name || "",
          age: profile.age || "",
          description: profile.description || "",
          tags: profile.tags || "",
          photos: profile.photos || [],
        });
      }

      // Load rating
      const userRating = await getAverageRating(currentUserId);
      setRating(userRating);

      // Load duo partner
      const duo = await getCurrentDuoPartner(currentUserId);
      setCurrentDuo(duo);

      // Load duo requests
      const incoming = await getIncomingDuoRequests(currentUserId);
      setDuoRequests(incoming);

      const outgoing = await getOutgoingDuoRequests(currentUserId);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userData.name || !userData.age) {
      Alert.alert("Error", "Please fill in at least your name and age");
      return;
    }

    setSaving(true);
    const success = await saveUserProfile(currentUserId, userData);
    setSaving(false);

    if (success) {
      Alert.alert("Success", "Profile saved successfully!");
    } else {
      Alert.alert("Error", "Failed to save profile");
    }
  };

  const handleSendDuoRequest = async () => {
    if (!searchUserId.trim()) {
      Alert.alert("Error", "Please enter a user ID");
      return;
    }

    const user = await searchUserById(searchUserId.trim());
    if (!user) {
      Alert.alert("Not Found", `User ${searchUserId} not found`);
      return;
    }

    Alert.alert(
      "Send Duo Request",
      `Send duo request to ${user.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            const result = await sendDuoRequest(currentUserId, searchUserId.trim());
            if (result.success) {
              Alert.alert("Success", result.message);
              loadProfileData();
              setSearchUserId("");
            } else {
              Alert.alert("Error", result.message);
            }
          },
        },
      ]
    );
  };

  const handleAcceptDuoRequest = async (requestId, fromUserId) => {
    const success = await acceptDuoRequest(requestId, fromUserId, currentUserId);
    if (success) {
      Alert.alert("Success", "Duo request accepted! You're now partners!");
      loadProfileData();
    } else {
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleDeclineDuoRequest = async (requestId) => {
    const success = await declineDuoRequest(requestId);
    if (success) {
      Alert.alert("Declined", "Duo request declined");
      loadProfileData();
    } else {
      Alert.alert("Error", "Failed to decline request");
    }
  };

  const handleCancelDuoRequest = async (requestId) => {
    const success = await cancelDuoRequest(requestId);
    if (success) {
      Alert.alert("Cancelled", "Duo request cancelled");
      loadProfileData();
    } else {
      Alert.alert("Error", "Failed to cancel request");
    }
  };

  const handleLeaveDuo = async () => {
    if (!currentDuo) return;

    Alert.alert(
      "Leave Duo",
      `Are you sure you want to leave your duo with ${currentDuo.partnerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            const success = await leaveDuo(currentDuo.duoId);
            if (success) {
              Alert.alert("Success", "You've left the duo");
              loadProfileData();
            } else {
              Alert.alert("Error", "Failed to leave duo");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👤 My Profile</Text>
      <Text style={styles.userId}>User ID: {currentUserId}</Text>

      {/* Current Duo Partner */}
      {currentDuo ? (
        <View style={styles.duoCard}>
          <Text style={styles.duoTitle}>👯 Your Duo Partner</Text>
          <Text style={styles.duoPartnerName}>{currentDuo.partnerName}</Text>
          <TouchableOpacity style={styles.leaveDuoButton} onPress={handleLeaveDuo}>
            <Text style={styles.leaveDuoText}>Leave Duo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noDuoCard}>
          <Text style={styles.noDuoText}>You don't have a duo partner yet</Text>
          <Text style={styles.noDuoSubtext}>Accept a request below or search for someone!</Text>
        </View>
      )}

      {/* Profile Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Preview</Text>
        <DatingCard user={userData} />
      </View>

      {/* Rating */}
      <View style={styles.ratingCard}>
        <Text style={styles.ratingText}>
          ⭐ Rating: {rating.average} ({rating.count} reviews)
        </Text>
      </View>

      {/* Edit Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Edit Profile</Text>
        <ProfileInfo />
        <PhotoPicker />
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "💾 Save Profile"}
          </Text>
        </TouchableOpacity>
        
        {/* Reset Button */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={async () => {
            Alert.alert(
              "Reset Duo Likes",
              "This will delete all duo likes/requests. You'll be able to see and match with duos again. Are you sure?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  style: "destructive",
                  onPress: async () => {
                    const result = await deleteAllDuoLikes();
                    if (result.success) {
                      Alert.alert("✅ Reset Complete!", `Deleted ${result.count} duo likes`);
                    } else {
                      Alert.alert("Error", "Failed to reset likes");
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.resetButtonText}>🔄 Reset Duo Likes (Testing)</Text>
        </TouchableOpacity>
      </View>

      {/* Duo Requests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Find Duo Partner</Text>
        
        {/* Search for user */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>Search by User ID:</Text>
          <View style={styles.searchRow}>
            <Text 
              style={styles.searchInput}
              onPress={() => {
                Alert.prompt(
                  "Search User",
                  "Enter user ID:",
                  (text) => setSearchUserId(text),
                  "plain-text",
                  searchUserId
                );
              }}
            >
              {searchUserId || "Tap to enter user ID..."}
            </Text>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleSendDuoRequest}
            >
              <Text style={styles.searchButtonText}>Send Request</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Incoming Duo Requests */}
        {duoRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsTitle}>Incoming Duo Requests:</Text>
            {duoRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <Text style={styles.requestName}>{request.senderName}</Text>
                <View style={styles.requestButtons}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptDuoRequest(request.id, request.fromUser)}
                  >
                    <Text style={styles.buttonText}>✓ Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDeclineDuoRequest(request.id)}
                  >
                    <Text style={styles.buttonText}>✗ Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Outgoing Duo Requests */}
        {outgoingRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsTitle}>Sent Duo Requests:</Text>
            {outgoingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <Text style={styles.requestName}>{request.recipientName}</Text>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelDuoRequest(request.id)}
                >
                  <Text style={styles.buttonText}>Cancel Request</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#333",
  },
  userId: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 10,
  },
  duoCard: {
    backgroundColor: "#E8F5E9",
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  duoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2E7D32",
  },
  duoPartnerName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1B5E20",
  },
  leaveDuoButton: {
    backgroundColor: "#F44336",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  leaveDuoText: {
    color: "white",
    fontWeight: "bold",
  },
  noDuoCard: {
    backgroundColor: "#FFF3E0",
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  noDuoText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#E65100",
  },
  noDuoSubtext: {
    fontSize: 14,
    color: "#F57C00",
    textAlign: "center",
  },
  ratingCard: {
    backgroundColor: "white",
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  ratingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  resetButton: {
    backgroundColor: "#FF6B6B",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  resetButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f9f9f9",
    marginRight: 10,
    color: "#333",
  },
  searchButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  searchButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  requestsSection: {
    marginTop: 15,
  },
  requestsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  requestCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  requestButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginRight: 5,
    alignItems: "center",
  },
  declineButton: {
    backgroundColor: "#F44336",
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FF9800",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});