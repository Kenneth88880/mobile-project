import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Text,
  Button,
  Card,
  Chip,
  Avatar,
  IconButton,
  Divider,
  Surface,
  useTheme,
  TextInput,
} from "react-native-paper";
import { CURRENT_USER_ID } from "../services/UserConfig";
import {
  getUserProfile,
  saveUserProfile,
  getAverageRating,
  getDuoPartnerProfile,
  resetTestData,
  getCurrentDuoPartner,
  invalidateDuoCache,
  invalidateProfileCache,
  getSubscriptionStatus,
  subscribeToSubscriptionStatus,
} from "../services/profileService";
import auth from "@react-native-firebase/auth";
import SettingsScreen from "./SettingsScreen";
import { LongPressGestureHandler, State } from "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import EditProfileModal from "../components/EditProfileModal";
import { AVAILABLE_TAGS } from "../tags";
import firestore from "@react-native-firebase/firestore";

export default function ProfileScreen({
  isDarkMode,
  toggleTheme,
  devMode = false,
  setDevMode = null,
}) {
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
    gender: null,
    genderPreference: [],
  });
  const [originalAge, setOriginalAge] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [duoPartnerProfile, setDuoPartnerProfile] = useState(null);
  const [rating, setRating] = useState({ average: "0.0", count: 0 });
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [viewingPartnerProfile, setViewingPartnerProfile] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewingRequesterProfile, setViewingRequesterProfile] = useState(null);
  const [requesterImageIndex, setRequesterImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [bugReport, setBugReport] = useState({ title: "", description: "" });
  const [sendingBugReport, setSendingBugReport] = useState(false);
  const [showDevPasswordModal, setShowDevPasswordModal] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [viewingOwnProfile, setViewingOwnProfile] = useState(false);
  const [ownProfileImageIndex, setOwnProfileImageIndex] = useState(0);

  // Initial load + real-time listener for subscription status
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    // Fetch once immediately via the service (uses profile cache)
    getSubscriptionStatus(uid).then((status) => {
      setSubscriptionStatus(status);
    });

    // Then keep it live — webhook updates will reflect instantly
    const unsubscribe = subscribeToSubscriptionStatus(uid, (status) => {
      setSubscriptionStatus(status);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  const loadAllData = async () => {
    try {
      const [userProfile, ratingData, requestsSnapshot, duosSnapshot] =
        await Promise.all([
          getUserProfile(CURRENT_USER_ID),
          getAverageRating(CURRENT_USER_ID),
          firestore()
            .collection("duoRequests")
            .where("toUserId", "==", CURRENT_USER_ID)
            .where("status", "==", "pending")
            .get(),
          firestore()
            .collection("duos")
            .where("users", "array-contains", CURRENT_USER_ID)
            .get(),
        ]);

      setRating(ratingData);

      if (!userProfile) {
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
          gender: null,
          genderPreference: [],
        };
        await saveUserProfile(CURRENT_USER_ID, emptyProfile);
        setProfile(emptyProfile);
        setIsEditing(true);
        setProfileLoaded(true);
        return;
      }

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
        gender: userProfile.gender || null,
        genderPreference: Array.isArray(userProfile.genderPreference)
          ? userProfile.genderPreference
          : [],
      };
      setProfile(cleanedProfile);
      setOriginalAge(userProfile.age || "");
      setOriginalName(userProfile.name || "");

      if (!duosSnapshot.empty) {
        const duoData = duosSnapshot.docs[0].data();
        const partnerId = duoData.users.find((id) => id !== CURRENT_USER_ID);
        if (partnerId) {
          const partnerProfile = await getDuoPartnerProfile(partnerId);
          if (partnerProfile) {
            setDuoPartnerProfile({
              ...partnerProfile,
              tags: Array.isArray(partnerProfile.tags) ? partnerProfile.tags : [],
            });
            setProfile((prev) => ({ ...prev, duoPartnerId: partnerId }));
          }
        }
      } else {
        setDuoPartnerProfile(null);
      }

      if (!requestsSnapshot.empty) {
        const requestResults = await Promise.all(
          requestsSnapshot.docs.map(async (docSnap) => {
            const requestData = docSnap.data();
            const requesterProfile = await getUserProfile(requestData.fromUserId);
            if (!requesterProfile) return null;
            return {
              id: docSnap.id,
              ...requestData,
              requesterProfile: {
                ...requesterProfile,
                tags: Array.isArray(requesterProfile.tags) ? requesterProfile.tags : [],
              },
            };
          }),
        );
        setPendingRequests(requestResults.filter(Boolean));
      }

      setProfileLoaded(true);
    } catch (error) {
      console.error("Error loading profile data:", error);
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
        gender: null,
        genderPreference: [],
      });
      setProfileLoaded(true);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const snapshot = await firestore()
        .collection("duoRequests")
        .where("toUserId", "==", CURRENT_USER_ID)
        .where("status", "==", "pending")
        .get();

      if (snapshot.empty) {
        setPendingRequests([]);
        return;
      }

      const results = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const requestData = docSnap.data();
          const requesterProfile = await getUserProfile(requestData.fromUserId);
          if (!requesterProfile) return null;
          return {
            id: docSnap.id,
            ...requestData,
            requesterProfile: {
              ...requesterProfile,
              tags: Array.isArray(requesterProfile.tags) ? requesterProfile.tags : [],
            },
          };
        }),
      );
      setPendingRequests(results.filter(Boolean));
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
  };

  const handleSave = async () => {
    try {
      if (!profile.name || !profile.age) {
        Alert.alert("Missing Info", "Please enter your name and age");
        return;
      }
      if (!profile.gender) {
        Alert.alert("Missing Info", "Please select your gender");
        return;
      }
      const profileToSave = {
        ...profile,
        name: originalName || profile.name,
        age: originalAge || profile.age,
      };
      await saveUserProfile(CURRENT_USER_ID, profileToSave);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile");
    }
  };

  const handlePhotosChange = (newPhotos) => {
    setProfile({ ...profile, photos: newPhotos });
  };

  const toggleTag = (tag) => {
    const currentTags = profile.tags || [];
    if (currentTags.includes(tag)) {
      setProfile({ ...profile, tags: currentTags.filter((t) => t !== tag) });
    } else {
      if (currentTags.length >= 5) {
        Alert.alert("Max Tags", "You can select up to 5 tags");
        return;
      }
      setProfile({ ...profile, tags: [...currentTags, tag] });
    }
  };

  const searchPartners = async (query) => {
    if (!query || query.length < 10) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const userDoc = await firestore().collection("profiles").doc(query.trim()).get();

      if (userDoc.exists) {
        const userData = userDoc.data();

        if (userDoc.id === CURRENT_USER_ID) {
          setSearchResults([]);
          Alert.alert("Invalid", "You cannot add yourself as a partner");
          return;
        }

        if (userData?.duoPartnerId != null) {
          setSearchResults([]);
          Alert.alert("Unavailable", "This user already has a duo partner");
          return;
        }

        const duosSnapshot = await firestore()
          .collection("duos")
          .where("users", "array-contains", userDoc.id)
          .get();

        if (!duosSnapshot.empty) {
          setSearchResults([]);
          Alert.alert("Unavailable", "This user already has a duo partner");
          return;
        }

        setSearchResults([{ id: userDoc.id, ...userData }]);
      } else {
        setSearchResults([]);
        Alert.alert("Not Found", "No user found with this ID");
      }
    } catch (error) {
      console.error("Error searching for partners:", error);
      Alert.alert("Error", "Failed to search for user. Please try again.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => searchPartners(text), 300);
    setSearchTimeout(timeout);
  };

  const handleSendPartnerRequest = async (toUserId) => {
    try {
      await firestore().collection("duoRequests").add({
        fromUserId: CURRENT_USER_ID,
        toUserId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Success", "Partner request sent!");
      setShowPartnerSearch(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error sending partner request:", error);
      Alert.alert("Error", "Failed to send request");
    }
  };

  const handleAcceptRequest = async (requestId, fromUserId) => {
    try {
      const myDuoSnapshot = await firestore()
        .collection("duos")
        .where("users", "array-contains", CURRENT_USER_ID)
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (!myDuoSnapshot.empty) {
        Alert.alert("Already Partnered", "You already have a duo partner. Remove your current partner first.");
        return;
      }

      const theirDuoSnapshot = await firestore()
        .collection("duos")
        .where("users", "array-contains", fromUserId)
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (!theirDuoSnapshot.empty) {
        await firestore().collection("duoRequests").doc(requestId).update({ status: "declined" });
        Alert.alert("Unavailable", "This user already has a duo partner.");
        await loadPendingRequests();
        return;
      }

      const batch = firestore().batch();
      const duoRef = firestore().collection("duos").doc();
      batch.set(duoRef, {
        users: [CURRENT_USER_ID, fromUserId],
        status: "active",
        createdAt: new Date().toISOString(),
      });
      batch.update(firestore().collection("duoRequests").doc(requestId), { status: "accepted" });
      await batch.commit();

      invalidateDuoCache(CURRENT_USER_ID);
      invalidateProfileCache(CURRENT_USER_ID);
      Alert.alert("Success", "Partner request accepted!");
      setShowPendingRequests(false);
      await loadAllData();
      await loadPendingRequests();
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await firestore().collection("duoRequests").doc(requestId).update({ status: "declined" });
      Alert.alert("Request Declined");
      await loadPendingRequests();
    } catch (error) {
      console.error("Error declining request:", error);
      Alert.alert("Error", "Failed to decline request");
    }
  };

  const handleRemovePartner = async () => {
    Alert.alert(
      "⚠️ Remove Duo Partner?",
      `This will end your duo partnership with ${duoPartnerProfile?.name || "your partner"}.\n\n` +
        "• All your duo matches and chats will be archived\n" +
        "• You can still view archived chats, but can't send new messages\n" +
        "• You'll need a new partner to start matching again\n\n" +
        "Are you sure you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Partner",
          style: "destructive",
          onPress: async () => {
            try {
              const duosSnapshot = await firestore()
                .collection("duos")
                .where("users", "array-contains", CURRENT_USER_ID)
                .get();

              if (!duosSnapshot.empty) {
                await duosSnapshot.docs[0].ref.delete();

                const chatsSnapshot = await firestore()
                  .collection("chats")
                  .where("participants", "array-contains", CURRENT_USER_ID)
                  .get();

                const batch = firestore().batch();
                chatsSnapshot.docs.forEach((doc) => {
                  batch.update(doc.ref, {
                    status: "archived",
                    archivedAt: new Date().toISOString(),
                    archivedReason: "duo_dissolved",
                  });
                });
                await batch.commit();

                invalidateDuoCache(CURRENT_USER_ID);
                invalidateProfileCache(CURRENT_USER_ID);
                setDuoPartnerProfile(null);
                setProfile({ ...profile, duoPartnerId: null });
                Alert.alert("Duo Partnership Ended", "Your duo partner has been removed and all chats have been archived.");
              }
            } catch (error) {
              console.error("Error removing partner:", error);
              Alert.alert("Error", "Failed to remove partner. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleSubmitBugReport = async () => {
    if (!bugReport.title.trim() || !bugReport.description.trim()) {
      Alert.alert("Missing Information", "Please fill in both title and description");
      return;
    }

    setSendingBugReport(true);
    try {
      const bugReportRef = await firestore().collection("bugReports").add({
        userId: CURRENT_USER_ID,
        userName: profile.name || "Unknown",
        userEmail: auth().currentUser?.email || "No email",
        title: bugReport.title,
        description: bugReport.description,
        deviceInfo: Platform.OS,
        timestamp: new Date().toISOString(),
        status: "new",
      });

      await firestore().collection("mail").add({
        to: "doubly202@gmail.com",
        message: {
          subject: `New Bug Report: ${bugReport.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #8B4A61; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">New Bug Report</h2>
              </div>
              <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                <h3 style="margin-top: 0; color: #8B4A61;">${bugReport.title}</h3>
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; font-weight: bold; width: 150px;">Report ID:</td><td style="padding: 8px; font-family: monospace;">${bugReportRef.id}</td></tr>
                    <tr style="background-color: #f5f5f5;"><td style="padding: 8px; font-weight: bold;">Submitted By:</td><td style="padding: 8px;">${profile.name || "Unknown"}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">User Email:</td><td style="padding: 8px;">${auth().currentUser?.email || "No email"}</td></tr>
                    <tr style="background-color: #f5f5f5;"><td style="padding: 8px; font-weight: bold;">User ID:</td><td style="padding: 8px; font-family: monospace; font-size: 12px;">${CURRENT_USER_ID}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Device:</td><td style="padding: 8px;">${Platform.OS === "ios" ? "iOS" : "Android"}</td></tr>
                    <tr style="background-color: #f5f5f5;"><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">${new Date().toLocaleString()}</td></tr>
                  </table>
                </div>
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 15px 0;">
                  <h4 style="margin-top: 0; color: #8B4A61;">Description:</h4>
                  <p style="white-space: pre-wrap; line-height: 1.6; margin: 0;">${bugReport.description}</p>
                </div>
              </div>
            </div>
          `,
        },
      });

      Alert.alert("Thank You!", "Your bug report has been submitted. We'll look into it soon!", [
        {
          text: "OK",
          onPress: () => {
            setShowBugReportModal(false);
            setBugReport({ title: "", description: "" });
          },
        },
      ]);
    } catch (error) {
      console.error("Error submitting bug report:", error);
      Alert.alert("Error", "Failed to submit bug report. Please try again.");
    } finally {
      setSendingBugReport(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      Alert.alert("Signed Out", "You have been successfully signed out");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const handleDevLongPress = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setShowDevPasswordModal(true);
    }
  };

  const handleDevModeToggle = () => {
    if (devPasswordInput === process.env.EXPO_PUBLIC_DEV_PASSWORD_PROD || devPasswordInput === "82wiOtnC6LclCdTWCN8b") {
      const newDevMode = !devMode;
      setDevMode(newDevMode);
      setShowDevPasswordModal(false);
      setDevPasswordInput("");
      Alert.alert("Dev Mode", newDevMode ? "Dev mode enabled - only test accounts visible" : "Dev mode disabled");
    } else {
      Alert.alert("Wrong password", "Dev mode password is incorrect");
      setDevPasswordInput("");
    }
  };

  const handleResetTestData = async () => {
    Alert.alert(
      "Reset Test Data",
      "This will clear all likes and swipes for your duo. You'll be able to match with test accounts again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              const duo = await getCurrentDuoPartner(CURRENT_USER_ID);
              if (!duo) {
                Alert.alert("Error", "No duo found");
                return;
              }
              await resetTestData(duo.duoId);
              Alert.alert("Success", "Test data has been reset! You can now match with test accounts again.");
            } catch (error) {
              console.error("Error resetting test data:", error);
              Alert.alert("Error", "Failed to reset test data: " + error.message);
            }
          },
        },
      ],
    );
  };

  const renderStars = (average) => {
    const rating = parseFloat(average);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={i <= rating ? styles.star : styles.starEmpty}>★</Text>
      );
    }
    return stars;
  };

  // ─── Subscription Status Banner ───────────────────────────────────────────

  const SubscriptionBanner = () => {
    if (!subscriptionStatus) return null;

    const banners = {
      active: {
        bg: "#e8f5e9",
        icon: "✓",
        color: "#2e7d32",
        label: "Premium Member",
      },
      past_due: {
        bg: "#fff8e1",
        icon: "⚠️",
        color: "#f57f17",
        label: "Payment Past Due — Please update your payment method",
      },
      canceled: {
        bg: "#fff5f5",
        icon: "✕",
        color: "#c62828",
        label: "Subscription Canceled",
      },
    };

    const banner = banners[subscriptionStatus];
    if (!banner) return null;

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: banner.bg }}>
        <Card.Content style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>{banner.icon}</Text>
          <Text variant="titleSmall" style={{ color: banner.color, fontWeight: "bold" }}>
            {banner.label}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  // ─── Modals ───────────────────────────────────────────────────────────────

  const TagPickerModal = () => (
    <Modal visible={showTagPicker} animationType="slide" onRequestClose={() => setShowTagPicker(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
          <Text variant="headlineMedium">Select Tags (Max 5)</Text>
          <IconButton icon="close" size={24} onPress={() => setShowTagPicker(false)} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <View style={styles.tagsGrid}>
            {AVAILABLE_TAGS.map((tag, index) => (
              <Chip key={index} selected={profile.tags.includes(tag)} onPress={() => toggleTag(tag)} style={styles.tagChip}>{tag}</Chip>
            ))}
          </View>
        </ScrollView>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.outline }}>
          <Button mode="contained" onPress={() => setShowTagPicker(false)} icon="check">Done</Button>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const PartnerSearchModal = () => (
    <Modal visible={showPartnerSearch} animationType="slide" onRequestClose={() => setShowPartnerSearch(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
          <View style={styles.modalHeader}>
            <Text variant="headlineMedium">Find a Duo Partner</Text>
            <IconButton icon="close" onPress={() => { setShowPartnerSearch(false); setSearchQuery(""); setSearchResults([]); }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Card style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 8 }}>To add a duo partner:</Text>
                <Text variant="bodySmall" style={{ lineHeight: 20 }}>1. Ask your friend to share their User ID{"\n"}2. Paste their User ID below{"\n"}3. Send them a partner request</Text>
              </Card.Content>
            </Card>
            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.primaryContainer }}>
              <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>Your User ID:</Text>
                <TouchableOpacity onPress={() => { Clipboard.setString(CURRENT_USER_ID); setCopied(true); setTimeout(() => setCopied(false), 3000); }} style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12 }}>
                  <Text variant="bodyMedium" style={{ fontFamily: "monospace", flex: 1 }} selectable={true}>{CURRENT_USER_ID}</Text>
                  <IconButton icon={copied ? "check" : "content-copy"} size={20} iconColor={copied ? "#4CAF50" : theme.colors.primary} />
                </TouchableOpacity>
                <Text variant="bodySmall" style={{ marginTop: 8, fontStyle: "italic", opacity: 0.7 }}>Tap to copy</Text>
              </Card.Content>
            </Card>
            <TextInput
              label="Enter Partner's User ID"
              value={searchQuery}
              onChangeText={handleSearchChange}
              mode="outlined"
              style={styles.searchInput}
              left={<TextInput.Icon icon="account-search" />}
              right={searching ? <TextInput.Icon icon={() => <ActivityIndicator />} /> : null}
              placeholder="Paste your friend's User ID here"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              keyboardType="default"
              textContentType="none"
              selectTextOnFocus={true}
            />
            {searchResults.length === 0 && searchQuery.length >= 10 ? (
              <View style={styles.emptyState}><Text>No user found with this ID</Text></View>
            ) : (
              searchResults.map((item) => (
                <Card key={item.id} style={styles.searchResultCard}>
                  <Card.Content>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Avatar.Image size={50} source={{ uri: item.photos?.[0] || "https://via.placeholder.com/150" }} />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text variant="titleMedium">{item.name}</Text>
                        <Text variant="bodySmall">{item.age} years old • {item.city || "Location unknown"}</Text>
                      </View>
                    </View>
                    {item.tags && item.tags.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                        {item.tags.slice(0, 3).map((tag, index) => <Chip key={index} compact>{tag}</Chip>)}
                        {item.tags.length > 3 && <Chip compact>+{item.tags.length - 3} more</Chip>}
                      </View>
                    )}
                    <Button mode="contained" onPress={() => handleSendPartnerRequest(item.id)} style={{ marginTop: 12 }} icon="account-plus">Send Request</Button>
                  </Card.Content>
                </Card>
              ))
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  const PendingRequestsModal = () => (
    <Modal visible={showPendingRequests} animationType="slide" onRequestClose={() => setShowPendingRequests(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
          <Text variant="headlineMedium">Pending Requests ({pendingRequests.length})</Text>
          <IconButton icon="close" size={24} onPress={() => setShowPendingRequests(false)} />
        </View>
        <Text variant="bodySmall" style={{ paddingHorizontal: 16, paddingVertical: 12, fontStyle: "italic", opacity: 0.7 }}>Tap on a request to view their full profile</Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyState}><Text>No pending requests</Text></View>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} style={styles.requestCard} onPress={() => { setViewingRequesterProfile(request.requesterProfile); setRequesterImageIndex(0); }}>
                <Card.Content>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Avatar.Image size={50} source={{ uri: request.requesterProfile.photos?.[0] || "https://via.placeholder.com/150" }} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="titleMedium">{request.requesterProfile.name}</Text>
                      <Text variant="bodySmall">{request.requesterProfile.age} years old</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Button mode="contained" onPress={() => handleAcceptRequest(request.id, request.fromUserId)} style={{ flex: 1 }}>Accept</Button>
                    <Button mode="outlined" onPress={() => handleDeclineRequest(request.id)} style={{ flex: 1 }}>Decline</Button>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  

  
  const BugReportModal = () => (
    <Modal visible={showBugReportModal} animationType="slide" onRequestClose={() => setShowBugReportModal(false)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={styles.modalHeader}>
            <Text variant="headlineMedium">Report a Bug</Text>
            <IconButton icon="close" onPress={() => { setShowBugReportModal(false); setBugReport({ title: "", description: "" }); }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Card style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Help us improve the app by reporting any issues you encounter.</Text>
                <Text variant="bodySmall" style={{ fontStyle: "italic", opacity: 0.7 }}>We'll review your report and work on a fix as soon as possible.</Text>
              </Card.Content>
            </Card>
            <TextInput label="Bug Title *" value={bugReport.title} onChangeText={(text) => setBugReport({ ...bugReport, title: text })} mode="outlined" style={{ marginBottom: 16 }} placeholder="Brief description of the issue" maxLength={100} />
            <TextInput label="Detailed Description *" value={bugReport.description} onChangeText={(text) => setBugReport({ ...bugReport, description: text })} mode="outlined" multiline numberOfLines={8} style={{ marginBottom: 16 }} placeholder="What happened? What were you doing when the bug occurred?" />
            <Text variant="bodySmall" style={{ fontStyle: "italic", opacity: 0.7, marginBottom: 16 }}>* Required fields</Text>
            <Button mode="contained" onPress={handleSubmitBugReport} icon="send" loading={sendingBugReport} disabled={sendingBugReport}>Submit Bug Report</Button>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ─── Viewing own profile preview ──────────────────────────────────────────

  if (viewingOwnProfile) {
    const hasPhotos = profile.photos && profile.photos.length > 0;
    const currentPhoto = hasPhotos ? profile.photos[ownProfileImageIndex] : null;

    return (
      <Modal visible={true} animationType="slide" onRequestClose={() => setViewingOwnProfile(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <Surface style={{ flexDirection: "row", alignItems: "center", padding: 16 }} elevation={2}>
            <IconButton icon="arrow-left" onPress={() => setViewingOwnProfile(false)} />
            <Text variant="titleLarge">Profile Preview</Text>
          </Surface>
          <ScrollView>
            <Card style={styles.card}>
              {currentPhoto ? (
                <Card.Cover source={{ uri: currentPhoto }} style={{ height: 400 }} />
              ) : (
                <View style={{ height: 400, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0" }}>
                  <Avatar.Icon size={120} icon="account" />
                  <Text variant="bodyLarge" style={{ marginTop: 8 }}>No photos</Text>
                </View>
              )}
              {hasPhotos && profile.photos.length > 1 && (
                <View style={{ position: "absolute", bottom: 16, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <IconButton icon="chevron-left" iconColor="white" onPress={() => setOwnProfileImageIndex((prev) => prev === 0 ? profile.photos.length - 1 : prev - 1)} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {profile.photos.map((_, index) => (
                      <View key={index} style={{ width: index === ownProfileImageIndex ? 10 : 8, height: index === ownProfileImageIndex ? 10 : 8, borderRadius: index === ownProfileImageIndex ? 5 : 4, backgroundColor: index === ownProfileImageIndex ? "white" : "rgba(255,255,255,0.5)" }} />
                    ))}
                  </View>
                  <IconButton icon="chevron-right" iconColor="white" onPress={() => setOwnProfileImageIndex((prev) => prev === profile.photos.length - 1 ? 0 : prev + 1)} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                </View>
              )}
            </Card>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="headlineMedium">{profile.name}, {profile.age}</Text>
                {profile.city && <Text variant="bodyMedium" style={{ marginTop: 4 }}>📍 {profile.city}</Text>}
                <Text style={styles.description}>{profile.description || "No description"}</Text>
                {profile.tags && profile.tags.length > 0 && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="titleMedium" style={styles.sectionTitle}>Interests</Text>
                    <View style={styles.tagsDisplay}>
                      {profile.tags.map((tag, index) => <Chip key={index} style={styles.tagDisplay}>{tag}</Chip>)}
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─── Viewing requester profile ────────────────────────────────────────────

  if (viewingRequesterProfile) {
    const hasPhotos = viewingRequesterProfile.photos && viewingRequesterProfile.photos.length > 0;
    const currentPhoto = hasPhotos ? viewingRequesterProfile.photos[requesterImageIndex] : null;

    return (
      <Modal visible={true} animationType="slide" onRequestClose={() => setViewingRequesterProfile(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <Surface style={{ flexDirection: "row", alignItems: "center", padding: 16 }} elevation={2}>
            <IconButton icon="arrow-left" onPress={() => setViewingRequesterProfile(null)} />
            <Text variant="titleLarge">{viewingRequesterProfile.name}'s Profile</Text>
          </Surface>
          <ScrollView>
            <Card style={styles.card}>
              {currentPhoto ? (
                <Card.Cover source={{ uri: currentPhoto }} style={{ height: 400 }} />
              ) : (
                <View style={{ height: 400, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0" }}>
                  <Avatar.Icon size={120} icon="account" />
                  <Text variant="bodyLarge" style={{ marginTop: 8 }}>No photos</Text>
                </View>
              )}
              {hasPhotos && viewingRequesterProfile.photos.length > 1 && (
                <View style={{ position: "absolute", bottom: 16, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <IconButton icon="chevron-left" iconColor="white" onPress={() => setRequesterImageIndex((prev) => prev === 0 ? viewingRequesterProfile.photos.length - 1 : prev - 1)} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {viewingRequesterProfile.photos.map((_, index) => (
                      <View key={index} style={{ width: index === requesterImageIndex ? 10 : 8, height: index === requesterImageIndex ? 10 : 8, borderRadius: index === requesterImageIndex ? 5 : 4, backgroundColor: index === requesterImageIndex ? "white" : "rgba(255,255,255,0.5)" }} />
                    ))}
                  </View>
                  <IconButton icon="chevron-right" iconColor="white" onPress={() => setRequesterImageIndex((prev) => prev === viewingRequesterProfile.photos.length - 1 ? 0 : prev + 1)} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                </View>
              )}
            </Card>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="headlineMedium">{viewingRequesterProfile.name}, {viewingRequesterProfile.age}</Text>
                {viewingRequesterProfile.city && <Text variant="bodyMedium" style={{ marginTop: 4 }}>📍 {viewingRequesterProfile.city}</Text>}
                <Text style={styles.description}>{viewingRequesterProfile.description || "No description"}</Text>
                {viewingRequesterProfile.tags && viewingRequesterProfile.tags.length > 0 && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="titleMedium" style={styles.sectionTitle}>Interests</Text>
                    <View style={styles.tagsDisplay}>
                      {viewingRequesterProfile.tags.map((tag, index) => <Chip key={index} style={styles.tagDisplay}>{tag}</Chip>)}
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─── Viewing partner profile ──────────────────────────────────────────────

  if (viewingPartnerProfile && duoPartnerProfile) {
    const hasPhotos = duoPartnerProfile.photos && duoPartnerProfile.photos.length > 0;
    const currentPhoto = hasPhotos ? duoPartnerProfile.photos[currentImageIndex] : null;

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Surface style={{ flexDirection: "row", alignItems: "center", padding: 16 }} elevation={2}>
          <IconButton icon="arrow-left" onPress={() => setViewingPartnerProfile(false)} />
          <Text variant="titleLarge">{duoPartnerProfile.name}'s Profile</Text>
        </Surface>
        <ScrollView>
          <Card style={styles.card}>
            {currentPhoto ? (
              <Card.Cover source={{ uri: currentPhoto }} style={{ height: 400 }} />
            ) : (
              <View style={{ height: 400, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0" }}>
                <Avatar.Icon size={120} icon="account" />
                <Text variant="bodyLarge" style={{ marginTop: 8 }}>No photos</Text>
              </View>
            )}
            {hasPhotos && duoPartnerProfile.photos.length > 1 && (
              <View style={{ position: "absolute", bottom: 16, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <IconButton icon="chevron-left" iconColor="white" onPress={() => setCurrentImageIndex((prev) => prev === 0 ? duoPartnerProfile.photos.length - 1 : prev - 1)} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {duoPartnerProfile.photos.map((_, index) => (
                    <View key={index} style={{ width: index === currentImageIndex ? 10 : 8, height: index === currentImageIndex ? 10 : 8, borderRadius: index === currentImageIndex ? 5 : 4, backgroundColor: index === currentImageIndex ? "white" : "rgba(255,255,255,0.5)" }} />
                  ))}
                </View>
                <IconButton icon="chevron-right" iconColor="white" onPress={() => setCurrentImageIndex((prev) => prev === duoPartnerProfile.photos.length - 1 ? 0 : prev + 1)} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
              </View>
            )}
          </Card>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineMedium">{duoPartnerProfile.name}, {duoPartnerProfile.age}</Text>
              <Text variant="bodyMedium" style={{ marginTop: 8, fontStyle: "italic", color: theme.colors.primary }}>Your Duo Partner</Text>
              {duoPartnerProfile.city && <Text variant="bodyMedium" style={{ marginTop: 4 }}>📍 {duoPartnerProfile.city}</Text>}
              {duoPartnerProfile.description && <Text style={{ marginTop: 12, lineHeight: 24 }}>{duoPartnerProfile.description}</Text>}
              {duoPartnerProfile.tags && duoPartnerProfile.tags.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text variant="titleSmall">Interests:</Text>
                  <View style={styles.tagsDisplay}>
                    {duoPartnerProfile.tags.map((tag, index) => <Chip key={index} style={styles.tagDisplay}>{tag}</Chip>)}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
          <Button mode="outlined" icon="account-remove" onPress={handleRemovePartner} style={{ margin: 16 }} textColor="#ff6b6b">Remove Duo Partner</Button>
        </ScrollView>
      </View>
    );
  }

  // ─── Main profile view ────────────────────────────────────────────────────

  if (!isEditing) {
    const hasPhotos = profile.photos && profile.photos.length > 0;
    const mainPhoto = hasPhotos ? profile.photos[0] : null;

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 80 }}>
          <Surface style={styles.header} elevation={0}>
            <Text variant="headlineSmall">Profile</Text>
            <LongPressGestureHandler onHandlerStateChange={handleDevLongPress} minDurationMs={1000}>
              <IconButton icon="cog" onPress={() => setShowSettingsModal(true)} size={24} />
            </LongPressGestureHandler>
          </Surface>

          <SubscriptionBanner />

          <View style={styles.profilePhotoSection}>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <View style={styles.circularPhoto}>
                <Avatar.Image size={120} source={{ uri: mainPhoto || "https://via.placeholder.com/120" }} />
              </View>
              <View style={styles.editBadge}>
                <IconButton icon="pencil" size={16} iconColor="#fff" style={{ margin: 0 }} />
              </View>
            </TouchableOpacity>
            <Text variant="headlineMedium" style={styles.profileName}>{profile.name || "Add Your Name"}</Text>
            {profile.age && <Text variant="bodyMedium" style={styles.profileAge}>{profile.age} years old</Text>}
            <View style={styles.ratingContainerHinge}>
              <View style={styles.starsContainer}>{renderStars(rating.average)}</View>
              <Text variant="bodySmall" style={{ marginTop: 4 }}>{rating.average} ({rating.count} rating{rating.count !== 1 ? "s" : ""})</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <Button mode="contained" icon="pencil" onPress={() => setIsEditing(true)} style={styles.editButton}>Edit Profile</Button>
          </View>

          <View style={[styles.actionButtons, { marginTop: -8 }]}>
            <Button mode="contained" icon="eye" onPress={() => { setOwnProfileImageIndex(0); setViewingOwnProfile(true); }} style={styles.editButton}>Preview Profile</Button>
          </View>

          {devMode && (
            <View style={[styles.actionButtons, { marginTop: -8 }]}>
              <Button mode="outlined" icon="refresh" onPress={handleResetTestData} style={styles.editButton} buttonColor={theme.colors.errorContainer} textColor={theme.colors.error}>Reset Test Data</Button>
            </View>
          )}

          {profileLoaded && (!profile.photos || profile.photos.length === 0) && (
            <Card style={[styles.warningCard, { backgroundColor: "#fff5f5" }]}>
              <Card.Content>
                <View style={styles.warningHeader}>
                  <Text style={{ fontSize: 24, marginRight: 8 }}>⚠️</Text>
                  <Text variant="titleMedium" style={{ color: "#ff6b6b", fontWeight: "bold" }}>Photo Required</Text>
                </View>
                <Text style={{ color: "#666", marginTop: 8 }}>Add at least one photo to appear in the dating feed and start matching!</Text>
              </Card.Content>
            </Card>
          )}

          <Card style={styles.card}>
            <Card.Title title="Your Duo Partner" left={(props) => <Avatar.Icon {...props} icon="account-multiple" size={40} />} />
            <Card.Content>
              {duoPartnerProfile ? (
                <>
                  <TouchableOpacity onPress={() => { setCurrentImageIndex(0); setViewingPartnerProfile(true); }} style={styles.partnerContainer}>
                    <Avatar.Image size={80} source={{ uri: duoPartnerProfile.photos?.[0] || "https://via.placeholder.com/80" }} />
                    <View style={styles.partnerInfo}>
                      <Text variant="titleLarge">{duoPartnerProfile.name}</Text>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{duoPartnerProfile.age} years old</Text>
                      <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.primary }}>Tap to view profile →</Text>
                    </View>
                  </TouchableOpacity>
                  {profileLoaded && (!duoPartnerProfile.photos || duoPartnerProfile.photos.length === 0) && (
                    <Card style={{ marginTop: 12, borderColor: "#ff9800", borderWidth: 2, backgroundColor: "#fff8e1" }}>
                      <Card.Content>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                          <Text style={{ fontSize: 24, marginRight: 8 }}>⚠️</Text>
                          <Text variant="titleMedium" style={{ color: "#ff9800", fontWeight: "bold" }}>Partner Needs Photos</Text>
                        </View>
                        <Text style={{ color: "#666" }}>Your duo partner needs to add at least one photo for your duo to appear in the dating feed.</Text>
                      </Card.Content>
                    </Card>
                  )}
                </>
              ) : (
                <View style={styles.noPartnerContainer}>
                  <Avatar.Icon size={64} icon="account-plus" />
                  <Text variant="bodyLarge" style={{ marginTop: 12, marginBottom: 16 }}>No duo partner yet</Text>
                  <Button mode="contained" icon="account-plus" onPress={() => setShowPartnerSearch(true)}>Find a Duo Partner</Button>
                  {pendingRequests.length > 0 && (
                    <Button mode="outlined" icon="bell" onPress={() => setShowPendingRequests(true)} style={{ marginTop: 12 }}>View Requests ({pendingRequests.length})</Button>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <Card.Content style={{ padding: 8 }}>
              <Button
                mode="contained"
                icon="bug"
                onPress={() => setShowBugReportModal(true)}
                contentStyle={{ paddingVertical: 16 }}
                labelStyle={{ fontSize: 18, fontWeight: "bold" }}
                buttonColor={isDarkMode ? theme.colors.primary : "#8B4A61"}
              >
                Report a Bug
              </Button>
            </Card.Content>
          </Card>

          <Modal visible={showDevPasswordModal} transparent animationType="fade" onRequestClose={() => setShowDevPasswordModal(false)}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: "white", padding: 20, borderRadius: 10, width: "80%" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Dev Mode</Text>
                <Text style={{ fontSize: 14, marginBottom: 15, color: "#666" }}>Enter password to toggle dev mode</Text>
                <TextInput placeholder="Password" secureTextEntry value={devPasswordInput} onChangeText={setDevPasswordInput} placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: "#ddd", padding: 10, marginBottom: 15, borderRadius: 5, fontSize: 16 }} autoFocus />
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Pressable style={{ flex: 1, padding: 10, backgroundColor: "#f0f0f0", borderRadius: 5 }} onPress={() => setShowDevPasswordModal(false)}>
                    <Text style={{ textAlign: "center", color: "#666", fontWeight: "600" }}>Cancel</Text>
                  </Pressable>
                  <Pressable style={{ flex: 1, padding: 10, backgroundColor: "#8B4A61", borderRadius: 5 }} onPress={handleDevModeToggle}>
                    <Text style={{ textAlign: "center", color: "white", fontWeight: "600" }}>Unlock</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          <SettingsScreen isDarkMode={isDarkMode} toggleTheme={toggleTheme} visible={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
          {PartnerSearchModal()}
          {PendingRequestsModal()}
          {BugReportModal()}
        </ScrollView>
      </GestureHandlerRootView>
    );
  }

  return (
    <EditProfileModal
      visible={isEditing}
      onClose={() => {
        setIsEditing(false);
        loadAllData();
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 8 },
  profilePhotoSection: { alignItems: "center", paddingTop: 20, paddingBottom: 24 },
  circularPhoto: { width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: "#fff", backgroundColor: "#fff", justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, overflow: "hidden" },
  editBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#8B4A61", borderRadius: 20, width: 36, height: 36, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff" },
  profileName: { marginTop: 16, fontWeight: "bold" },
  profileAge: { marginTop: 4, opacity: 0.7 },
  ratingContainerHinge: { alignItems: "center", marginTop: 12 },
  actionButtons: { paddingHorizontal: 16, marginBottom: 16 },
  editButton: { borderRadius: 25, paddingVertical: 4 },
  warningCard: { marginHorizontal: 16, marginBottom: 16, borderWidth: 2, borderColor: "#ff6b6b" },
  warningHeader: { flexDirection: "row", alignItems: "center" },
  partnerContainer: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "rgba(139, 74, 97, 0.05)", borderRadius: 12 },
  partnerInfo: { marginLeft: 16, flex: 1 },
  noPartnerContainer: { alignItems: "center", paddingVertical: 20 },
  card: { margin: 8, marginHorizontal: 16 },
  ratingContainer: { marginVertical: 12 },
  starsContainer: { flexDirection: "row", marginBottom: 4 },
  star: { fontSize: 20, color: "#FFD700" },
  starEmpty: { fontSize: 20, color: "#ddd" },
  divider: { marginVertical: 12 },
  description: { marginTop: 12, lineHeight: 24 },
  sectionTitle: { marginTop: 16, marginBottom: 8 },
  tagsDisplay: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tagDisplay: { marginRight: 4, marginBottom: 4 },
  modalHeader: { padding: 16 },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { marginRight: 4, marginBottom: 4 },
  searchInput: { marginBottom: 16 },
  emptyState: { padding: 40, alignItems: "center", justifyContent: "center" },
  searchResultCard: { marginBottom: 8 },
  requestCard: { marginBottom: 12 },
});