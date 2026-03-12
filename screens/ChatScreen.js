import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, FlatList, Alert, KeyboardAvoidingView, Platform, StyleSheet, 
         TouchableOpacity, Image, Keyboard, Linking, ScrollView } from "react-native";
import {
  Text,
  TextInput,
  Avatar,
  List,
  Badge,
  IconButton,
  Surface,
  ActivityIndicator,
  useTheme,
  Divider,
  Icon,
  Portal,
  Modal,
  Card,
  Button,
  Chip,
  Dialog,
} from "react-native-paper";
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import { getUserProfile } from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import { EmptyState, ProfilePhoto } from "../components/CommonComponents";
import { launchImageLibrary } from "react-native-image-picker";
import { getAverageRating } from "../services/profileService";
import { SwipeableMessageRight, SwipeableMessageLeft } from "./ChatScreen/SwipeableMessage.js";

const getUserID = () => CURRENT_USER_ID;

const openPlaceInBrowser = (suggestion) => {
  const query = [suggestion.place, suggestion.address].filter(Boolean).join(", ");
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  Linking.openURL(url).catch(() => Alert.alert("Error", "Unable to open browser"));
};

const openMapsFromSuggestion = (suggestion) => {
  const query = [suggestion.place, suggestion.address].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(query);
  const url = Platform.OS === "ios"
    ? `maps://app?q=${encoded}`
    : `geo:0,0?q=${encoded}`;
  Linking.openURL(url).catch(() => openPlaceInBrowser(suggestion));
};

