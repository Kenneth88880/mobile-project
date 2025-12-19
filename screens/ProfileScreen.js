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
  SafeAreaView, // ← ADD THIS
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
} from "../services/profileService";
import PhotoPicker from "../components/PhotoPicker";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { formatLastActive } from "../utils/locationTracker";

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

  const [showSettings, setShowSettings] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [viewingPartnerProfile, setViewingPartnerProfile] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const toggleTag = (tag) => {
    const currentTags = Array.isArray(profile.tags) ? profile.tags : [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : currentTags.length < 5
      ? [...currentTags, tag]
      : currentTags;
    setProfile({ ...profile, tags: newTags });
  };

  const handleSearchPartner = async (searchText) => {
    // Prevent search if already searching
    if (searching) {
      return;
    }

    if (!searchText.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    try {
      // Search by User ID in 'profiles' collection
      const userDoc = await firestore()
        .collection("profiles")
        .doc(searchText.trim())
        .get();

      if (userDoc.exists && userDoc.id !== CURRENT_USER_ID) {
        const userData = userDoc.data();
        setSearchResults([
          {
            id: userDoc.id,
            ...userData,
            tags: Array.isArray(userData.tags) ? userData.tags : [],
          },
        ]);
      } else {
        // Just clear results - don't show any error
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendPartnerRequest = async (targetUserId) => {
    try {
      const existingRequests = await firestore()
        .collection("duoRequests")
        .where("fromUserId", "==", CURRENT_USER_ID)
        .where("toUserId", "==", targetUserId)
        .where("status", "==", "pending")
        .get();

      if (!existingRequests.empty) {
        Alert.alert("Info", "You've already sent a request to this user!");
        return;
      }

      await firestore().collection("duoRequests").add({
        fromUserId: CURRENT_USER_ID,
        toUserId: targetUserId,
        status: "pending",
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert("Success", "Partner request sent!");
      setShowPartnerSearch(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error sending partner request:", error);
      Alert.alert("Error", "Failed to send partner request");
    }
  };

  const handleAcceptRequest = async (requestId, fromUserId) => {
    try {
      const existingDuos = await firestore()
        .collection("duos")
        .where("users", "array-contains", CURRENT_USER_ID)
        .get();

      if (!existingDuos.empty) {
        Alert.alert("Error", "You're already in a duo!");
        return;
      }

      await firestore()
        .collection("duos")
        .add({
          users: [CURRENT_USER_ID, fromUserId],
          status: "active",
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      await firestore()
        .collection("duoRequests")
        .doc(requestId)
        .update({ status: "accepted" });

      Alert.alert("Success", "You're now duo partners!");
      loadPendingRequests();
      loadProfile();
      setShowPendingRequests(false);
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await firestore().collection("duoRequests").doc(requestId).delete();

      Alert.alert("Success", "Request declined");
      loadPendingRequests();
    } catch (error) {
      console.error("Error declining request:", error);
      Alert.alert("Error", "Failed to decline request");
    }
  };

  const handleRemovePartner = async () => {
    Alert.alert(
      "Remove Partner",
      "Are you sure you want to remove your duo partner?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const querySnapshot = await firestore()
                .collection("duos")
                .where("users", "array-contains", CURRENT_USER_ID)
                .get();

              if (!querySnapshot.empty) {
                const duoDoc = querySnapshot.docs[0];
                await firestore().collection("duos").doc(duoDoc.id).delete();
                Alert.alert("Success", "Partner removed");
                setDuoPartnerProfile(null);
                setProfile({ ...profile, duoPartnerId: null });
              }
            } catch (error) {
              console.error("Error removing partner:", error);
              Alert.alert("Error", "Failed to remove partner");
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(parseFloat(rating));
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Text key={i} style={i < fullStars ? styles.star : styles.starEmpty}>
          ★
        </Text>
      );
    }
    return stars;
  };

  const SettingsDialog = () => {
    return (
      <Portal>
        <Dialog visible={showSettings} onDismiss={() => setShowSettings(false)}>
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Dark Mode"
              right={() => (
                <Switch value={isDarkMode} onValueChange={toggleTheme} />
              )}
            />
            <Divider style={{ marginVertical: 8 }} />
            <List.Item
              title="Show Online Status"
              description="Others can see when you're active"
              right={() => (
                <Switch
                  value={profile.showOnlineStatus}
                  onValueChange={async (value) => {
                    const newProfile = {
                      ...profile,
                      showOnlineStatus: value,
                    };
                    setProfile(newProfile);
                    await saveUserProfile(CURRENT_USER_ID, newProfile);
                  }}
                />
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSettings(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const TagPickerModal = () => {
    return (
      <Portal>
        <Modal
          visible={showTagPicker}
          onDismiss={() => setShowTagPicker(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text variant="headlineMedium">
              Select Tags (
              {Array.isArray(profile.tags) ? profile.tags.length : 0}/5)
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 8 }}>
              Choose up to 5 interests
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.tagsGrid}>
              {AVAILABLE_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  selected={
                    Array.isArray(profile.tags) && profile.tags.includes(tag)
                  }
                  onPress={() => toggleTag(tag)}
                  style={styles.tagChip}
                  disabled={
                    !Array.isArray(profile.tags)
                      ? false
                      : profile.tags.length >= 5 && !profile.tags.includes(tag)
                  }
                >
                  {tag}
                </Chip>
              ))}
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
        </Modal>
      </Portal>
    );
  };

  const PartnerSearchModal = () => {
    // Local state inside modal - won't be affected by parent re-renders
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [localSearchResults, setLocalSearchResults] = useState([]);
    const [localSearching, setLocalSearching] = useState(false);

    // Reset local state when modal closes
    useEffect(() => {
      if (!showPartnerSearch) {
        setLocalSearchQuery("");
        setLocalSearchResults([]);
        setLocalSearching(false);
      }
    }, [showPartnerSearch]);

    const handleLocalSearch = async (searchText) => {
      if (localSearching) return;
      if (!searchText.trim()) {
        setLocalSearchResults([]);
        setLocalSearching(false);
        return;
      }

      setLocalSearching(true);

      try {
        const userDoc = await firestore()
          .collection("profiles")
          .doc(searchText.trim())
          .get();

        if (userDoc.exists && userDoc.id !== CURRENT_USER_ID) {
          const userData = userDoc.data();
          setLocalSearchResults([
            {
              id: userDoc.id,
              ...userData,
              tags: Array.isArray(userData.tags) ? userData.tags : [],
            },
          ]);
        } else {
          setLocalSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching users:", error);
        setLocalSearchResults([]);
      } finally {
        setLocalSearching(false);
      }
    };

    const handleClose = () => {
      setShowPartnerSearch(false);
    };

    if (!showPartnerSearch) return null;

    return (
      <Modal
        visible={showPartnerSearch}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.outline,
              }}
            >
              <IconButton icon="arrow-left" onPress={handleClose} />
              <Text variant="headlineMedium" style={{ flex: 1 }}>
                Find Duo Partner
              </Text>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              {/* Your User ID */}
              <Surface
                style={{ padding: 12, borderRadius: 8, marginBottom: 16 }}
              >
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  Your User ID:
                </Text>
                <Text variant="bodyLarge" selectable>
                  {CURRENT_USER_ID}
                </Text>
              </Surface>

              <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                Enter your friend's User ID to send them a duo partner request.
              </Text>

              {/* Search Input - Using LOCAL state */}
              <TextInput
                label="Friend's User ID"
                value={localSearchQuery}
                onChangeText={(text) => {
                  console.log("Typing:", text);
                  setLocalSearchQuery(text);
                  setLocalSearchResults([]);
                }}
                mode="outlined"
                placeholder="Paste their User ID here"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginBottom: 16 }}
              />

              {/* Search Button */}
              <Button
                mode="contained"
                onPress={() => handleLocalSearch(localSearchQuery)}
                disabled={!localSearchQuery.trim() || localSearching}
                style={{ marginBottom: 16 }}
              >
                {localSearching ? "Searching..." : "Search"}
              </Button>

              {/* Loading State */}
              {localSearching && (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" />
                  <Text>Searching...</Text>
                </View>
              )}

              {/* Empty State */}
              {!localSearching && localSearchQuery.length === 0 && (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ textAlign: "center" }}>
                    Ask your friend for their User ID and paste it above, then
                    click Search!
                  </Text>
                </View>
              )}

              {/* Search Results */}
              {localSearchResults.map((item) => (
                <Card key={item.id} style={{ marginBottom: 12 }}>
                  <Card.Content>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Avatar.Image
                        size={50}
                        source={{
                          uri:
                            item.photos && item.photos[0]
                              ? item.photos[0]
                              : "https://via.placeholder.com/150",
                        }}
                      />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text variant="titleMedium">{item.name}</Text>
                        <Text variant="bodySmall">{item.age} years old</Text>
                      </View>
                    </View>

                    {item.tags && item.tags.length > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 4,
                          marginTop: 8,
                        }}
                      >
                        {item.tags.slice(0, 3).map((tag, index) => (
                          <Chip key={index} compact>
                            {tag}
                          </Chip>
                        ))}
                        {item.tags.length > 3 && (
                          <Chip compact>+{item.tags.length - 3} more</Chip>
                        )}
                      </View>
                    )}

                    <Button
                      mode="contained"
                      onPress={() => handleSendPartnerRequest(item.id)}
                      style={{ marginTop: 12 }}
                      icon="account-plus"
                    >
                      Send Request
                    </Button>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const PendingRequestsModal = () => {
    return (
      <Portal>
        <Modal
          visible={showPendingRequests}
          onDismiss={() => setShowPendingRequests(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text variant="headlineMedium">
              Pending Requests ({pendingRequests.length})
            </Text>
            <IconButton
              icon="close"
              onPress={() => setShowPendingRequests(false)}
              style={{ position: "absolute", right: 16, top: 16 }}
            />
          </View>

          <ScrollView style={styles.modalContent}>
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text>No pending requests</Text>
              </View>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id} style={styles.requestCard}>
                  <Card.Content>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Avatar.Image
                        size={50}
                        source={{
                          uri:
                            request.requesterProfile.photos &&
                            request.requesterProfile.photos[0]
                              ? request.requesterProfile.photos[0]
                              : "https://via.placeholder.com/150",
                        }}
                      />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text variant="titleMedium">
                          {request.requesterProfile.name}
                        </Text>
                        <Text variant="bodySmall">
                          {request.requesterProfile.age} years old
                        </Text>
                      </View>
                    </View>

                    {request.requesterProfile.tags &&
                      request.requesterProfile.tags.length > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 4,
                            marginTop: 8,
                          }}
                        >
                          {request.requesterProfile.tags
                            .slice(0, 3)
                            .map((tag, index) => (
                              <Chip key={index} compact>
                                {tag}
                              </Chip>
                            ))}
                          {request.requesterProfile.tags.length > 3 && (
                            <Chip compact>
                              +{request.requesterProfile.tags.length - 3} more
                            </Chip>
                          )}
                        </View>
                      )}

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <Button
                        mode="contained"
                        onPress={() =>
                          handleAcceptRequest(request.id, request.fromUserId)
                        }
                        style={{ flex: 1 }}
                        icon="check"
                      >
                        Accept
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleDeclineRequest(request.id)}
                        style={{ flex: 1 }}
                        icon="close"
                      >
                        Decline
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  // View Mode
  if (!isEditing) {
    // Partner profile viewing modal
    if (viewingPartnerProfile && duoPartnerProfile) {
      const hasPhotos =
        duoPartnerProfile.photos && duoPartnerProfile.photos.length > 0;
      const currentPhoto = hasPhotos
        ? duoPartnerProfile.photos[currentImageIndex]
        : null;

      return (
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Surface
            style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
            elevation={2}
          >
            <IconButton
              icon="arrow-left"
              onPress={() => setViewingPartnerProfile(false)}
            />
            <Text variant="titleLarge">{duoPartnerProfile.name}'s Profile</Text>
          </Surface>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Card style={styles.card}>
              {currentPhoto ? (
                <Card.Cover
                  source={{ uri: currentPhoto }}
                  style={{ height: 400 }}
                />
              ) : (
                <View
                  style={{
                    height: 400,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  <Avatar.Icon size={120} icon="account" />
                  <Text variant="bodyLarge" style={{ marginTop: 8 }}>
                    No photos available
                  </Text>
                </View>
              )}

              {hasPhotos && duoPartnerProfile.photos.length > 1 && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 0,
                    right: 0,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <IconButton
                    icon="chevron-left"
                    iconColor="white"
                    onPress={() =>
                      setCurrentImageIndex((prev) =>
                        prev === 0
                          ? duoPartnerProfile.photos.length - 1
                          : prev - 1
                      )
                    }
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {duoPartnerProfile.photos.map((_, index) => (
                      <View
                        key={index}
                        style={{
                          width: index === currentImageIndex ? 10 : 8,
                          height: index === currentImageIndex ? 10 : 8,
                          borderRadius: index === currentImageIndex ? 5 : 4,
                          backgroundColor:
                            index === currentImageIndex
                              ? "white"
                              : "rgba(255, 255, 255, 0.5)",
                        }}
                      />
                    ))}
                  </View>
                  <IconButton
                    icon="chevron-right"
                    iconColor="white"
                    onPress={() =>
                      setCurrentImageIndex((prev) =>
                        prev === duoPartnerProfile.photos.length - 1
                          ? 0
                          : prev + 1
                      )
                    }
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  />
                </View>
              )}
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="headlineMedium">
                  {duoPartnerProfile.name}, {duoPartnerProfile.age}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    marginTop: 8,
                    fontStyle: "italic",
                    color: theme.colors.primary,
                  }}
                >
                  Your Duo Partner
                </Text>

                {duoPartnerProfile.city && (
                  <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                    📍 {duoPartnerProfile.city}
                  </Text>
                )}

                {duoPartnerProfile.description && (
                  <Text style={{ marginTop: 12, lineHeight: 24 }}>
                    {duoPartnerProfile.description}
                  </Text>
                )}

                {duoPartnerProfile.tags &&
                  duoPartnerProfile.tags.length > 0 && (
                    <View style={{ marginTop: 16 }}>
                      <Text variant="titleSmall">Interests:</Text>
                      <View style={styles.tagsDisplay}>
                        {duoPartnerProfile.tags.map((tag, index) => (
                          <Chip key={index} style={styles.tagDisplay} compact>
                            {tag}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}

                <Text
                  variant="bodySmall"
                  style={{ marginTop: 16, textAlign: "center", opacity: 0.7 }}
                >
                  You cannot rate your duo partner
                </Text>
              </Card.Content>
            </Card>
          </ScrollView>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={styles.header}>
          <Text variant="headlineLarge">Your Profile</Text>
          <View style={styles.headerButtons}>
            <IconButton
              icon="cog"
              onPress={() => setShowSettings(true)}
              size={24}
            />
            <Button mode="contained" onPress={() => setIsEditing(true)}>
              Edit
            </Button>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Title title="Photos" />
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
                <Avatar.Icon size={64} icon="camera" />
                <Text style={styles.noPhotosText}>No photos added</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall">
              {profile.name || "No name"}, {profile.age || "?"}
            </Text>

            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(rating.average)}
              </View>
              <Text variant="bodySmall">
                {rating.average} ({rating.count} rating
                {rating.count !== 1 ? "s" : ""})
              </Text>
            </View>

            <Divider style={styles.divider} />

            {profile.description ? (
              <Text style={styles.description}>{profile.description}</Text>
            ) : (
              <Text style={styles.description}>No description</Text>
            )}

            {profile.tags && profile.tags.length > 0 && (
              <>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Interests
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

        <Card style={styles.card}>
          <Card.Title
            title="Privacy"
            left={(props) => <IconButton icon="shield-account" {...props} />}
          />
          <Card.Content>
            <List.Item
              title="Show Online Status"
              description={
                profile.showOnlineStatus
                  ? "Others can see when you're active"
                  : "Your online status is hidden"
              }
              right={() => (
                <Switch
                  value={profile.showOnlineStatus}
                  onValueChange={async (value) => {
                    const newProfile = {
                      ...profile,
                      showOnlineStatus: value,
                    };
                    setProfile(newProfile);
                    await saveUserProfile(CURRENT_USER_ID, newProfile);
                  }}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="Your Duo Partner"
            left={(props) => <IconButton icon="account-multiple" {...props} />}
          />
          <Card.Content>
            {duoPartnerProfile ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentImageIndex(0);
                    setViewingPartnerProfile(true);
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Avatar.Image
                      size={64}
                      source={{
                        uri:
                          duoPartnerProfile.photos &&
                          duoPartnerProfile.photos[0]
                            ? duoPartnerProfile.photos[0]
                            : "https://via.placeholder.com/150",
                      }}
                    />
                    <View style={{ marginLeft: 16 }}>
                      <Text variant="titleLarge">{duoPartnerProfile.name}</Text>
                      <Text variant="bodyMedium">
                        {duoPartnerProfile.age} years old
                      </Text>
                    </View>
                  </View>

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
                </TouchableOpacity>

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
                  style={styles.fullWidthButton}
                >
                  Find Duo Partner
                </Button>
                {pendingRequests.length > 0 && (
                  <Button
                    mode="outlined"
                    icon="bell"
                    onPress={() => setShowPendingRequests(true)}
                    style={styles.fullWidthButton}
                  >
                    View {pendingRequests.length} Pending Request
                    {pendingRequests.length !== 1 ? "s" : ""}
                  </Button>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
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
        <TagPickerModal />
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

        <SettingsDialog />
        <TagPickerModal />
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  bottomButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});
