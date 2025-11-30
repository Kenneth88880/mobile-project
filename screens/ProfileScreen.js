import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  Card,
  Chip,
  Avatar,
  IconButton,
  Switch,
  Portal,
  Dialog,
  Divider,
  List,
  Surface,
  useTheme,
} from "react-native-paper";
import { CURRENT_USER_ID } from "../services/UserConfig";
import {
  getUserProfile,
  saveUserProfile,
  getAverageRating,
  resetAllDuoData,
} from "../services/profileService";
import PhotoPicker from "../components/PhotoPicker";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db } from "../services/firebaseConfig";
import { formatLastActive } from "../utils/locationTracker";

const auth = getAuth();

// Pre-defined tags users can choose from
const AVAILABLE_TAGS = [
  "🎮 Gaming",
  "📚 Reading",
  "🎬 Movies",
  "🎵 Music",
  "🎨 Art",
  "📸 Photography",
  "✈️ Travel",
  "🍳 Cooking",
  "🏋️ Fitness",
  "⚽ Sports",
  "🧘 Yoga",
  "🎭 Theater",
  "🎤 Karaoke",
  "🎸 Live Music",
  "🌿 Nature",
  "🏕️ Camping",
  "🏖️ Beach",
  "⛷️ Skiing",
  "🏂 Snowboarding",
  "🚴 Cycling",
  "🏃 Running",
  "🧗 Rock Climbing",
  "🎣 Fishing",
  "🎯 Darts",
  "🎱 Pool/Billiards",
  "🎳 Bowling",
  "☕ Coffee",
  "🍷 Wine",
  "🍺 Beer",
  "🍹 Cocktails",
  "🍕 Pizza",
  "🍣 Sushi",
  "🌮 Tacos",
  "🍔 Burgers",
  "🥗 Healthy Eating",
  "🌱 Vegetarian",
  "🥑 Vegan",
  "🍰 Desserts",
  "🌃 Nightlife",
  "🏡 Homebody",
  "🎉 Party",
  "😌 Chill Vibes",
  "🌅 Early Bird",
  "🌙 Night Owl",
  "🐶 Dog Lover",
  "🐱 Cat Lover",
  "🐾 Pet Lover",
  "👨‍👩‍👧‍👦 Family Oriented",
  "🎓 Student Life",
  "💼 Career Focused",
  "🏠 Homeowner",
  "🌆 City Life",
  "🏞️ Country Life",
  "🚗 Road Trips",
  "🏊 Swimming",
  "🛹 Skateboarding",
  "🎿 Snowshoeing",
  "🏌️ Golf",
  "🧩 Puzzles",
  "🎲 Board Games",
  "🪁 Kite Flying",
  "⛵ Sailing",
  "🏄 Surfing",
  "🤿 Scuba Diving",
  "🚣 Kayaking",
  "🎪 Festivals",
  "🎢 Theme Parks",
  "🎠 Carnivals",
  "🌌 Stargazing",
  "🔭 Astronomy",
  "🌋 Hiking",
  "🗻 Mountain Climbing",
  "🏖️ Sunbathing",
  "🍹 Beach Bars",
  "🌊 Ocean Views",
];