const deleteChat = async (chatId) => {
  try {
    const messagesSnapshot = await firestore()
      .collection("chats").doc(chatId).collection("messages").get();
    await Promise.all(messagesSnapshot.docs.map((d) => d.ref.delete()));
    await firestore().collection("chats").doc(chatId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

const reportChat = async (chatId, reportingUserId) => {
  try {
    const chatRef = firestore().collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) { console.error("Chat not found"); return false; }

    const chatData = chatDoc.data();
    const participants = chatData.participants || [];
    const reporterProfile = await getUserProfile(reportingUserId);

    const messagesSnapshot = await chatRef.collection("messages").orderBy("createdAt", "asc").get();
    const chatLogs = messagesSnapshot.docs.map((doc) => {
      const msgData = doc.data();
      const text = msgData.text || "";
      return {
        messageId: doc.id,
        text: text.length > 500 ? text.substring(0, 500) + "... [truncated]" : text,
        senderId: msgData.user._id,
        senderName: msgData.user.name,
        createdAt: msgData.createdAt ? msgData.createdAt.toDate().toISOString() : null,
      };
    });

    const participantProfiles = {};
    for (const participantId of participants) {
      const profile = await getUserProfile(participantId);
      if (profile) {
        participantProfiles[participantId] = {
          userId: participantId,
          name: profile.name, age: profile.age, gender: profile.gender,
          city: profile.city, email: profile.email || "N/A",
          firstPhoto: profile.photos?.[0] || null,
          photoCount: profile.photos?.length || 0,
          tags: profile.tags ? profile.tags.join(", ") : "",
          description: profile.description || "",
          createdAt: profile.createdAt || null,
        };
      }
    }

    await firestore().collection("reports").add({
      reportId: `report_${Date.now()}`,
      reportedAt: firestore.FieldValue.serverTimestamp(),
      chatId, chatName: chatData.groupName || "Unnamed Chat",
      isGroupChat: chatData.isGroupChat || false,
      isPrivate: chatData.isPrivate || false,
      creatorID: chatData.creatorID || null,
      reporter: { userId: reportingUserId, profile: reporterProfile },
      participants: participantProfiles,
      participantCount: participants.length,
      chatLogs, messageCount: chatLogs.length,
      chatCreatedAt: chatData.createdAt || null,
      lastMessageTime: chatData.lastMessageTime,
      status: "pending_review", reviewedAt: null, reviewedBy: null, action: null,
    });

    const reports = chatData.reports || [];
    reports.push({ reportedBy: reportingUserId, reportedAt: Date.now(), reason: "User reported inappropriate content" });
    const hiddenFor = chatData.hiddenFor || [];
    if (!hiddenFor.includes(reportingUserId)) hiddenFor.push(reportingUserId);

    await chatRef.update({
      reports, hiddenFor,
      flaggedForModeration: true,
      lastReportedAt: firestore.FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error reporting chat:", error);
    return false;
  }
};

const updateChatName = async (chatId, newName) => {
  const currentUserId = getUserID();
  const currentChatInfo = await firestore().collection("chats").doc(chatId).get().then(d => d.data());
  try {
    if (currentChatInfo.isPrivate) {
      if (currentUserId === currentChatInfo.creatorID) {
        await firestore().collection("chats").doc(chatId).update({ curUserName: newName, updatedAt: firestore.FieldValue.serverTimestamp() });
      } else {
        await firestore().collection("chats").doc(chatId).update({ otherUserName: newName, updatedAt: firestore.FieldValue.serverTimestamp() });
      }
    } else {
      await firestore().collection("chats").doc(chatId).update({ groupName: newName, updatedAt: firestore.FieldValue.serverTimestamp() });
    }
    return true;
  } catch (error) {
    console.error("Error updating chat name:", error);
    return false;
  }
};

const uploadImageToStorage = async (imageUri, chatId) => {
  const filename = `chat_profile_pictures/${chatId}_${Date.now()}.jpg`;
  const reference = storage().ref(filename);
  await reference.putFile(imageUri);
  return reference.getDownloadURL();
};

const updateChatPicture = async (chatId, imageUri) => {
  try {
    const downloadURL = await uploadImageToStorage(imageUri, chatId);
    await firestore().collection("chats").doc(chatId).update({ groupPhoto: downloadURL, updatedAt: firestore.FieldValue.serverTimestamp() });
    return true;
  } catch (error) {
    console.error("Error updating chat picture:", error);
    return false;
  }
};

// ── Place Suggestion Modal ─────────────────────────────────────────────────────
// Mirrors the PlaceInfo visual style: hero image, name, category, actions, info rows
function PlaceSuggestionModal({ visible, suggestion, onDismiss }) {
  const theme = useTheme();

  if (!suggestion) return null;

  const PLACEHOLDER_IMAGE =
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80";

  const imageUri = suggestion.imageUrl || PLACEHOLDER_IMAGE;

  const handleDirections = () => openMapsFromSuggestion(suggestion);
  const handleOpenMaps = () => openPlaceInBrowser(suggestion);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          flex: 1,
          margin: 0,
          backgroundColor: theme.colors.background,
        }}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero image ── */}
            <View style={{ position: "relative" }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", aspectRatio: 4 / 3 }}
                resizeMode="cover"
              />
              {/* Back button overlaid on image */}
              <TouchableOpacity
                onPress={onDismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  elevation: 4,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <Icon source="arrow-left" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>

              {/* "Date Suggestion" badge overlaid on image */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  elevation: 4,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <Icon source="calendar-heart" size={14} color={theme.colors.onPrimary} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.onPrimary }}>
                  Date Suggestion
                </Text>
              </View>
            </View>

            {/* ── Content ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              {/* Name & category */}
              <Text style={{ fontSize: 24, fontWeight: "700", color: theme.colors.onSurface, marginBottom: 4 }}>
                {suggestion.place}
              </Text>
              {suggestion.category ? (
                <Text style={{ fontSize: 15, color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                  {suggestion.category}
                </Text>
              ) : null}

              {/* ── Action buttons — mirroring PlaceInfo layout ── */}
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={handleDirections}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 14,
                    borderRadius: 14,
                    gap: 4,
                    backgroundColor: theme.colors.primaryContainer,
                  }}
                >
                  <Icon source="directions" size={22} color={theme.colors.onPrimaryContainer} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.onPrimaryContainer }}>
                    Directions
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenMaps}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 14,
                    borderRadius: 14,
                    gap: 4,
                    backgroundColor: theme.colors.primaryContainer,
                  }}
                >
                  <Icon source="map-search" size={22} color={theme.colors.onPrimaryContainer} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.onPrimaryContainer }}>
                    View on Maps
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Divider ── */}
              <View style={{ height: 1, backgroundColor: theme.colors.outlineVariant, marginBottom: 8 }} />

              {/* ── Address info row ── */}
              {suggestion.address ? (
                <TouchableOpacity
                  onPress={handleDirections}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
                >
                  <Icon source="map-marker-outline" size={22} color={theme.colors.primary} />
                  <Text style={{ fontSize: 15, flex: 1, color: theme.colors.onSurface }}>
                    {suggestion.address.replace(/\n/g, ", ")}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* ── Category info row ── */}
              {suggestion.category ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                  <Icon source="tag-outline" size={22} color={theme.colors.primary} />
                  <Text style={{ fontSize: 15, flex: 1, color: theme.colors.onSurface }}>
                    {suggestion.category}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
}

function EditGroupModal({ visible, onDismiss, currentChat, currentUserId, userProfiles,
                          uploadingChatImage, onChangePicture, onSaveName, onParticipantPress }) {
  const theme = useTheme();
  const [editingName, setEditingName] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowParticipants(false);
      if (currentChat.isPrivate) {
        setEditingName(currentUserId === currentChat.creatorID
          ? currentChat.curUserName || ""
          : currentChat.otherUserName || "");
      } else {
        setEditingName(currentChat.groupName || "");
      }
    }
  }, [visible]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: theme.colors.background,
          padding: 20,
          margin: 20,
          borderRadius: 8,
        }}
      >
        <Card>
          <Card.Title title={currentChat.isPrivate ? "Nickname" : "Edit Group Info"} />
          <Card.Content>
            {!currentChat.isPrivate && (
              <TouchableOpacity
                onPress={onChangePicture}
                disabled={uploadingChatImage}
                style={{ alignItems: "center", marginBottom: 16 }}
              >
                {uploadingChatImage ? (
                  <ActivityIndicator size="large" />
                ) : currentChat.groupPhoto ? (
                  <Avatar.Image size={80} source={{ uri: currentChat.groupPhoto }} />
                ) : (
                  <Avatar.Icon size={80} icon="account-group" />
                )}
                <Text variant="labelLarge" style={{ marginTop: 8, color: uploadingChatImage ? "#999" : theme.colors.primary }}>
                  {uploadingChatImage ? "Uploading..." : "Tap to Change Picture"}
                </Text>
              </TouchableOpacity>
            )}
            <TextInput
              mode="outlined"
              label={currentChat.isPrivate ? "Name" : "Group Name"}
              value={editingName}
              onChangeText={setEditingName}
              maxLength={50}
              style={{ marginTop: 8 }}
            />
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => { Keyboard.dismiss(); setTimeout(onDismiss, 150); }}>Cancel</Button>
            <Button onPress={() => onSaveName(editingName)}>Save</Button>
          </Card.Actions>

          <IconButton
            icon="account-multiple"
            onPress={() => setShowParticipants(p => !p)}
            tooltip="View Participants"
          />

          {showParticipants && (
            <Card>
              <Card.Title title="People" />
              <Card.Content>
                {Object.values(userProfiles).length > 0 ? (
                  Object.values(userProfiles).map((profile) => (
                    <List.Item
                      key={profile.id}
                      title={profile.name || "Unknown"}
                      description={profile.city || "No location"}
                      left={() => <ProfilePhoto uri={profile.photos?.[0]} size={48} />}
                      style={{ paddingVertical: 8 }}
                      onPress={() => onParticipantPress(profile)}
                    />
                  ))
                ) : (
                  <Text>No participants found</Text>
                )}
              </Card.Content>
            </Card>
          )}
        </Card>
      </Modal>
    </Portal>
  );
}

function ChatListScreen({ onChatSelect }) {
  const theme = useTheme();
  const currentUserId = getUserID();
  const [chats, setChats] = useState([]);
  const [archivedChats, setArchivedChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatOptionsVisible, setChatOptionsVisible] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChatName, setSelectedChatName] = useState("");
  const [selectedChatIsPrivate, setSelectedChatIsPrivate] = useState(false);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("chats")
      .where("participants", "array-contains", currentUserId)
      .onSnapshot(
        (snapshot) => {
          const activeChatsList = [];
          const archivedChatsList = [];

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.hiddenFor && data.hiddenFor.includes(currentUserId)) return;
            const chat = { id: docSnap.id, ...data };
            if (data.status === "archived") archivedChatsList.push(chat);
            else activeChatsList.push(chat);
          });

          const sortChats = (list) => list.sort((a, b) =>
            (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));

          setChats(sortChats(activeChatsList));
          setArchivedChats(sortChats(archivedChatsList));
          setLoading(false);
        },
        (error) => { console.error("Error loading chats:", error); setLoading(false); }
      );
    return () => unsubscribe();
  }, [currentUserId]);

  const formatTimeStamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMins = Math.floor((now - date) / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const congratsMessages = [
    "Congrats on the successful double date!",
    "That's awesome! Glad you all hit it off!",
    "Woohoo! Nothing beats a great double date!",
  ];

  const handleEveryoneMet = (chatId) => {
    const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
    Alert.alert("Everyone Met!", randomMessage, [{
      text: "Thanks!",
      onPress: async () => { if (!await deleteChat(chatId)) Alert.alert("Error", "Failed to close chat"); },
    }]);
  };

  const handleUnmatchDuo = (chatId, chatName) => {
    Alert.alert("Unmatch Duo", `Are you sure you want to unmatch with "${chatName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unmatch", style: "destructive",
        onPress: async () => {
          if (await deleteChat(chatId)) Alert.alert("Unmatched", "You have been unmatched");
          else Alert.alert("Error", "Failed to unmatch");
        },
      },
    ]);
  };

  const handleReport = (chatId, chatName) => {
    Alert.alert(
      "Report Chat",
      `Report "${chatName}" for inappropriate content?\n\nThis will:\n• Collect all chat messages\n• Log all participant profiles\n• Flag for moderation review\n• Hide this chat from your view`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report", style: "destructive",
          onPress: () => {
            setTimeout(async () => {
              try {
                await new Promise((resolve) => setTimeout(resolve, 100));
                const success = await reportChat(chatId, currentUserId);
                setTimeout(() => {
                  if (success) Alert.alert("Report Submitted", "Thank you. Our moderation team will review this chat within 24 hours. The chat has been hidden from your view.");
                  else Alert.alert("Error", "Failed to submit report. Please try again.");
                }, 300);
              } catch (error) {
                console.error("Error in report flow:", error);
                setTimeout(() => Alert.alert("Error", "Something went wrong. Please try again."), 300);
              }
            }, 50);
          },
        },
      ]
    );
  };

  const showChatOptions = (chatId, chatName, isPrivate) => {
    setSelectedChatId(chatId);
    setSelectedChatName(chatName);
    setSelectedChatIsPrivate(isPrivate);
    setChatOptionsVisible(true);
  };

  const hideChatOptions = () => {
    setChatOptionsVisible(false);
    setSelectedChatId(null);
    setSelectedChatName("");
  };

  const renderItem = ({ item }) => {
    const unreadCount = item.unreadCount?.[currentUserId] || 0;
    const isGroup = item.isGroupChat || false;
    const isArchived = item.status === "archived";
    const timestamp = formatTimeStamp(item.lastMessageTime);
    const isPrivate = item.isPrivate || false;

    return (
      <List.Item
        title={item.isGroupChat ? item.groupName : currentUserId === item.creatorID ? item.curUserName : item.otherUserName}
        titleStyle={unreadCount > 0 && !isArchived ? { fontWeight: "bold", color: theme.colors.onSurface } : {}}
        description={isArchived ? "🗄️ Archived - Read only" : item.lastMessageText || "No messages yet"}
        descriptionNumberOfLines={1}
        left={() =>
          isGroup ? (
            item.groupPhoto
              ? <Avatar.Image size={48} source={{ uri: item.groupPhoto }} style={isArchived && { opacity: 0.6 }} />
              : <Avatar.Icon size={48} icon="account-group" style={isArchived && { opacity: 0.6 }} />
          ) : isPrivate ? (
            <Avatar.Image size={48} source={{ uri: currentUserId === item.creatorID ? item.curPhoto : item.otherPhoto }} style={isArchived && { opacity: 0.6 }} />
          ) : (
            <Avatar.Icon size={48} icon="account-group" style={isArchived && { opacity: 0.6 }} />
          )
        }
        right={() => (
          <View style={styles.chatRight}>
            {timestamp && <Text variant="bodySmall" style={[{ marginBottom: 4 }, isArchived && { opacity: 0.6 }]}>{timestamp}</Text>}
            {unreadCount > 0 && !isArchived && <Badge style={styles.badge}>{unreadCount}</Badge>}
            <IconButton icon="dots-vertical" size={20} onPress={() => showChatOptions(item.id, item.groupName || "Chat", item.isPrivate || false)} />
          </View>
        )}
        onPress={() => onChatSelect(item)}
        style={[styles.chatItem, isArchived && { opacity: 0.7, backgroundColor: theme.colors.surfaceVariant }]}
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Surface style={styles.header} elevation={2}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon source="message" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium">Messages</Text>
          </View>
        </Surface>
        <View style={styles.centerContent}><ActivityIndicator size="large" /></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.header} elevation={2}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon source="message" size={28} color={theme.colors.primary} />
          <Text variant="headlineMedium">Messages</Text>
        </View>
      </Surface>

      {chats.length === 0 && archivedChats.length === 0 ? (
        <EmptyState icon="message" title="No Messages Yet" message="When you match with duos, you'll be able to message them here!" />
      ) : (
        <FlatList
          data={[
            ...chats,
            ...(archivedChats.length > 0 ? [{ id: "archived-header", isHeader: true }] : []),
            ...archivedChats,
          ]}
          renderItem={({ item }) => {
            if (item.isHeader) {
              return (
                <View style={styles.sectionHeader}>
                  <Divider />
                  <Text variant="titleSmall" style={{ padding: 12, paddingLeft: 16, color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>
                    🗄️ Archived Chats ({archivedChats.length})
                  </Text>
                  <Divider />
                </View>
              );
            }
            return renderItem({ item });
          }}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Divider />}
        />
      )}

      <Portal>
        <Dialog visible={chatOptionsVisible} onDismiss={hideChatOptions}>
          <Dialog.Title>Chat Options</Dialog.Title>
          <Dialog.Content>
            {!selectedChatIsPrivate && (
              <>
                <Button mode="contained-tonal" onPress={() => { hideChatOptions(); handleEveryoneMet(selectedChatId); }} style={{ marginBottom: 12 }}>
                  EVERYONE MET
                </Button>
                <Button mode="outlined" onPress={() => { hideChatOptions(); handleUnmatchDuo(selectedChatId, selectedChatName); }} style={{ marginBottom: 12 }} buttonColor={theme.colors.errorContainer} textColor={theme.colors.error}>
                  UNMATCH DUO
                </Button>
              </>
            )}
            <Button mode="outlined" onPress={() => { hideChatOptions(); handleReport(selectedChatId, selectedChatName); }} buttonColor={theme.colors.errorContainer} textColor={theme.colors.error}>
              REPORT
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideChatOptions}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function IndividualChatScreen({ chat, onBack, onChatSelect, onMessageSwipeStart, onMessageSwipeEnd }) {
  const theme = useTheme();
  const currentUserId = getUserID();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [userProfiles, setUserProfiles] = useState({});
  const [viewingProfile, setViewingProfile] = useState(null);
  const [profileImageIndex, setProfileImageIndex] = useState(0);
  const [uploadingChatImage, setuploadingChatImage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentChat, setCurrentChat] = useState(chat);
  const [replyingTo, setReplyingTo] = useState(null);
  // ── NEW: place suggestion modal state ──
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const flatListRef = useRef(null);
  const itemHeightsRef = useRef({});

  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([40, 999])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      if (event.translationX > 0) translateX.value = event.translationX * 0.4;
    })
    .onEnd((event) => {
      if (event.translationX > 80) { translateX.value = withSpring(500); runOnJS(onBack)(); }
      else translateX.value = withSpring(0);
    })
    .onFinalize(() => { translateX.value = withSpring(0); });

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const unsubscribersRef = useRef({ messages: null, chat: null });

  const [viewingProfileRating, setViewingProfileRating] = useState({ average: "0.0", count: 0 });
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!chat?.id) return;
    firestore().collection("chats").doc(chat.id).update({ [`unreadCount.${currentUserId}`]: 0 }).catch(console.error);
    const unsubscribe = firestore()
      .collection("chats").doc(chat.id).collection("messages")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          setMessages(snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              _id: doc.id,
              text: data.text,
              imageUrl: data.imageUrl,
              type: data.type,
              suggestion: data.suggestion,
              replyTo: data.replyTo ? { ...data.replyTo, imageUrl: data.replyTo.imageUrl || null } : null,
              createdAt: data.createdAt?.toDate() || new Date(),
              user: { _id: data.user?._id, name: data.user?.name },
            };
          }));
        },
        (error) => {
          if (error.code === "permission-denied") onBack();
          else console.error("Error loading messages:", error);
        }
      );
    unsubscribersRef.current.messages = unsubscribe;
    return () => { unsubscribe(); unsubscribersRef.current.messages = null; };
  }, [chat, currentUserId]);

  useEffect(() => {
    if (!chat?.participants) return;
    (async () => {
      const allProfiles = {};
      for (const userId of chat.participants) {
        const profile = await getUserProfile(userId);
        if (profile) allProfiles[userId] = { id: userId, ...profile };
      }
      setUserProfiles(allProfiles);
    })();
  }, [chat]);

  useEffect(() => {
    if (!chat?.id) return;
    const unsubscribe = firestore().collection("chats").doc(chat.id).onSnapshot(
      (doc) => { if (doc.exists) setCurrentChat({ id: doc.id, ...doc.data() }); },
      (error) => {
        if (error.code === "permission-denied") onBack();
        else console.error("Error loading chat:", error);
      }
    );
    unsubscribersRef.current.chat = unsubscribe;
    return () => { unsubscribe(); unsubscribersRef.current.chat = null; };
  }, [chat?.id]);

  const handleEditGroupInfo = () => setShowEditModal(true);

  const handleSaveGroupName = async (name) => {
    if (!name.trim()) { Alert.alert("Error", "Name cannot be empty"); return; }
    Keyboard.dismiss();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const success = await updateChatName(chat.id, name.trim());
    if (success) { setShowEditModal(false); Alert.alert("Success", "Name updated!"); }
    else Alert.alert("Error", "Failed to update name");
  };

  const handleChangeGroupPicture = async () => {
    try {
      launchImageLibrary({ mediaType: "photo", quality: 0.8, maxWidth: 1000, maxHeight: 1000 }, async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) { Alert.alert("Error", "Failed to select image"); return; }
        if (response.assets?.[0]) {
          setuploadingChatImage(true);
          const success = await updateChatPicture(chat.id, response.assets[0].uri);
          setuploadingChatImage(false);
          if (success) Alert.alert("Success", "Group picture updated!");
          else Alert.alert("Error", "Failed to update group picture");
        }
      });
    } catch (error) {
      console.error("Error in handleChangeGroupPicture:", error);
      setuploadingChatImage(false);
      Alert.alert("Error", "An error occurred while selecting the image");
    }
  };

  const loadProfileRating = async (userId) => {
    try {
      setUserRating(0); setHasRated(false); setViewingProfileRating({ average: "0.0", count: 0 });
      const ratingData = await getAverageRating(userId);
      setViewingProfileRating(ratingData);
      const snap = await firestore().collection("ratings")
        .where("fromUserId", "==", currentUserId).where("toUserId", "==", userId).limit(1).get();
      if (!snap.empty) { setUserRating(snap.docs[0].data().rating); setHasRated(true); }
    } catch (error) { console.error("Error loading rating:", error); }
  };

  const handleProfilePicturePress = (userId) => {
    const profile = userProfiles[userId];
    if (!profile) return;
    setUserRating(0); setHasRated(false); setViewingProfileRating({ average: "0.0", count: 0 });
    setViewingProfile(profile);
    setProfileImageIndex(0);
    loadProfileRating(userId);
  };

  const handleParticipantPress = (profile) => {
    setUserRating(0); setHasRated(false); setViewingProfileRating({ average: "0.0", count: 0 });
    setViewingProfile(profile);
    setProfileImageIndex(0);
    setShowEditModal(false);
    loadProfileRating(profile.id);
  };

  const handleReplyBubbleTap = (replyTo) => {
    const index = messages.findIndex((m) =>
      replyTo.messageId ? m._id === replyTo.messageId
        : replyTo.imageUrl ? m.imageUrl === replyTo.imageUrl
        : m.text === replyTo.text
    );
    if (index === -1 || !flatListRef.current) return;
    let offsetFromBottom = 0;
    for (let i = 0; i < index; i++) offsetFromBottom += itemHeightsRef.current[messages[i]._id] || 60;
    flatListRef.current.scrollToOffset({ offset: offsetFromBottom, animated: true });
  };

  const handleProfileImageTap = (event) => {
    if (!viewingProfile?.photos || viewingProfile.photos.length <= 1) return;
    const { locationX } = event.nativeEvent;
    const width = event.nativeEvent.target?.offsetWidth || event.nativeEvent.target?.clientWidth || 400;
    if (locationX > width / 2) setProfileImageIndex((p) => p === viewingProfile.photos.length - 1 ? 0 : p + 1);
    else setProfileImageIndex((p) => p === 0 ? viewingProfile.photos.length - 1 : p - 1);
  };

  const createPrivateChat = async (otherUserID) => {
    try {
      const [otherUserDoc, currentUserDoc] = await Promise.all([
        firestore().collection("profiles").doc(otherUserID).get(),
        firestore().collection("profiles").doc(currentUserId).get(),
      ]);
      const otherUserName = otherUserDoc.data().name;
      const currentUserName = currentUserDoc.data().name;
      const existing = await firestore().collection("chats")
        .where("participants", "array-contains", currentUserId).where("isPrivate", "==", true).get();
      const existingDM = existing.docs.find((doc) => doc.data().participants.includes(otherUserID));
      if (existingDM) return { id: existingDM.id, ...existingDM.data() };
      const chatData = {
        participants: [currentUserId, otherUserID],
        curUserName: otherUserName || "Private Chat",
        otherUserName: currentUserName || "Private Chat",
        curPhoto: otherUserDoc.data().photos?.[0] || null,
        otherPhoto: currentUserDoc.data().photos?.[0] || null,
        isGroupChat: false, isPrivate: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastMessage: "", creatorID: currentUserId,
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        type: "private",
      };
      const chatRef = await firestore().collection("chats").add(chatData);
      setViewingProfile(null);
      return { id: chatRef.id, ...chatData };
    } catch (error) {
      console.error("Error creating private chat:", error);
      Alert.alert("Error", "Failed to create private chat");
    }
  };

  const handleCreatePrivateChat = async (otherUserID) => {
    const newChat = await createPrivateChat(otherUserID);
    if (newChat) { setViewingProfile(null); onChatSelect(newChat); }
  };

  const handleSubmitRating = async (userId, rating) => {
    if (rating === 0) { Alert.alert("Invalid Rating", "Please select a rating between 1-5 stars"); return; }
    if (userId === currentUserId) { Alert.alert("Error", "You cannot rate yourself"); return; }
    setSubmittingRating(true);
    try {
      const existingRating = await firestore().collection("ratings")
        .where("fromUserId", "==", currentUserId).where("toUserId", "==", userId).get();
      if (!existingRating.empty) {
        await firestore().collection("ratings").doc(existingRating.docs[0].id).update({ rating, updatedAt: firestore.FieldValue.serverTimestamp() });
        Alert.alert("Success", "Your rating has been updated!");
      } else {
        await firestore().collection("ratings").add({ fromUserId: currentUserId, toUserId: userId, rating, createdAt: firestore.FieldValue.serverTimestamp() });
        Alert.alert("Success", "Thank you for your rating!");
      }
      await loadProfileRating(userId);
      setHasRated(true);
    } catch (error) {
      console.error("Error submitting rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderStars = (rating, onPress = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => onPress && onPress(i)} disabled={!onPress} style={{ marginHorizontal: 4 }}>
          <Icon source={i <= rating ? "star" : "star-outline"} size={onPress ? 36 : 20} color={i <= rating ? "#FFD700" : "#ddd"} />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const handleSendImage = async () => {
    try {
      launchImageLibrary({ mediaType: "photo", quality: 0.8, maxWidth: 1000, maxHeight: 1000 }, async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) { Alert.alert("Error", "Failed to select image"); return; }
        if (response.assets?.[0]) {
          setUploadingImage(true);
          try {
            const filename = `chat_messages/${chat.id}_${Date.now()}.jpg`;
            const reference = storage().ref(filename);
            await reference.putFile(response.assets[0].uri);
            const downloadURL = await reference.getDownloadURL();
            await firestore().collection("chats").doc(chat.id).collection("messages").add({
              imageUrl: downloadURL, text: "",
              createdAt: firestore.FieldValue.serverTimestamp(),
              user: { _id: currentUserId, name: "You" },
            });
            const unreadUpdate = {};
            chat.participants?.forEach((participantId) => {
              if (participantId !== currentUserId)
                unreadUpdate[`unreadCount.${participantId}`] = (chat.unreadCount?.[participantId] || 0) + 1;
            });
            await firestore().collection("chats").doc(chat.id).update({
              lastMessageText: "📷 Image",
              lastMessageTime: firestore.FieldValue.serverTimestamp(),
              ...unreadUpdate,
            });
          } catch (uploadError) {
            console.error("Upload error:", uploadError);
            Alert.alert("Error", "Failed to upload image");
          } finally {
            setUploadingImage(false);
          }
        }
      });
    } catch (error) {
      console.error("Error sending image:", error);
      Alert.alert("Error", "Failed to send image");
      setUploadingImage(false);
    }
  };

  const onSend = useCallback(async () => {
    if (!chat?.id || !inputText.trim()) return;
    if (currentChat.status === "archived") {
      Alert.alert("Chat Archived", "This chat is archived and read-only. You cannot send new messages.");
      return;
    }
    try {
      await firestore().collection("chats").doc(chat.id).collection("messages").add({
        text: inputText.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        user: { _id: currentUserId, name: "You" },
        ...(replyingTo && {
          replyTo: {
            text: replyingTo.text || "📷 Image",
            senderName: userProfiles[replyingTo.user._id]?.name || "Someone",
            senderId: replyingTo.user._id,
            messageId: replyingTo._id,
            imageUrl: replyingTo.imageUrl || null,
          },
        }),
      });
      setReplyingTo(null);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      const unreadUpdate = {};
      chat.participants?.forEach((participantId) => {
        if (participantId !== currentUserId)
          unreadUpdate[`unreadCount.${participantId}`] = (chat.unreadCount?.[participantId] || 0) + 1;
      });
      await firestore().collection("chats").doc(chat.id).update({
        lastMessageText: inputText.trim(),
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        ...unreadUpdate,
      });
      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }, [chat, currentUserId, inputText, currentChat.status, replyingTo, userProfiles]);

  // ── Place suggestion card renderer ──
  // Now opens PlaceSuggestionModal on tap instead of going directly to Maps
  const renderPlaceSuggestion = (suggestion, bgColor, isMyMessage) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setSelectedSuggestion(suggestion)}
    >
      <Surface style={[
        styles.messageBubble,
        {
          backgroundColor: bgColor,
          borderBottomRightRadius: isMyMessage ? 4 : 16,
          borderBottomLeftRadius: isMyMessage ? 16 : 4,
          padding: 0,
          overflow: "hidden",
          maxWidth: 240,
        }
      ]} elevation={1}>
        {suggestion.imageUrl && (
          <Image
            source={{ uri: suggestion.imageUrl }}
            style={{ width: 240, height: 130, marginLeft: isMyMessage ? -12 : 0 }}
            resizeMode="cover"
          />
        )}
        <View style={{ padding: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary, marginBottom: 3 }}>📅 Date Suggestion</Text>
          <Text style={{ fontWeight: "700", fontSize: 14, color: theme.colors.onSurface }} numberOfLines={1}>{suggestion.place}</Text>
          {suggestion.category && <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 1 }}>{suggestion.category}</Text>}
          {suggestion.address && <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={2}>📌 {suggestion.address}</Text>}
          <Text style={{ fontSize: 10, color: theme.colors.primary, marginTop: 6, fontStyle: "italic" }}>Tap to view details →</Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: theme.colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 40}
          keyboardDismissMode="on-drag"
          enabled={!showEditModal}
        >
          <Surface style={styles.chatHeader} elevation={2}>
            <IconButton icon="arrow-left" onPress={onBack} />

            {(currentChat.isGroupChat || !currentChat.isPrivate) && (
              <TouchableOpacity onPress={handleChangeGroupPicture} disabled={uploadingChatImage || currentChat.status === "archived"} style={{ marginRight: 8 }}>
                {uploadingChatImage ? <ActivityIndicator size={36} /> : currentChat.groupPhoto
                  ? <Avatar.Image size={36} source={{ uri: currentChat.groupPhoto }} />
                  : <Avatar.Icon size={36} icon="account-group" />}
              </TouchableOpacity>
            )}

            {(!currentChat.isGroupChat && currentChat.isPrivate) && (
              <View style={{ marginRight: 8 }}>
                <Avatar.Image size={36} source={{ uri: currentUserId === currentChat.creatorID ? currentChat.curPhoto : currentChat.otherPhoto }} />
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                if ((currentChat.isGroupChat || currentChat.isPrivate) && currentChat.status !== "archived") {
                  handleEditGroupInfo();
                }
              }}
              style={{ flex: 1, flexDirection: "column", alignItems: "flex-start" }}
              disabled={(!currentChat.isGroupChat && !currentChat.isPrivate) || currentChat.status === "archived"}
            >
              <Text variant="titleLarge">
                {currentChat.isGroupChat ? currentChat.groupName || "Chat" : ""}
                {currentChat.isPrivate ? (currentChat.creatorID === currentUserId ? currentChat.curUserName || "Private Chat" : currentChat.otherUserName || "Private Chat") : ""}
              </Text>
              {currentChat.status === "archived" && (
                <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 2 }}>🗄️ Archived - Read Only</Text>
              )}
            </TouchableOpacity>
          </Surface>

          {/* ── Messages ── */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            inverted
            contentContainerStyle={styles.messagesList}
            renderItem={({ item, index }) => {
              const isMyMessage = item.user._id === currentUserId;
              const senderProfile = userProfiles[item.user._id];
              const isLatestMessage = index === 0;

              if (isMyMessage) {
                return (
                  <View style={[styles.messageRow, styles.myMessageRow]} onLayout={(e) => { itemHeightsRef.current[item._id] = e.nativeEvent.layout.height; }}>
                    <SwipeableMessageLeft onSwipe={() => setReplyingTo(item)}
                      onMessageSwipeStart={onMessageSwipeStart}
                      onMessageSwipeEnd={onMessageSwipeEnd}>
                      <View style={{ alignItems: "flex-end" }}>
                        {item.text && !item.imageUrl && item.type !== "place_suggestion" && (
                          <View style={{ alignItems: "flex-end" }}>
                            {item.replyTo && (
                              <TouchableOpacity onPress={() => handleReplyBubbleTap(item.replyTo)}>
                                <View style={{ backgroundColor: theme.dark === true ? "rgb(255, 176, 201)" : "rgb(139, 74, 97)", opacity: 0.6, borderRadius: 12, borderBottomRightRadius: 2, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 240, marginBottom: 2, marginRight: 8 }}>
                                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.dark === true ? "#fff" : "#000", marginBottom: 2 }}>{item.replyTo.senderName}</Text>
                                  <Text style={{ fontSize: 12, color: theme.dark === true ? "#fff" : "#000" }} numberOfLines={1}>{item.replyTo.text}</Text>
                                </View>
                              </TouchableOpacity>
                            )}
                            <Surface style={[styles.messageBubble, { backgroundColor: theme.colors.primaryContainer, borderBottomRightRadius: 4, borderBottomLeftRadius: 16, zIndex: 1 }]} elevation={1}>
                              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>{item.text}</Text>
                            </Surface>
                          </View>
                        )}
                        {item.imageUrl && !item.type && (
                          <Surface>
                            <Image source={{ uri: item.imageUrl }} style={{ width: 200, height: 200, borderRadius: 12, marginLeft: -1 }} resizeMode="cover" />
                          </Surface>
                        )}
                        {item.type === "place_suggestion" && item.suggestion &&
                          renderPlaceSuggestion(item.suggestion, theme.colors.primaryContainer, true)
                        }
                        {isLatestMessage && (
                          <Text variant="labelSmall" style={[styles.messageTime, { color: theme.colors.onPrimaryContainer }]}>
                            {item.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        )}
                      </View>
                    </SwipeableMessageLeft>
                    {userProfiles[currentUserId] && (
                      <View style={styles.avatarWrapper}>
                        <Text variant="labelSmall" style={styles.avatarName}>{userProfiles[currentUserId].name || "You"}</Text>
                        <TouchableOpacity onPress={() => handleProfilePicturePress(currentUserId)}>
                          <ProfilePhoto uri={userProfiles[currentUserId].photos?.[0]} size={32} style={styles.messageAvatar} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }

              return (
                <View style={[styles.messageRow]} onLayout={(e) => { itemHeightsRef.current[item._id] = e.nativeEvent.layout.height; }}>
                  <View style={styles.avatarWrapper}>
                    <Text variant="labelSmall" style={styles.avatarName}>{senderProfile?.name || "Unknown"}</Text>
                    <TouchableOpacity onPress={() => handleProfilePicturePress(item.user._id)}>
                      <ProfilePhoto uri={senderProfile?.photos?.[0]} size={32} style={styles.messageAvatar} />
                    </TouchableOpacity>
                  </View>
                  <SwipeableMessageRight  onSwipe={() => setReplyingTo(item)}
                                          onMessageSwipeStart={onMessageSwipeStart}
                                          onMessageSwipeEnd={onMessageSwipeEnd}
                  >
                    <View style={{ alignItems: "flex-start" }}>
                      {item.text && !item.imageUrl && item.type !== "place_suggestion" && (
                        <View style={{ alignItems: "flex-start" }}>
                          {item.replyTo && (
                            <TouchableOpacity onPress={() => handleReplyBubbleTap(item.replyTo)}>
                              <View style={{ backgroundColor: theme.dark === true ? "rgb(255, 176, 201)" : "rgb(139, 74, 97)", opacity: 0.6, borderRadius: 12, borderBottomLeftRadius: 2, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 240, marginBottom: 2, marginLeft: 8, borderLeftWidth: 3, borderLeftColor: theme.colors.primary }}>
                                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.dark === true ? "#fff" : "#000", marginBottom: 2 }}>{item.replyTo.senderName}</Text>
                                <Text style={{ fontSize: 12, color: theme.dark === true ? "#fff" : "#000" }} numberOfLines={1}>{item.replyTo.text}</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                          <Surface style={[styles.messageBubble, { backgroundColor: theme.colors.surfaceVariant, borderBottomRightRadius: 16, borderBottomLeftRadius: 4, zIndex: 1 }]} elevation={1}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{item.text}</Text>
                          </Surface>
                        </View>
                      )}
                      {item.imageUrl && !item.type && (
                        <Surface>
                          <Image source={{ uri: item.imageUrl }} style={{ width: 200, height: 200, borderRadius: 12 }} resizeMode="cover" />
                        </Surface>
                      )}
                      {item.type === "place_suggestion" && item.suggestion &&
                        renderPlaceSuggestion(item.suggestion, theme.colors.surfaceVariant, false)
                      }
                      {isLatestMessage && (
                        <Text variant="labelSmall" style={[styles.messageTime, { color: theme.colors.onSurfaceVariant }]}>
                          {item.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      )}
                    </View>
                  </SwipeableMessageRight>
                </View>
              );
            }}
          />

          {/* ── Input ── */}
          <Surface style={{ backgroundColor: theme.colors.background, borderTopColor: "transparent", borderColor: "transparent" }} elevation={0}>
            {replyingTo && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, backgroundColor: theme.colors.surfaceVariant, borderLeftWidth: 3, borderLeftColor: theme.colors.primary }}>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Replying to {userProfiles[replyingTo.user._id]?.name || "Someone"}</Text>
                  <Text variant="bodySmall" numberOfLines={1}>{replyingTo.text || "📷 Image"}</Text>
                </View>
                <IconButton icon="close" size={16} onPress={() => setReplyingTo(null)} />
              </View>
            )}
            {currentChat.status === "archived" ? (
              <View style={{ padding: 12, backgroundColor: theme.colors.surfaceVariant, alignItems: "center" }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>🗄️ This chat is archived and read-only</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 }}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder=" Type a message..."
                  multiline
                  maxLength={1000}
                  style={[styles.textInput, { borderRadius: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 0, borderColor: "transparent" }]}
                  dense
                  autoCorrect={true}
                  selectionColor="#000000"
                  autoCapitalize="sentences"
                  spellCheck={true}
                  textContentType="none"
                  contentStyle={{ justifyContent: "center" }}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  cursorColor="#000000"
                />
                <IconButton style={{ position: "absolute", right: 35, backgroundColor: "transparent" }} icon="image" size={24} onPress={handleSendImage} />
                <IconButton style={{ position: "absolute", right: 5, backgroundColor: "transparent" }} icon="send" mode="contained" onPress={onSend} disabled={!inputText.trim()} size={20} />
              </View>
            )}
          </Surface>

          {/* ── Edit Modal ── */}
          <EditGroupModal
            visible={showEditModal}
            onDismiss={() => setShowEditModal(false)}
            currentChat={currentChat}
            currentUserId={currentUserId}
            userProfiles={userProfiles}
            uploadingChatImage={uploadingChatImage}
            onChangePicture={handleChangeGroupPicture}
            onSaveName={handleSaveGroupName}
            onParticipantPress={handleParticipantPress}
          />

          {/* ── Profile Modal ── */}
          <Portal>
            <Modal
              visible={viewingProfile !== null}
              onDismiss={() => { setViewingProfile(null); setProfileImageIndex(0); setUserRating(0); setHasRated(false); }}
              contentContainerStyle={{ backgroundColor: theme.colors.background, margin: 20, borderRadius: 8, maxHeight: "90%" }}
            >
              {viewingProfile && (
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
                    <Text variant="titleLarge">{viewingProfile.name}'s Profile</Text>
                    <IconButton icon="close" onPress={() => { setViewingProfile(null); setProfileImageIndex(0); setUserRating(0); setHasRated(false); }} />
                  </View>
                  <View style={{ maxHeight: 600 }}>
                    <FlatList
                      data={[{ key: "profile" }]}
                      keyExtractor={(item) => item.key}
                      renderItem={() => (
                        <View style={{ padding: 16 }}>
                          {viewingProfile.photos?.length > 0 ? (
                            <Card style={{ marginBottom: 16 }}>
                              <TouchableOpacity activeOpacity={0.9} onPress={handleProfileImageTap}>
                                <Card.Cover source={{ uri: viewingProfile.photos[profileImageIndex] }} style={{ height: 300 }} />
                                {viewingProfile.photos.length > 1 && (
                                  <View style={{ position: "absolute", bottom: 16, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                                    {viewingProfile.photos.map((_, index) => (
                                      <View key={index} style={{ width: index === profileImageIndex ? 10 : 8, height: index === profileImageIndex ? 10 : 8, borderRadius: index === profileImageIndex ? 5 : 4, backgroundColor: index === profileImageIndex ? "white" : "rgba(255,255,255,0.5)" }} />
                                    ))}
                                  </View>
                                )}
                              </TouchableOpacity>
                            </Card>
                          ) : (
                            <Card style={{ marginBottom: 16, height: 300, justifyContent: "center", alignItems: "center" }}>
                              <Avatar.Icon size={80} icon="account" />
                              <Text style={{ marginTop: 8 }}>No photos</Text>
                            </Card>
                          )}
                          <Card style={{ marginBottom: 16 }}>
                            <Card.Content>
                              <Text variant="headlineSmall">{viewingProfile.name}, {viewingProfile.age || "?"}</Text>
                              <View style={{ marginTop: 12, alignItems: "center" }}>
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                                  {renderStars(parseFloat(viewingProfileRating.average))}
                                </View>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                  {viewingProfileRating.average} ({viewingProfileRating.count} rating{viewingProfileRating.count !== 1 ? "s" : ""})
                                </Text>
                              </View>
                              {viewingProfile.city && (
                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                                  <Icon source="map-marker" size={16} />
                                  <Text variant="bodyMedium" style={{ marginLeft: 4 }}>{viewingProfile.city}</Text>
                                </View>
                              )}
                              {viewingProfile.gender && (
                                <View style={{ marginTop: 12 }}>
                                  <Text variant="titleSmall" style={{ marginBottom: 4 }}>Gender</Text>
                                  <Chip style={{ alignSelf: "flex-start", backgroundColor: viewingProfile.gender === "male" ? "#4A90E2" : viewingProfile.gender === "female" ? "#FF69B4" : "#9B59B6" }} textStyle={{ color: "#FFFFFF" }}>
                                    {viewingProfile.gender === "male" ? "Male" : viewingProfile.gender === "female" ? "Female" : "Non-Binary"}
                                  </Chip>
                                </View>
                              )}
                              {viewingProfile.description && (
                                <View style={{ marginTop: 16 }}>
                                  <Text variant="titleSmall" style={{ marginBottom: 4 }}>About</Text>
                                  <Text variant="bodyMedium" style={{ lineHeight: 22 }}>{viewingProfile.description}</Text>
                                </View>
                              )}
                              {viewingProfile.tags?.length > 0 && (
                                <View style={{ marginTop: 16 }}>
                                  <Text variant="titleSmall" style={{ marginBottom: 8 }}>Interests</Text>
                                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                    {viewingProfile.tags.map((tag, index) => <Chip key={index} compact>{tag}</Chip>)}
                                  </View>
                                </View>
                              )}
                            </Card.Content>
                          </Card>
                          {viewingProfile.id !== currentUserId && (
                            <Card style={{ marginBottom: 16, backgroundColor: theme.colors.primaryContainer }}>
                              <Card.Content>
                                <Text variant="titleMedium" style={{ marginBottom: 12, textAlign: "center" }}>
                                  {hasRated ? "Update Your Rating" : "Rate This Person"}
                                </Text>
                                <View style={{ alignItems: "center", marginBottom: 12 }}>
                                  <View style={{ flexDirection: "row", justifyContent: "center" }}>
                                    {renderStars(userRating, setUserRating)}
                                  </View>
                                  {userRating > 0 && (
                                    <Text variant="bodySmall" style={{ marginTop: 8, fontStyle: "italic" }}>
                                      {userRating === 1 && "Poor"}{userRating === 2 && "Fair"}{userRating === 3 && "Good"}{userRating === 4 && "Very Good"}{userRating === 5 && "Excellent"}
                                    </Text>
                                  )}
                                </View>
                                <Button mode="contained" onPress={() => handleSubmitRating(viewingProfile.id, userRating)} disabled={userRating === 0 || submittingRating} loading={submittingRating} icon={hasRated ? "update" : "star"}>
                                  {hasRated ? "Update Rating" : "Submit Rating"}
                                </Button>
                                {hasRated && (
                                  <Text variant="bodySmall" style={{ marginTop: 8, textAlign: "center", fontStyle: "italic", opacity: 0.7 }}>
                                    You previously rated this person {userRating} star{userRating !== 1 ? "s" : ""}
                                  </Text>
                                )}
                                {currentChat.isPrivate !== true && (
                                  <Button mode="contained" style={{ marginTop: 8 }} onPress={() => handleCreatePrivateChat(viewingProfile.id)}>
                                    Create Private DM
                                  </Button>
                                )}
                              </Card.Content>
                            </Card>
                          )}
                        </View>
                      )}
                    />
                  </View>
                </View>
              )}
            </Modal>
          </Portal>

          {/* ── Place Suggestion Detail Modal ── */}
          <PlaceSuggestionModal
            visible={selectedSuggestion !== null}
            suggestion={selectedSuggestion}
            onDismiss={() => setSelectedSuggestion(null)}
          />

        </KeyboardAvoidingView>
      </Animated.View>
    </GestureDetector>
  );
}

// ── Root: always render ChatListScreen so its Firestore listener stays alive ──
// IndividualChatScreen overlays it via absoluteFill — no remount lag on back swipe
export default function ChatScreen() {
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <ChatListScreen onChatSelect={setSelectedChat} />
      {selectedChat && (
        <View style={StyleSheet.absoluteFill}>
          <IndividualChatScreen
            chat={selectedChat}
            onBack={() => setSelectedChat(null)}
            onChatSelect={setSelectedChat}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  marginTop: { marginTop: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  chatItem: { paddingVertical: 8 },
  sectionHeader: { marginVertical: 8 },
  chatRight: { flexDirection: "column", alignItems: "flex-end" },
  badge: { marginTop: 4 },
  chatHeader: { flexDirection: "row", alignItems: "center", padding: 8 },
  headerSpacer: { width: 48 },
  messagesList: { paddingHorizontal: 12, paddingVertical: 8 },
  messageRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-end", paddingHorizontal: 4, gap: 8 },
  myMessageRow: { alignSelf: "flex-end" },
  avatarWrapper: { alignItems: "center", justifyContent: "flex-end", marginBottom: 4, minWidth: 40 },
  avatarName: { fontSize: 10, marginBottom: 2, textAlign: "center" },
  messageAvatar: { marginHorizontal: 4 },
  messageBubble: { padding: 8, paddingHorizontal: 12, borderRadius: 16, maxWidth: 280, minWidth: 40 },
  senderName: { marginBottom: 4, fontWeight: "600" },
  messageTime: { marginTop: 4, opacity: 0.7, alignSelf: "flex-end" },
  composerContainer: { flexDirection: "row", alignItems: "flex-end", padding: 8, gap: 8, maxHeight: 57 },
  textInput: { flex: 1, maxHeight: 40 },
});