export default function ProfileScreen({ isDarkMode, toggleTheme, isNewUser }) {
  const theme = useTheme();
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    description: "",
    photos: [],
    tags: [],
    duoPartnerId: null,
    city: "",
    latitude: null,
    longitude: null,
    showOnlineStatus: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [duoPartnerProfile, setDuoPartnerProfile] = useState(null);
  const [rating, setRating] = useState({ average: "0.0", count: 0 });
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPendingRequests, setShowPendingRequests] = useState(false);

  useEffect(() => {
    loadProfile();
    loadRating();
    loadPendingRequests();
  }, []);

  const loadRating = async () => {
    const ratingData = await getAverageRating(CURRENT_USER_ID);
    setRating(ratingData);
  };

  const loadPendingRequests = async () => {
    try {
      // ✅ React Native Firebase syntax
      const querySnapshot = await firestore()
        .collection("duoRequests")
        .where("toUserId", "==", CURRENT_USER_ID)
        .where("status", "==", "pending")
        .get();

      const requests = [];
      for (const docSnap of querySnapshot.docs) {
        const requestData = docSnap.data();
        const requesterProfile = await getUserProfile(requestData.fromUserId);
        if (requesterProfile) {
          requests.push({
            id: docSnap.id,
            ...requestData,
            requesterProfile: {
              ...requesterProfile,
              tags: Array.isArray(requesterProfile.tags)
                ? requesterProfile.tags
                : [],
            },
          });
        }
      }

      setPendingRequests(requests);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
  };

  const loadDuo = async () => {
    try {
      // ✅ React Native Firebase syntax
      const querySnapshot = await firestore()
        .collection("duos")
        .where("users", "array-contains", CURRENT_USER_ID)
        .get();

      if (!querySnapshot.empty) {
        const duoDoc = querySnapshot.docs[0];
        const duoData = duoDoc.data();
        const partnerId = duoData.users.find((id) => id !== CURRENT_USER_ID);

        if (partnerId) {
          const partnerProfile = await getUserProfile(partnerId);
          if (partnerProfile) {
            const cleanedPartnerProfile = {
              ...partnerProfile,
              tags: Array.isArray(partnerProfile.tags)
                ? partnerProfile.tags
                : [],
            };
            setDuoPartnerProfile(cleanedPartnerProfile);
            setProfile((prev) => ({ ...prev, duoPartnerId: partnerId }));
            return partnerId;
          }
        }
      } else {
        setDuoPartnerProfile(null);
      }
      return null;
    } catch (error) {
      console.error("Error loading duo:", error);
      return null;
    }
  };

  const loadProfile = async () => {
    try {
      let userProfile = await getUserProfile(CURRENT_USER_ID);

      // ✨ NEW: Auto-create empty profile for new users!
      if (!userProfile) {
        console.log("No profile found - creating empty profile for new user");
        
        const emptyProfile = {
          name: "",
          age: "",
          description: "",
          photos: [],
          tags: [],
          city: "",
          latitude: null,
          longitude: null,
          showOnlineStatus: true,
        };
        
        // Save to Firestore
        await saveUserProfile(CURRENT_USER_ID, emptyProfile);
        
        // Set in state
        setProfile(emptyProfile);
        
        // Auto-switch to edit mode so user can fill it in
        setIsEditing(true);
        return;
      }

      // Profile exists - load it normally
      const cleanedProfile = {
        name: userProfile.name || "",
        age: userProfile.age || "",
        description: userProfile.description || "",
        photos: Array.isArray(userProfile.photos) ? userProfile.photos : [],
        tags: Array.isArray(userProfile.tags) ? userProfile.tags : [],
        duoPartnerId: null,
        city: userProfile.city || "",
        latitude: userProfile.latitude || null,
        longitude: userProfile.longitude || null,
        showOnlineStatus: userProfile.showOnlineStatus !== false,
      };

      setProfile(cleanedProfile);
      await loadDuo();
    } catch (error) {
      console.error("Error loading profile:", error);
      
      // Even if error, provide empty profile so app doesn't crash
      setProfile({
        name: "",
        age: "",
        description: "",
        photos: [],
        tags: [],
        duoPartnerId: null,
        city: "",
        latitude: null,
        longitude: null,
        showOnlineStatus: true,
      });
      
      // Auto-switch to edit mode
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (!profile.age.trim() || isNaN(profile.age)) {
      Alert.alert("Error", "Please enter a valid age");
      return;
    }

    const success = await saveUserProfile(CURRENT_USER_ID, profile);
    if (success) {
      Alert.alert("Success", "Profile saved!");
      setIsEditing(false);
      loadProfile();
    } else {
      Alert.alert("Error", "Failed to save profile");
    }
  };

  const handlePhotosChange = (newPhotos) => {
    setProfile({ ...profile, photos: newPhotos });
  };

  const searchUsers = useCallback(async (searchText) => {
    if (!searchText || !searchText.trim() || searchText.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    try {
      // ✅ React Native Firebase syntax
      const querySnapshot = await firestore()
        .collection("profiles")
        .get();

      const searchLower = searchText.trim().toLowerCase();
      const results = [];

      querySnapshot.forEach((docSnap) => {
        try {
          const userData = docSnap.data();

          if (docSnap.id !== CURRENT_USER_ID && userData && userData.name) {
            const nameLower = userData.name.toLowerCase();

            if (nameLower.includes(searchLower)) {
              results.push({
                id: docSnap.id,
                name: userData.name || "Unknown",
                age: userData.age || "?",
                description: userData.description || "",
                photos: Array.isArray(userData.photos) ? userData.photos : [],
                tags: Array.isArray(userData.tags) ? userData.tags : [],
              });
            }
          }
        } catch (itemError) {
          console.error("Error processing user:", docSnap.id, itemError);
        }
      });

      const sortedResults = results.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const limitedResults = sortedResults.slice(0, 50);

      setSearchResults(limitedResults);
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Search Error", "Failed to search users. Please try again.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    (text) => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      if (!text || !text.trim() || text.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      const timeout = setTimeout(() => {
        searchUsers(text);
      }, 500);

      setSearchTimeout(timeout);
    },
    [searchTimeout, searchUsers]
  );

  const handleSendDuoRequest = async (partner) => {
    Alert.alert(
      "Send Duo Request",
      `Send a duo partner request to ${partner.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          onPress: async () => {
            try {
              // ✅ React Native Firebase syntax - check existing
              const existingSnapshot = await firestore()
                .collection("duoRequests")
                .where("fromUserId", "==", CURRENT_USER_ID)
                .where("toUserId", "==", partner.id)
                .get();

              if (!existingSnapshot.empty) {
                Alert.alert(
                  "Request Already Sent",
                  "You already sent a request to this user."
                );
                return;
              }

              // ✅ React Native Firebase syntax - add document
              await firestore()
                .collection("duoRequests")
                .add({
                  fromUserId: CURRENT_USER_ID,
                  toUserId: partner.id,
                  status: "pending",
                  createdAt: firestore.FieldValue.serverTimestamp(),
                });

              setShowPartnerSearch(false);
              setSearchQuery("");
              setSearchResults([]);

              Alert.alert(
                "Request Sent!",
                `Your duo request has been sent to ${partner.name}.`
              );
            } catch (error) {
              console.error("Error sending duo request:", error);
              Alert.alert("Error", "Failed to send duo request");
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = async (request) => {
    Alert.alert(
      "Accept Duo Request",
      `Accept ${request.requesterProfile.name} as your duo partner?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              // ✅ React Native Firebase syntax - update document
              await firestore()
                .collection("duoRequests")
                .doc(request.id)
                .update({
                  status: "accepted",
                  acceptedAt: firestore.FieldValue.serverTimestamp(),
                });

              // Check if duo already exists
              const existingDuoSnapshot = await firestore()
                .collection("duos")
                .where("users", "array-contains", CURRENT_USER_ID)
                .get();

              if (!existingDuoSnapshot.empty) {
                // Update existing duo
                const duoDoc = existingDuoSnapshot.docs[0];
                await firestore()
                  .collection("duos")
                  .doc(duoDoc.id)
                  .update({
                    users: [CURRENT_USER_ID, request.fromUserId],
                  });
              } else {
                // Create new duo
                await firestore()
                  .collection("duos")
                  .add({
                    users: [CURRENT_USER_ID, request.fromUserId],
                    createdAt: firestore.FieldValue.serverTimestamp(),
                  });
              }

              await loadProfile();
              await loadPendingRequests();
              setShowPendingRequests(false);

              Alert.alert(
                "Success!",
                `${request.requesterProfile.name} is now your duo partner!`
              );
            } catch (error) {
              console.error("Error accepting request:", error);
              Alert.alert("Error", "Failed to accept request");
            }
          },
        },
      ]
    );
  };

  const handleDeclineRequest = async (request) => {
    Alert.alert(
      "Decline Request",
      `Decline duo request from ${request.requesterProfile.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              // ✅ React Native Firebase syntax - delete document
              await firestore()
                .collection("duoRequests")
                .doc(request.id)
                .delete();
                
              await loadPendingRequests();
              Alert.alert(
                "Request Declined",
                "The duo request has been declined."
              );
            } catch (error) {
              console.error("Error declining request:", error);
              Alert.alert("Error", "Failed to decline request");
            }
          },
        },
      ]
    );
  };

  const handleRemovePartner = () => {
    Alert.alert(
      "Remove Duo Partner",
      "Are you sure you want to remove your duo partner?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // ✅ React Native Firebase syntax
              const querySnapshot = await firestore()
                .collection("duos")
                .where("users", "array-contains", CURRENT_USER_ID)
                .get();

              if (!querySnapshot.empty) {
                const duoDoc = querySnapshot.docs[0];
                await firestore()
                  .collection("duos")
                  .doc(duoDoc.id)
                  .delete();
              }

              setProfile({ ...profile, duoPartnerId: null });
              setDuoPartnerProfile(null);

              Alert.alert("Success", "Duo partner removed");
            } catch (error) {
              console.error("Error removing duo partner:", error);
              Alert.alert("Error", "Failed to remove duo partner");
            }
          },
        },
      ]
    );
  };

  const toggleTag = (tag) => {
    const currentTags = Array.isArray(profile.tags) ? profile.tags : [];

    if (currentTags.includes(tag)) {
      setProfile({
        ...profile,
        tags: currentTags.filter((t) => t !== tag),
      });
    } else {
      if (currentTags.length >= 5) {
        Alert.alert("Limit Reached", "You can only select up to 5 tags");
        return;
      }
      setProfile({
        ...profile,
        tags: [...currentTags, tag],
      });
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Text key={i} style={styles.star}>
            ★
          </Text>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Text key={i} style={styles.star}>
            ⯨
          </Text>
        );
      } else {
        stars.push(
          <Text key={i} style={styles.starEmpty}>
            ☆
          </Text>
        );
      }
    }

    return stars;
  };

  const handleResetDuoData = async () => {
    Alert.alert(
      "Reset All Duo Data?",
      "This will delete all duo-related data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await resetAllDuoData();
              if (result.success) {
                Alert.alert(
                  "Reset Complete!",
                  "All duo data has been deleted."
                );
              } else {
                Alert.alert("Error", "Failed to reset data.");
              }
            } catch (error) {
              console.error("Error resetting duo data:", error);
              Alert.alert("Error", "An error occurred.");
            }
          },
        },
          ]);
        };
      
        const handleSignOut = () => {
          signOut(auth).catch((error) => {
            console.error("Sign out error", error);
            Alert.alert("Error", "Failed to sign out.");
          });
        };
      
        const handleReportBug = () => {
          Alert.alert("Report a Bug", "Bug reporting feature coming soon!", [
            { text: "OK" },
          ]);
        };

  // Settings Modal
  const SettingsDialog = () => (
    <Portal>
      <Dialog visible={showSettings} onDismiss={() => setShowSettings(false)}>
        <Dialog.Title>Settings</Dialog.Title>
        <Dialog.Content>
          <List.Item
            title="Dark Mode"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                color={theme.colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Report a Bug"
            left={(props) => <List.Icon {...props} icon="bug" />}
            onPress={handleReportBug}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowSettings(false)}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  // Tag Picker Modal
  const TagPickerModal = useMemo(() => {
    const selectedTags = Array.isArray(profile.tags) ? profile.tags : [];

    return (
      <Modal visible={showTagPicker} animationType="slide" transparent={false}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text
              variant="headlineMedium"
              style={{ color: theme.colors.onPrimary }}
            >
              Choose Your Tags
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onPrimary, opacity: 0.9 }}
            >
              Select up to 5 tags ({selectedTags.length}/5)
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.tagsGrid}>
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    selected={isSelected}
                    onPress={() => toggleTag(tag)}
                    style={styles.tagChip}
                    mode={isSelected ? "flat" : "outlined"}
                  >
                    {tag}
                  </Chip>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="contained"
              onPress={() => setShowTagPicker(false)}
              style={styles.fullWidthButton}
            >
              Done
            </Button>
          </View>
        </View>
      </Modal>
    );
  }, [showTagPicker, profile.tags, theme]);

  // Partner Search Modal
  const PartnerSearchModal = () => (
    <Modal
      visible={showPartnerSearch}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        setShowPartnerSearch(false);
        setSearchQuery("");
        setSearchResults([]);
      }}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View
          style={[
            styles.modalHeader,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            variant="headlineMedium"
            style={{ color: theme.colors.onPrimary }}
          >
            Find Duo Partner
          </Text>
        </View>

        <View style={styles.modalContent}>
          <TextInput
            label="Search by name"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              debouncedSearch(text);
            }}
            mode="outlined"
            style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
            right={
              searchQuery ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                />
              ) : null
            }
          />

          {searching && <ActivityIndicator style={{ marginTop: 20 }} />}

          {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">No users found</Text>
            </View>
          )}

          {!searching && searchQuery.length < 2 && (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">
                Type at least 2 characters to search
              </Text>
            </View>
          )}

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.searchResultCard}>
                <Card.Content>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {item.photos && item.photos.length > 0 ? (
                      <Avatar.Image size={50} source={{ uri: item.photos[0] }} />
                    ) : (
                      <Avatar.Icon size={50} icon="account" />
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="titleMedium">
                        {item.name}, {item.age}
                      </Text>
                      {item.description && (
                        <Text
                          variant="bodySmall"
                          numberOfLines={1}
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <Button
                      mode="contained"
                      onPress={() => handleSendDuoRequest(item)}
                      compact
                    >
                      Request
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}
          />
        </View>

        <View style={styles.modalFooter}>
          <Button
            mode="outlined"
            onPress={() => {
              setShowPartnerSearch(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            style={styles.fullWidthButton}
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  // Pending Requests Modal
  const PendingRequestsModal = () => (
    <Modal
      visible={showPendingRequests}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowPendingRequests(false)}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View
          style={[
            styles.modalHeader,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            variant="headlineMedium"
            style={{ color: theme.colors.onPrimary }}
          >
            Duo Requests
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onPrimary, opacity: 0.9 }}
          >
            {pendingRequests.length} pending request
            {pendingRequests.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <ScrollView style={styles.modalContent}>
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">No pending requests</Text>
            </View>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} style={styles.requestCard}>
                <Card.Content>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {request.requesterProfile.photos &&
                    request.requesterProfile.photos.length > 0 ? (
                      <Avatar.Image
                        size={60}
                        source={{ uri: request.requesterProfile.photos[0] }}
                      />
                    ) : (
                      <Avatar.Icon size={60} icon="account" />
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="titleMedium">
                        {request.requesterProfile.name},{" "}
                        {request.requesterProfile.age}
                      </Text>
                      {request.requesterProfile.description && (
                        <Text
                          variant="bodySmall"
                          numberOfLines={2}
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {request.requesterProfile.description}
                        </Text>
                      )}
                      {request.requesterProfile.tags &&
                        request.requesterProfile.tags.length > 0 && (
                          <View style={styles.tagsDisplay}>
                            {request.requesterProfile.tags
                              .slice(0, 3)
                              .map((tag, index) => (
                                <Chip key={index} compact style={{ marginRight: 4 }}>
                                  {tag}
                                </Chip>
                              ))}
                          </View>
                        )}
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 12,
                      gap: 8,
                    }}
                  >
                    <Button
                      mode="outlined"
                      onPress={() => handleDeclineRequest(request)}
                    >
                      Decline
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => handleAcceptRequest(request)}
                    >
                      Accept
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            mode="outlined"
            onPress={() => setShowPendingRequests(false)}
            style={styles.fullWidthButton}
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );

  if (!isEditing) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="headlineLarge">Your Profile</Text>
          <View style={styles.headerButtons}>
            <IconButton
              icon="cog"
              size={24}
              onPress={() => setShowSettings(true)}
            />
            <Button mode="contained" onPress={() => setIsEditing(true)}>
              Edit
            </Button>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {profile.photos && profile.photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {profile.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.photo}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noPhotos}>
                <Avatar.Icon size={80} icon="camera" />
                <Text variant="bodyLarge" style={styles.noPhotosText}>
                  No photos added
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium">
              {profile.name || "No name"}, {profile.age || "?"}
            </Text>

            {/* Rating Display */}
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(parseFloat(rating.average))}
              </View>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {rating.count > 0
                  ? `${rating.average} (${rating.count} rating${
                      rating.count !== 1 ? "s" : ""
                    })`
                  : "No ratings yet"}
              </Text>
            </View>

            {/* Location */}
            {profile.city && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                  <IconButton icon="map-marker" size={20} style={{ margin: 0, padding: 0 }} />
                  <Text variant="bodyLarge">{profile.city}</Text>
                </View>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Updates automatically while using the app
                </Text>
              </>
            )}

            {/* Privacy Toggle */}
            <Divider style={styles.divider} />
            <List.Item
              title="Show Online Status"
              description={
                profile.showOnlineStatus
                  ? "Others can see when you're active"
                  : "Activity status hidden from others"
              }
              left={(props) => <List.Icon {...props} icon="lock" />}
              right={() => (
                <Switch
                  value={profile.showOnlineStatus}
                  onValueChange={async (newValue) => {
                    setProfile({ ...profile, showOnlineStatus: newValue });
                    await saveUserProfile(CURRENT_USER_ID, {
                      ...profile,
                      showOnlineStatus: newValue,
                    });
                    Alert.alert(
                      "Privacy Updated",
                      newValue
                        ? "Others can now see when you're online"
                        : "Your online status is now hidden"
                    );
                  }}
                  color={theme.colors.primary}
                />
              )}
            />

            <Text variant="bodyLarge" style={styles.description}>
              {profile.description || "No description"}
            </Text>

            {Array.isArray(profile.tags) && profile.tags.length > 0 && (
              <>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Interests:
                </Text>
                <View style={styles.tagsDisplay}>
                  {profile.tags.map((tag, index) => (
                    <Chip key={index} style={styles.tagDisplay}>
                      {tag}
                    </Chip>
                  ))}
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Duo Partner Section */}
        <Card style={styles.card}>
          <Card.Title
            title="Your Duo Partner"
            left={(props) => <IconButton icon="account-multiple" {...props} />}
            right={(props) =>
              pendingRequests.length > 0 ? (
                <IconButton
                  {...props}
                  icon="bell"
                  onPress={() => setShowPendingRequests(true)}
                />
              ) : null
            }
          />
          <Card.Content>
            {duoPartnerProfile ? (
              <>
                {duoPartnerProfile.photos &&
                  duoPartnerProfile.photos.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {duoPartnerProfile.photos.map((photo, index) => (
                        <Image
                          key={index}
                          source={{ uri: photo }}
                          style={styles.photo}
                        />
                      ))}
                    </ScrollView>
                  )}
                <Text variant="headlineSmall">
                  {duoPartnerProfile.name}, {duoPartnerProfile.age}
                </Text>
                {duoPartnerProfile.showOnlineStatus !== false &&
                  duoPartnerProfile.lastActive && (
                    <Text variant="bodyMedium">
                      {formatLastActive(
                        duoPartnerProfile.lastActive,
                        duoPartnerProfile.isOnline
                      )}
                    </Text>
                  )}
                <Text variant="bodyLarge">{duoPartnerProfile.description}</Text>
                {duoPartnerProfile.tags &&
                  duoPartnerProfile.tags.length > 0 && (
                    <View style={styles.tagsDisplay}>
                      {duoPartnerProfile.tags.map((tag, index) => (
                        <Chip key={index} style={styles.tagDisplay}>
                          {tag}
                        </Chip>
                      ))}
                    </View>
                  )}
                <Button
                  mode="outlined"
                  icon="account-remove"
                  onPress={handleRemovePartner}
                  style={{ marginTop: 12 }}
                  buttonColor={theme.colors.errorContainer}
                >
                  Remove Partner
                </Button>
              </>
            ) : (
              <>
                <Text variant="bodyLarge">
                  No duo partner yet. Find someone to team up with!
                </Text>
                <Button
                  mode="contained"
                  icon="account-search"
                  onPress={() => setShowPartnerSearch(true)}
                  style={{ marginTop: 12 }}
                >
                  Find Duo Partner
                </Button>
                {pendingRequests.length > 0 && (
                  <Button
                    mode="outlined"
                    icon="bell"
                    onPress={() => setShowPendingRequests(true)}
                    style={{ marginTop: 8 }}
                  >
                    View {pendingRequests.length} Pending Request
                    {pendingRequests.length !== 1 ? "s" : ""}
                  </Button>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Reset Button */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              icon="refresh"
              buttonColor={theme.colors.error}
              onPress={handleResetDuoData}
              style={styles.fullWidthButton}
            >
              Reset All Duo Data
            </Button>
            <Text
              variant="bodySmall"
              style={{ textAlign: "center", marginTop: 8 }}
            >
              Deletes all likes and swipes so profiles reappear
            </Text>
            <Button
              mode="outlined"
              icon="logout"
              onPress={handleSignOut}
              style={[styles.fullWidthButton, { marginTop: 16 }]}
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>

        <SettingsDialog />
        {TagPickerModal}
        <PartnerSearchModal />
        <PendingRequestsModal />
      </ScrollView>
    );
  }

  // Edit Mode
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
      <View style={styles.header}>
        <Text variant="headlineLarge">Edit Profile</Text>
        <View style={styles.headerButtons}>
          <Button
            mode="outlined"
            onPress={() => {
              loadProfile();
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={{ marginLeft: 8 }}
          >
            Save
          </Button>
        </View>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Photos" />
        <Card.Content>
          <PhotoPicker
            photos={profile.photos || []}
            onPhotosChange={handlePhotosChange}
            maxPhotos={6}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Name"
            value={profile.name}
            onChangeText={(text) => setProfile({ ...profile, name: text })}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Age"
            value={profile.age}
            onChangeText={(text) => setProfile({ ...profile, age: text })}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="About Me"
            value={profile.description}
            onChangeText={(text) =>
              setProfile({ ...profile, description: text })
            }
            multiline
            numberOfLines={4}
            mode="outlined"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title
          title={`Tags (${
            Array.isArray(profile.tags) ? profile.tags.length : 0
          }/5)`}
          right={(props) => (
            <IconButton
              {...props}
              icon="pencil"
              onPress={() => setShowTagPicker(true)}
            />
          )}
        />
        <Card.Content>
          {Array.isArray(profile.tags) && profile.tags.length > 0 ? (
            <View style={styles.tagsDisplay}>
              {profile.tags.map((tag, index) => (
                <Chip
                  key={index}
                  onClose={() => toggleTag(tag)}
                  style={styles.tagDisplay}
                >
                  {tag}
                </Chip>
              ))}
            </View>
          ) : (
            <Text>No tags selected. Tap the pencil to add tags.</Text>
          )}
        </Card.Content>
      </Card>

      {/* Duo Partner Section in Edit Mode */}
      <Card style={styles.card}>
        <Card.Title
          title="Your Duo Partner"
          left={(props) => <IconButton icon="account-multiple" {...props} />}
        />
        <Card.Content>
          {duoPartnerProfile ? (
            <>
              <Text variant="bodyLarge">
                Current partner: {duoPartnerProfile.name}
              </Text>
              <Button
                mode="outlined"
                icon="account-remove"
                onPress={handleRemovePartner}
                style={{ marginTop: 12 }}
                buttonColor={theme.colors.errorContainer}
              >
                Remove Partner
              </Button>
            </>
          ) : (
            <>
              <Text variant="bodyLarge">
                No duo partner yet. Find someone to team up with!
              </Text>
              <Button
                mode="contained"
                icon="account-search"
                onPress={() => setShowPartnerSearch(true)}
                style={{ marginTop: 12 }}
              >
                Find Duo Partner
              </Button>
              {pendingRequests.length > 0 && (
                <Button
                  mode="outlined"
                  icon="bell"
                  onPress={() => setShowPendingRequests(true)}
                  style={{ marginTop: 8 }}
                >
                  View {pendingRequests.length} Pending Request
                  {pendingRequests.length !== 1 ? "s" : ""}
                </Button>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      <SettingsDialog />
      {TagPickerModal}
      <PartnerSearchModal />
      <PendingRequestsModal />
    </ScrollView>

    {/* Fixed Bottom Buttons - Always Visible */}
    <Surface style={styles.bottomButtons} elevation={4}>
      <Button
        mode="outlined"
        onPress={() => {
          loadProfile();
          setIsEditing(false);
        }}
        style={styles.bottomButton}
      >
        Cancel
      </Button>
      <Button
        mode="contained"
        onPress={handleSave}
        style={styles.bottomButton}
      >
        Save
      </Button>
    </Surface>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    margin: 8,
  },
  photo: {
    width: 120,
    height: 160,
    borderRadius: 10,
    marginRight: 10,
  },
  noPhotos: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  noPhotosText: {
    marginTop: 8,
  },
  ratingContainer: {
    marginVertical: 12,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 4,
  },
  star: {
    fontSize: 20,
    color: "#FFD700",
  },
  starEmpty: {
    fontSize: 20,
    color: "#ddd",
  },
  divider: {
    marginVertical: 12,
  },
  description: {
    marginTop: 12,
    lineHeight: 24,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  tagsDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  tagDisplay: {
    marginRight: 4,
    marginBottom: 4,
  },
  fullWidthButton: {
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 20,
    paddingTop: 60,
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  modalFooter: {
    padding: 20,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  searchInput: {
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultCard: {
    marginBottom: 8,
  },
  requestCard: {
    marginBottom: 12,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bottomButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});