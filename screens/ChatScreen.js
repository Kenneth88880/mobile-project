import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, FlatList, Alert, KeyboardAvoidingView, Platform, StyleSheet, 
         TouchableOpacity, Image, Keyboard } from "react-native";
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
const getUserID = () => CURRENT_USER_ID;

// Delete a specific chat
const deleteChat = async (chatId) => {
  try {
    const messagesSnapshot = await firestore()
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .get();

    const deleteMessagesPromises = messagesSnapshot.docs.map((msgDoc) =>
      msgDoc.ref.delete(),
    );
    await Promise.all(deleteMessagesPromises);

    await firestore().collection("chats").doc(chatId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// Report a chat with comprehensive logging
const reportChat = async (chatId, reportingUserId) => {
  try {
    const chatRef = firestore().collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      console.error("Chat not found");
      return false;
    }

    const chatData = chatDoc.data();
    const participants = chatData.participants || [];

    // 1. Get reporter's profile
    const reporterProfile = await getUserProfile(reportingUserId);

    // 2. Get all chat messages (optimized for storage)
    const messagesSnapshot = await chatRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();
    const chatLogs = messagesSnapshot.docs.map((doc) => {
      const msgData = doc.data();
      // Truncate very long messages to save storage
      const text = msgData.text || "";
      const truncatedText =
        text.length > 500 ? text.substring(0, 500) + "... [truncated]" : text;

      return {
        messageId: doc.id,
        text: truncatedText,
        senderId: msgData.user._id,
        senderName: msgData.user.name,
        createdAt: msgData.createdAt
          ? msgData.createdAt.toDate().toISOString()
          : null,
      };
    });

    // 3. Get all participant profiles (optimized for storage)
    const participantProfiles = {};
    for (const participantId of participants) {
      const profile = await getUserProfile(participantId);
      if (profile) {
        participantProfiles[participantId] = {
          userId: participantId,
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          city: profile.city,
          email: profile.email || "N/A",
          // Only store first photo URL and count (not entire array)
          firstPhoto: profile.photos?.[0] || null,
          photoCount: profile.photos?.length || 0,
          // Store tags as comma-separated string to save space
          tags: profile.tags ? profile.tags.join(", ") : "",
          description: profile.description || "",
          createdAt: profile.createdAt || null,
        };
      }
    }

    // 4. Create comprehensive report document
    const reportData = {
      // Report metadata
      reportId: `report_${Date.now()}`,
      reportedAt: firestore.FieldValue.serverTimestamp(),
      chatId: chatId,
      chatName: chatData.groupName || "Unnamed Chat",
      isGroupChat: chatData.isGroupChat || false,
      isPrivate: chatData.isPrivate || false,
      creatorID: chatData.creatorID || null,

      // Reporter information
      reporter: {
        userId: reportingUserId,
        profile: reporterProfile,
      },

      // All chat participants
      participants: participantProfiles,
      participantCount: participants.length,

      // Complete chat logs
      chatLogs: chatLogs,
      messageCount: chatLogs.length,

      // Chat metadata
      chatCreatedAt: chatData.createdAt || null,
      lastMessageTime: chatData.lastMessageTime,

      // Status
      status: "pending_review",
      reviewedAt: null,
      reviewedBy: null,
      action: null,
    };

    // 5. Save to reports collection
    await firestore().collection("reports").add(reportData);

    // 6. Flag the chat for moderation AND hide it from reporter
    const reports = chatData.reports || [];
    reports.push({
      reportedBy: reportingUserId,
      reportedAt: Date.now(),
      reason: "User reported inappropriate content",
    });

    // Hide chat from reporter (but keep them in participants to avoid permission errors)
    const hiddenFor = chatData.hiddenFor || [];
    if (!hiddenFor.includes(reportingUserId)) {
      hiddenFor.push(reportingUserId);
    }

    await chatRef.update({
      reports: reports,
      hiddenFor: hiddenFor, // Hide chat from reporter's view
      flaggedForModeration: true,
      lastReportedAt: firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Comprehensive report created for chat ${chatId}`);
    console.log(`Chat hidden from reporter`);
    return true;
  } catch (error) {
    console.error("Error reporting chat:", error);
    return false;
  }
};

// Update chat name
const updateChatName = async (chatId, newName) => {

  const currentUserId = getUserID();
  const currentChatInfo = await firestore().collection("chats").doc(chatId).get().then(doc => {
    return doc.data();
  });

  try {

    if (currentChatInfo.isPrivate) {

      if (currentUserId === currentChatInfo.creatorID) {

        await firestore().collection("chats").doc(chatId).update({
          curUserName: newName,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        return true;

      } else {

        await firestore().collection("chats").doc(chatId).update({
          otherUserName: newName,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        return true;

        
        
      }

    } else {

      await firestore().collection("chats").doc(chatId).update({
        groupName: newName,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      return true;

    }

  } catch (error) {
    console.error("Error updating chat name:", error);
    return false;
  }
};

// Upload image to Firebase Storage and return URL
const uploadImageToStorage = async (imageUri, chatId) => {
  try {
    const filename = `chat_profile_pictures/${chatId}_${Date.now()}.jpg`;
    const reference = storage().ref(filename);

    await reference.putFile(imageUri);
    const downloadURL = await reference.getDownloadURL();

    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Update chat picture
const updateChatPicture = async (chatId, imageUri) => {
  try {
    // Upload image to Firebase Storage
    const downloadURL = await uploadImageToStorage(imageUri, chatId);

    // Update Firestore with the download URL
    await firestore().collection("chats").doc(chatId).update({
      groupPhoto: downloadURL,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error updating chat picture:", error);
    return false;
  }
};

// Chat List Component
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

            // Skip chats that are hidden for this user
            if (data.hiddenFor && data.hiddenFor.includes(currentUserId)) {
              return; // Skip this chat
            }

            // Database already filters by participant via .where() clause
            const chat = {
              id: docSnap.id,
              ...data,
            };

            // Separate active and archived chats
            if (data.status === "archived") {
              archivedChatsList.push(chat);
            } else {
              activeChatsList.push(chat);
            }
          });

          // Sort both lists by last message time
          const sortChats = (chatsList) => {
            return chatsList.sort((a, b) => {
              const aTime = a.lastMessageTime?.seconds || 0;
              const bTime = b.lastMessageTime?.seconds || 0;
              return bTime - aTime;
            });
          };

          setChats(sortChats(activeChatsList));
          setArchivedChats(sortChats(archivedChatsList));
          setLoading(false);
        },
        (error) => {
          console.error("Error loading chats:", error);
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, [currentUserId]);

  const formatTimeStamp = (timestamp) => {
    if (!timestamp) return "";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
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
    const randomMessage =
      congratsMessages[Math.floor(Math.random() * congratsMessages.length)];

    Alert.alert("Everyone Met!", randomMessage, [
      {
        text: "Thanks!",
        onPress: async () => {
          const success = await deleteChat(chatId);
          if (!success) Alert.alert("Error", "Failed to close chat");
        },
      },
    ]);
  };

  const handleUnmatchDuo = (chatId, chatName) => {
    Alert.alert(
      "Unmatch Duo",
      `Are you sure you want to unmatch with "${chatName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: async () => {
            const success = await deleteChat(chatId);
            if (success) {
              Alert.alert("Unmatched", "You have been unmatched");
            } else {
              Alert.alert("Error", "Failed to unmatch");
            }
          },
        },
      ],
    );
  };

  const handleReport = (chatId, chatName) => {
    Alert.alert(
      "Report Chat",
      `Report "${chatName}" for inappropriate content?\n\nThis will:\n• Collect all chat messages\n• Log all participant profiles\n• Flag for moderation review\n• Hide this chat from your view`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => {
            // Use setTimeout to avoid async in Alert.alert onPress (can cause iOS crashes)
            setTimeout(async () => {
              try {
                console.log("Submitting report for chat:", chatId);

                // Small delay to let React finish any pending updates
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Submit the report
                const success = await reportChat(chatId, currentUserId);

                console.log("Report submission result:", success);

                // Wait before showing next alert to avoid nested alert issues on iOS
                setTimeout(() => {
                  if (success) {
                    Alert.alert(
                      "Report Submitted",
                      "Thank you. Our moderation team will review this chat within 24 hours. The chat has been hidden from your view.",
                    );
                  } else {
                    Alert.alert(
                      "Error",
                      "Failed to submit report. Please try again.",
                    );
                  }
                }, 300);
              } catch (error) {
                console.error("Error in report flow:", error);
                setTimeout(() => {
                  Alert.alert(
                    "Error",
                    "Something went wrong. Please try again.",
                  );
                }, 300);
              }
            }, 50);
          },
        },
      ],
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
    console.log("Message type:", item.type);
    console.log("Message suggestion:", JSON.stringify(item.suggestion));
    console.log("Image URL:", item.suggestion?.imageUrl);
    return (
      <List.Item
        title={item.isGroupChat ? item.groupName || "Chat" : item.isPrivate ? item.curUserName || "Private Chat" : "Chat"}
        titleStyle={
          unreadCount > 0 && !isArchived
            ? { fontWeight: "bold", color: theme.colors.onSurface }
            : {}
        }
        description={
          isArchived
            ? "🗄️ Archived - Read only"
            : item.lastMessageText || "No messages yet"
        }
        descriptionNumberOfLines={1}
        left={() =>
          (isGroup) ? (
            item.groupPhoto ? (
              <Avatar.Image
                size={48}
                source={{ uri: item.groupPhoto }}
                style={isArchived && { opacity: 0.6 }}
              />
            ) : (
              <Avatar.Icon
                size={48}
                icon="account-group"
                style={isArchived && { opacity: 0.6 }}
              />
            )
          ) : (isPrivate) ? (
            <Avatar.Image
              size={48}
              source={{ uri: currentUserId === item.creatorID ? item.curPhoto : item.otherPhoto }}
              style={isArchived && { opacity: 0.6 }}
            />
          ) : (

            <Avatar.Icon
                size={48}
                icon="account-group"
                style={isArchived && { opacity: 0.6 }}
              />
          )
        }
        right={() => (
          <View style={styles.chatRight}>
            {timestamp && (
              <Text
                variant="bodySmall"
                style={[{ marginBottom: 4 }, isArchived && { opacity: 0.6 }]}
              >
                {timestamp}
              </Text>
            )}
            {unreadCount > 0 && !isArchived && (
              <Badge style={styles.badge}>{unreadCount}</Badge>
            )}
            <IconButton
              icon="dots-vertical"
              size={20}
              onPress={() => showChatOptions(item.id, item.groupName || "Chat", item.isPrivate || false)}
            />
          </View>
        )}
        onPress={() => onChatSelect(item)}
        style={[
          styles.chatItem,
          isArchived && {
            opacity: 0.7,
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      />
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Surface style={styles.header} elevation={2}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon source="message" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium">Messages</Text>
          </View>
        </Surface>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Surface style={styles.header} elevation={2}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon source="message" size={28} color={theme.colors.primary} />
          <Text variant="headlineMedium">Messages</Text>
        </View>
      </Surface>

      {chats.length === 0 && archivedChats.length === 0 ? (
        <EmptyState
          icon="message"
          title="No Messages Yet"
          message="When you match with duos, you'll be able to message them here!"
        />
      ) : (
        <FlatList
          data={[
            ...chats,
            ...(archivedChats.length > 0
              ? [{ id: "archived-header", isHeader: true }]
              : []),
            ...archivedChats,
          ]}
          renderItem={({ item }) => {
            if (item.isHeader) {
              return (
                <View style={styles.sectionHeader}>
                  <Divider />
                  <Text
                    variant="titleSmall"
                    style={{
                      padding: 12,
                      paddingLeft: 16,
                      color: theme.colors.onSurfaceVariant,
                      fontWeight: "600",
                    }}
                  >
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

      {/* Chat Options Dialog */}
      <Portal>
        <Dialog visible={chatOptionsVisible} onDismiss={hideChatOptions}>
          
          <Dialog.Title>Chat Options</Dialog.Title>
            <Dialog.Content>
              {!selectedChatIsPrivate && (
                <>
                  <Button
                    mode="contained-tonal"
                    onPress={() => {
                      hideChatOptions();
                      handleEveryoneMet(selectedChatId);
                    }}
                    style={{ marginBottom: 12 }}
                  >
                    EVERYONE MET
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      hideChatOptions();
                      handleUnmatchDuo(selectedChatId, selectedChatName);
                    }}
                    style={{ marginBottom: 12 }}
                    buttonColor={theme.colors.errorContainer}
                    textColor={theme.colors.error}
                  >
                    UNMATCH DUO
                  </Button>
                </>
              )}
              <Button
                mode="outlined"
                onPress={() => {
                  hideChatOptions();
                  handleReport(selectedChatId, selectedChatName);
                }}
                buttonColor={theme.colors.errorContainer}
                textColor={theme.colors.error}
              >
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

function SwipeableMessageRight({ children, onSwipe }) {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX([10, 999])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      if (e.translationX > 0) {
        translateX.value = Math.min(e.translationX * 0.4, 60);
      }
    })
    .onEnd((e) => {
      if (e.translationX > 60) runOnJS(onSwipe)();
      translateX.value = withSpring(0);
    })
    .onFinalize(() => {
      translateX.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

function SwipeableMessageLeft({ children, onSwipe }) {
  const translateX = useSharedValue(0);
  const isMovingLeft = useSharedValue(false);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 999])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      isMovingLeft.value = false;
    })
    .onUpdate((e) => {
      if (e.translationX < -10) {
        isMovingLeft.value = true;
      }
      if (isMovingLeft.value && e.translationX < 0) {
        translateX.value = Math.max(e.translationX * 0.4, -60);
      }
    })
    .onEnd((e) => {
      if (isMovingLeft.value && e.translationX < -60) runOnJS(onSwipe)();
      translateX.value = withSpring(0);
      isMovingLeft.value = false;
    })
    .onFinalize(() => {
      translateX.value = withSpring(0);
      isMovingLeft.value = false;
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

// Individual Chat Screen Component
function IndividualChatScreen({ chat, onBack }) {
  const theme = useTheme();
  const currentUserId = getUserID();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [userProfiles, setUserProfiles] = useState({});
  const [showParticipants, setShowParticipants] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [profileImageIndex, setProfileImageIndex] = useState(0);
  const [uploadingChatImage, setuploadingChatImage] = useState(false);

  // New states for editing group info
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [currentChat, setCurrentChat] = useState(chat);
  const [replyingTo, setReplyingTo] = useState(null);
  const flatListRef = useRef(null);
  const itemHeightsRef = useRef({});

  const translateX = useSharedValue(0);

  const screenWidth = require('react-native').Dimensions.get('window').width;

  const panGestureRef = useRef(null);

  const panGesture = Gesture.Pan()
    .withRef(panGestureRef)
    .activeOffsetX([40, 999])   
    .failOffsetY([-5, 5]) 
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX * 0.4;
      }
    })
    .onEnd((event) => {
      if (event.translationX > 80) {
        translateX.value = withSpring(500);
        runOnJS(onBack)();
      } else {
        translateX.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      translateX.value = withSpring(0);
    });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

  // Store unsubscribe functions to prevent crashes when reporting
  const unsubscribersRef = useRef({
    messages: null,
    chat: null,
  });
  // to see and leave average rating
  const [viewingProfileRating, setViewingProfileRating] = useState({
    average: "0.0",
    count: 0,
  });
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // handles sending images into chats
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!chat?.id) return;

    const markAsRead = async () => {
      try {
        await firestore()
          .collection("chats")
          .doc(chat.id)
          .update({
            [`unreadCount.${currentUserId}`]: 0,
          });
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    };

    markAsRead();

    const unsubscribe = firestore()
      .collection("chats")
      .doc(chat.id)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          const messagesList = snapshot.docs.map((doc) => {
            const data = doc.data();
            console.log("Raw message data:", JSON.stringify(data)); // ← add this
            console.log("message replyTo:", data.replyTo);
            return {
              _id: doc.id,
              text: data.text,
              imageUrl: data.imageUrl,
              type: data.type,
              suggestion: data.suggestion,
              replyTo: data.replyTo ? {
                ...data.replyTo,
                imageUrl: data.replyTo.imageUrl || null,
              } : null,
              createdAt: data.createdAt?.toDate() || new Date(),
              user: {
                _id: data.user?._id,
                name: data.user?.name,
              },
            };
          });
          setMessages(messagesList);
        },
        (error) => {
          // Handle permission errors gracefully (happens when removed from chat)
          if (error.code === "permission-denied") {
            console.log(
              "Permission denied - user removed from chat, navigating away",
            );
            onBack();
          } else {
            console.error("Error loading messages:", error);
          }
        },
      );

    // Store unsubscribe function for cleanup
    unsubscribersRef.current.messages = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribersRef.current.messages = null;
    };
  }, [chat, currentUserId]);

  useEffect(() => {
    const loadOtherUsers = async () => {
      if (!chat?.participants) return;

      const allProfiles = {};
      for (const userId of chat.participants) {
        const profile = await getUserProfile(userId);
        if (profile) {
          allProfiles[userId] = { id: userId, ...profile };
        }
      }

      setUserProfiles(allProfiles);
    };

    loadOtherUsers();
  }, [chat]);

  // Listen for chat updates
  useEffect(() => {
    if (!chat?.id) return;

    const unsubscribe = firestore()
      .collection("chats")
      .doc(chat.id)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setCurrentChat({ id: doc.id, ...doc.data() });
          }
        },
        (error) => {
          // Handle permission errors gracefully (happens when removed from chat)
          if (error.code === "permission-denied") {
            console.log(
              "Permission denied - user removed from chat, navigating away",
            );
            onBack();
          } else {
            console.error("Error loading chat:", error);
          }
        },
      );

    // Store unsubscribe function for cleanup
    unsubscribersRef.current.chat = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribersRef.current.chat = null;
    };
  }, [chat?.id]);

  // Cleanup all listeners - call this before reporting to prevent crashes
  const cleanupListeners = useCallback(() => {
    console.log("Cleaning up all listeners before report...");

    if (unsubscribersRef.current.messages) {
      unsubscribersRef.current.messages();
      unsubscribersRef.current.messages = null;
    }

    if (unsubscribersRef.current.chat) {
      unsubscribersRef.current.chat();
      unsubscribersRef.current.chat = null;
    }
  }, []);

  const handleEditGroupInfo = () => {
    
    // console.log("Current chat data for editing:", currentChat);
    if (currentChat.isPrivate) {

      // console.log("Editing private chat name, current user ID:", currentUserId === currentChat.creatorID);
      if (currentUserId === currentChat.creatorID) {

        // console.log("hello im here");
        setEditingName(currentChat.curUserName || "");

      } else {

        setEditingName(currentChat.otherUserName || "");

      }

    } else {

      setEditingName(currentChat.groupName || "");

    }

    setShowEditModal(true);
  };

  const handleSaveGroupName = async () => {
    if (!editingName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    Keyboard.dismiss();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const success = await updateChatName(chat.id, editingName.trim());
    if (success) {
      setShowEditModal(false);
      Alert.alert("Success", "Name updated!");
    } else {
      Alert.alert("Error", "Failed to update name");
    }
  };

  const handleChangeGroupPicture = async () => {
    try {
      launchImageLibrary(
        {
          mediaType: "photo",
          quality: 0.8,
          maxWidth: 1000,
          maxHeight: 1000,
        },
        async (response) => {
          if (response.didCancel) {
            console.log("User cancelled image picker");
            return;
          }

          if (response.errorCode) {
            console.log("ImagePicker Error: ", response.errorMessage);
            Alert.alert("Error", "Failed to select image");
            return;
          }

          if (response.assets && response.assets[0]) {
            const imageUri = response.assets[0].uri;
            console.log("Selected image URI:", imageUri);

            setuploadingChatImage(true);

            const success = await updateChatPicture(chat.id, imageUri);

            setuploadingChatImage(false);

            if (success) {
              Alert.alert("Success", "Group picture updated!");
            } else {
              Alert.alert("Error", "Failed to update group picture");
            }
          }
        },
      );
    } catch (error) {
      console.error("Error in handleChangeGroupPicture:", error);
      setuploadingChatImage(false);
      Alert.alert("Error", "An error occurred while selecting the image");
    }
  };

  const handleProfilePicturePress = async (userId) => {
    const profile = userProfiles[userId];
    if (!profile) return;

    // Reset rating state before loading new profile
    setUserRating(0);
    setHasRated(false);
    setViewingProfileRating({ average: "0.0", count: 0 });

    setViewingProfile(profile);
    setProfileImageIndex(0);

    await loadProfileRating(userId);
  };

  const handleParticipantPress = async (profile) => {
    // Reset rating state
    setUserRating(0);
    setHasRated(false);
    setViewingProfileRating({ average: "0.0", count: 0 });

    setViewingProfile(profile);
    setProfileImageIndex(0);
    setShowParticipants(false);

    await loadProfileRating(profile.id);
  };

  const loadProfileRating = async (userId) => {
    try {
      // Reset first to avoid leakage
      setUserRating(0);
      setHasRated(false);
      setViewingProfileRating({ average: "0.0", count: 0 });

      const ratingData = await getAverageRating(userId);
      setViewingProfileRating(ratingData);

      const existingRatingSnap = await firestore()
        .collection("ratings")
        .where("fromUserId", "==", currentUserId)
        .where("toUserId", "==", userId)
        .limit(1)
        .get();

      if (!existingRatingSnap.empty) {
        const ratingDoc = existingRatingSnap.docs[0];
        setUserRating(ratingDoc.data().rating);
        setHasRated(true);
      }
    } catch (error) {
      console.error("Error loading rating:", error);
    }
  };

 const handleReplyBubbleTap = (replyTo) => {
  // Match by messageId first, fall back to imageUrl for old messages
    const index = messages.findIndex((m) => 
      replyTo.messageId 
        ? m._id === replyTo.messageId
        : replyTo.imageUrl 
          ? m.imageUrl === replyTo.imageUrl
          : m.text === replyTo.text
    );

    if (index === -1 || !flatListRef.current) return;

    let offsetFromBottom = 0;
    for (let i = 0; i < index; i++) {
      offsetFromBottom += itemHeightsRef.current[messages[i]._id] || 60;
    }

    flatListRef.current.scrollToOffset({
      offset: offsetFromBottom,
      animated: true,
    });
  };

  const handleProfileImageTap = (event) => {
    if (!viewingProfile?.photos || viewingProfile.photos.length <= 1) return;

    const { locationX } = event.nativeEvent;
    const { width } = event.nativeEvent.target?.offsetWidth ||
      event.nativeEvent.target?.clientWidth || { width: 400 }; // fallback

    // If tapped on right side (>50%), go next; left side, go previous
    if (locationX > width / 2) {
      // Next image
      setProfileImageIndex((prev) =>
        prev === viewingProfile.photos.length - 1 ? 0 : prev + 1,
      );
    } else {
      // Previous image
      setProfileImageIndex((prev) =>
        prev === 0 ? viewingProfile.photos.length - 1 : prev - 1,
      );
    }
  };

  const createPrivateChat = async (otherUserID) => {

    try {

      const otherUser = await firestore().collection("profiles").doc(otherUserID).get();
      const otherUserName = otherUser.data().name;
      const currentUser = await firestore().collection("profiles").doc(currentUserId).get();
      const currentUserName = currentUser.data().name;

      console.log("Other user data: ", otherUserName);

      // prevents duplicate private dms by checking before
      const existing = await firestore()
      .collection("chats")
      .where("participants", "array-contains", currentUserId)
      .where("isPrivate", "==", true)
      .get();

      const existingDM = existing.docs.find((doc) =>
        doc.data().participants.includes(otherUserID)
      );

      if (existingDM) {
        // Just return the existing chat instead of creating a new one
        Alert.alert("Chat Exists", "A private chat with this user already exists. Opening existing chat.");
        return { id: existingDM.id, ...existingDM.data() };
      }

      const chatData = {
        participants: [currentUserId, otherUserID],
        curUserName: otherUserName || "Private Chat",
        otherUserName: currentUserName || "Private Chat", 
        curPhoto: otherUser.data().photos?.[0] || null,
        otherPhoto: currentUser.data().photos?.[0] || null,
        isGroupChat: false,
        isPrivate: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastMessage: "",
        creatorID: currentUserId,
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        type: "private",
      };

      const chatRef = await firestore().collection("chats").add(chatData);
      console.log("Private chat created with ID:", chatRef.id);
      // Close the profile modal
      setViewingProfile(null);

      return { id: chatRef.id, ...chatData };

    } catch (error) {
    
      console.error("Error creating private chat:", error);
      Alert.alert("Error", "Failed to create private chat");
    
    } 

  }

  const handleCreatePrivateChat = async (otherUserID) => {
    const newChat = await createPrivateChat(otherUserID);
    if (newChat) {
      setViewingProfile(null);       // close profile modal
      onChatSelect(newChat);         // navigate straight into the new DM
    }
  };

  // Submit or update rating
  const handleSubmitRating = async (userId, rating) => {
    if (rating === 0) {
      Alert.alert("Invalid Rating", "Please select a rating between 1-5 stars");
      return;
    }

    if (userId === currentUserId) {
      Alert.alert("Error", "You cannot rate yourself");
      return;
    }

    setSubmittingRating(true);

    try {
      // Check if user has already rated
      const existingRating = await firestore()
        .collection("ratings")
        .where("fromUserId", "==", currentUserId)
        .where("toUserId", "==", userId)
        .get();

      if (!existingRating.empty) {
        // Update existing rating
        const ratingDoc = existingRating.docs[0];
        await firestore().collection("ratings").doc(ratingDoc.id).update({
          rating: rating,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        Alert.alert("Success", "Your rating has been updated!");
      } else {
        // Create new rating
        await firestore().collection("ratings").add({
          fromUserId: currentUserId,
          toUserId: userId,
          rating: rating,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        Alert.alert("Success", "Thank you for your rating!");
      }

      // Reload rating data
      await loadProfileRating(userId);
      setHasRated(true);
    } catch (error) {
      console.error("Error submitting rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // Helper function to render star rating UI
  const renderStars = (rating, onPress = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onPress && onPress(i)}
          disabled={!onPress}
          style={{ marginHorizontal: 4 }}
        >
          <Icon
            source={i <= rating ? "star" : "star-outline"}
            size={onPress ? 36 : 20}
            color={i <= rating ? "#FFD700" : "#ddd"}
          />
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  // handles how images are sent into a group chat
  const handleSendImage = async () => {
    try {
      launchImageLibrary(
        {
          mediaType: "photo",
          quality: 0.8,
          maxWidth: 1000,
          maxHeight: 1000,
        },
        async (response) => {
          if (response.didCancel) {
            console.log("User cancelled image picker");
            return;
          }

          if (response.errorCode) {
            console.log("ImagePicker Error: ", response.errorMessage);
            Alert.alert("Error", "Failed to select image");
            return;
          }

          if (response.assets && response.assets[0]) {
            const imageUri = response.assets[0].uri;
            console.log("Selected image URI:", imageUri);

            setUploadingImage(true); // Show loading

            try {
              // Upload to Firebase Storage
              const filename = `chat_messages/${chat.id}_${Date.now()}.jpg`;
              const reference = storage().ref(filename);
              await reference.putFile(imageUri);
              const downloadURL = await reference.getDownloadURL();

              console.log("Image uploaded, URL:", downloadURL);

              // Send as message
              await firestore()
                .collection("chats")
                .doc(chat.id)
                .collection("messages")
                .add({
                  imageUrl: downloadURL,
                  text: "", // Empty text for image messages
                  createdAt: firestore.FieldValue.serverTimestamp(),
                  user: {
                    _id: currentUserId,
                    name: "You",
                  },
                });

              console.log("Message added to Firestore");

              // Update chat
              const unreadUpdate = {};
              if (chat.participants) {
                chat.participants.forEach((participantId) => {
                  if (participantId !== currentUserId) {
                    unreadUpdate[`unreadCount.${participantId}`] =
                      (chat.unreadCount?.[participantId] || 0) + 1;
                  }
                });
              }

              await firestore()
                .collection("chats")
                .doc(chat.id)
                .update({
                  lastMessageText: "📷 Image",
                  lastMessageTime: firestore.FieldValue.serverTimestamp(),
                  ...unreadUpdate,
                });

              console.log("Chat updated successfully");
              setUploadingImage(false);
            } catch (uploadError) {
              console.error("Upload error:", uploadError);
              Alert.alert("Error", "Failed to upload image");
              setUploadingImage(false);
            }
          }
        },
      );
    } catch (error) {
      console.error("Error sending image:", error);
      Alert.alert("Error", "Failed to send image");
      setUploadingImage(false);
    }
  };

  const onSend = useCallback(async () => {
    if (!chat?.id || !inputText.trim()) return;

    // Prevent sending messages in archived chats
    if (currentChat.status === "archived") {
      Alert.alert(
        "Chat Archived",
        "This chat is archived and read-only. You cannot send new messages.",
      );
      return;
    }

    try {
      await firestore()
        .collection("chats")
        .doc(chat.id)
        .collection("messages")
        .add({
          text: inputText.trim(),
          createdAt: firestore.FieldValue.serverTimestamp(),
          user: { _id: currentUserId, name: "You" },
          ...(replyingTo && {
            replyTo: {
              text: replyingTo.text || "📷 Image",
              senderName: userProfiles[replyingTo.user._id]?.name || "Someone",
              senderId: replyingTo.user._id,
              messageId: replyingTo._id,
              imageUrl: replyingTo.imageUrl || null,  // ✅ add fallback
            }
          }),
        });

      console.log("replyingTo object:", JSON.stringify(replyingTo));
      console.log("messageId being saved:", replyingTo?._id);
      console.log("Sending with replyTo:", replyingTo ? { text: replyingTo.text, senderName: userProfiles[replyingTo.user._id]?.name } : null);
      setReplyingTo(null); // clear after send
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

      const unreadUpdate = {};
      if (chat.participants) {
        chat.participants.forEach((participantId) => {
          if (participantId !== currentUserId) {
            unreadUpdate[`unreadCount.${participantId}`] =
              (chat.unreadCount?.[participantId] || 0) + 1;
          }
        });
      }

      await firestore()
        .collection("chats")
        .doc(chat.id)
        .update({
          lastMessageText: inputText.trim(),
          lastMessageTime: firestore.FieldValue.serverTimestamp(),
          ...unreadUpdate,
        });

      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }, [chat, currentUserId, inputText, currentChat.status]);

  if (!chat) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text>No chat selected</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>

        {/* ✅ FIX: disabled when edit modal is open to prevent message bar jumping */}
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: theme.colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 40}
          enabled={!showEditModal}
        >
          <Surface style={styles.chatHeader} elevation={2}>
            <IconButton icon="arrow-left" onPress={onBack} />

            {/* Group photo - tappable to change */}
            
            {(currentChat.isGroupChat || !currentChat.isPrivate) && (
              <TouchableOpacity
                onPress={handleChangeGroupPicture}
                disabled={uploadingChatImage || currentChat.status === "archived"}
                style={{ marginRight: 8 }}
              >
                {uploadingChatImage ? (
                  <View style={styles.avatarContainer}>
                    <ActivityIndicator size={36} />
                  </View>
                ) : currentChat.groupPhoto ? (
                  <Avatar.Image
                    size={36}
                    source={{ uri: currentChat.groupPhoto }}
                  />
                ) : (
                  <Avatar.Icon size={36} icon="account-group" />
                )}
              </TouchableOpacity>
            )}

            {(!currentChat.isGroupChat && currentChat.isPrivate) && (
              <Surface style={{ marginRight: 8 }}>
                <Avatar.Image
              
                    size={36}
                    source={{ uri: currentUserId === currentChat.creatorID ? currentChat.curPhoto : currentChat.otherPhoto }}

                />
              </Surface>
              
            )}

            {/* Group name - tappable to edit */}
            <TouchableOpacity
              onPress={
                (currentChat.isGroupChat || currentChat.isPrivate) && currentChat.status !== "archived"
                  ? handleEditGroupInfo
                  : undefined
              }
              style={{ flex: 1, flexDirection: "column", alignItems: "flex-start" }}
              disabled={
                (!currentChat.isGroupChat && !currentChat.isPrivate) || currentChat.status === "archived"
              }
            >
              <Text variant="titleLarge">
                {currentChat.isGroupChat ? currentChat.groupName || "Chat" : ""}
                {currentChat.isPrivate ? currentChat.creatorID === currentUserId ? currentChat.curUserName || "Private Chat" : currentChat.otherUserName || "Private Chat" : ""} </Text>
                {currentChat.status === "archived" && (
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.error, marginTop: 2 }}
                >
                  🗄️ Archived - Read Only
                </Text>
              )}
            </TouchableOpacity>

            <IconButton
              icon="account-multiple"
              onPress={() => setShowParticipants(true)}
              tooltip="View Participants"
            />
          </Surface>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => {
            const isMyMessage = item.user._id === currentUserId;
            const senderProfile = userProfiles[item.user._id];
            const isLatestMessage = index === 0;

            if (isMyMessage) {
              return (
                <View
                  style={[styles.messageRow, styles.myMessageRow]}
                  onLayout={(e) => {
                    itemHeightsRef.current[item._id] = e.nativeEvent.layout.height;
                  }}
                >
                  <SwipeableMessageLeft onSwipe={() => setReplyingTo(item)}>
                    <View style={{ alignItems: "flex-end" }}>

                      {item.text && !item.imageUrl && item.type !== "place_suggestion" && (
                        <View style={{ alignItems: "flex-end" }}>
                          {item.replyTo && (
                            <TouchableOpacity onPress={() => handleReplyBubbleTap(item.replyTo)}>
                              <View style={{
                                backgroundColor: theme.colors.primary,
                                opacity: 0.6,
                                borderRadius: 12,
                                borderBottomRightRadius: 2,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                maxWidth: 240,
                                marginBottom: 2,
                                marginRight: 8,
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff", marginBottom: 2 }}>
                                  {item.replyTo.senderName}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#fff" }} numberOfLines={1}>
                                  {item.replyTo.text}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          )}
                          <Surface
                            style={[styles.messageBubble, {
                              backgroundColor: theme.colors.primaryContainer,
                              borderBottomRightRadius: 4,
                              borderBottomLeftRadius: 16,
                              zIndex: 1,
                            }]}
                            elevation={1}
                          >
                            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                              {item.text}
                            </Text>
                          </Surface>
                        </View>
                      )}

                      {item.imageUrl && (
                        <Surface>
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={{ width: 200, height: 200, borderRadius: 12, marginLeft: -1 }}
                            resizeMode="cover"
                          />
                        </Surface>
                      )}

                      {item.type === "place_suggestion" && item.suggestion && (
                        <Surface
                          style={[styles.messageBubble, {
                            backgroundColor: theme.colors.primaryContainer,
                            borderBottomRightRadius: 4,
                            borderBottomLeftRadius: 16,
                            padding: 0,
                            overflow: "hidden",
                            maxWidth: 240,
                          }]}
                          elevation={1}
                        >
                          {item.suggestion.imageUrl ? (
                            <Image
                              source={{ uri: item.suggestion.imageUrl }}
                              style={{ width: 240, height: 130, marginLeft: -12 }}
                              resizeMode="cover"
                            />
                          ) : null}
                          <View style={{ padding: 10 }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary, marginBottom: 3 }}>
                              📅 Date Suggestion
                            </Text>
                            <Text style={{ fontWeight: "700", fontSize: 14, color: theme.colors.onSurface }} numberOfLines={1}>
                              {item.suggestion.place}
                            </Text>
                            {item.suggestion.category ? (
                              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 1 }}>
                                {item.suggestion.category}
                              </Text>
                            ) : null}
                            {item.suggestion.address ? (
                              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={2}>
                                📌 {item.suggestion.address}
                              </Text>
                            ) : null}
                          </View>
                        </Surface>
                      )}

                      {isLatestMessage && (
                        <Text variant="labelSmall" style={[styles.messageTime, { color: theme.colors.onPrimaryContainer }]}>
                          {item.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      )}

                    </View>
                  </SwipeableMessageLeft>

                  {userProfiles[currentUserId] && (
                    <View style={styles.avatarWrapper}>
                      <Text variant="labelSmall" style={styles.avatarName}>
                        {userProfiles[currentUserId].name || "You"}
                      </Text>
                      <TouchableOpacity onPress={() => handleProfilePicturePress(currentUserId)}>
                        <ProfilePhoto uri={userProfiles[currentUserId].photos?.[0]} size={32} style={styles.messageAvatar} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }

            return (
              <View
                style={[styles.messageRow]}
                onLayout={(e) => {
                  itemHeightsRef.current[item._id] = e.nativeEvent.layout.height;
                }}
              >
                <View style={styles.avatarWrapper}>
                  <Text variant="labelSmall" style={styles.avatarName}>
                    {senderProfile?.name || "Unknown"}
                  </Text>
                  <TouchableOpacity onPress={() => handleProfilePicturePress(item.user._id)}>
                    <ProfilePhoto uri={senderProfile?.photos?.[0]} size={32} style={styles.messageAvatar} />
                  </TouchableOpacity>
                </View>

                <SwipeableMessageRight onSwipe={() => setReplyingTo(item)}>
                  <View style={{ alignItems: "flex-start", marginLeft: 0 }}>

                    {item.text && !item.imageUrl && item.type !== "place_suggestion" && (
                      <View style={{ alignItems: "flex-start" }}>
                        {item.replyTo && (
                          <TouchableOpacity onPress={() => handleReplyBubbleTap(item.replyTo)}>
                            <View style={{
                              backgroundColor: theme.colors.onSurfaceVariant,
                              opacity: 0.6,
                              borderRadius: 12,
                              borderBottomLeftRadius: 2,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              maxWidth: 240,
                              marginBottom: 2,
                              marginLeft: 8,
                              borderLeftWidth: 3,
                              borderLeftColor: theme.colors.primary,
                            }}>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary, marginBottom: 2 }}>
                                {item.replyTo.senderName}
                              </Text>
                              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                                {item.replyTo.text}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        <Surface
                          style={[styles.messageBubble, {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderBottomRightRadius: 16,
                            borderBottomLeftRadius: 4,
                            zIndex: 1,
                          }]}
                          elevation={1}
                        >
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            {item.text}
                          </Text>
                        </Surface>
                      </View>
                    )}

                    {item.imageUrl && (
                      <Surface>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={{ width: 200, height: 200, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      </Surface>
                    )}

                    {item.type === "place_suggestion" && item.suggestion && (
                      <Surface
                        style={[styles.messageBubble, {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderBottomRightRadius: 16,
                          borderBottomLeftRadius: 4,
                          padding: 0,
                          overflow: "hidden",
                          maxWidth: 240,
                          marginLeft: 0,    
                          paddingLeft: 0,   
                        }]}
                        elevation={1}
                      >
                        {item.suggestion.imageUrl ? (
                          <Image
                            source={{ uri: item.suggestion.imageUrl }}
                            style={{ width: 240, height: 130 }}
                            resizeMode="cover"
                          />
                        ) : null}
                        <View style={{ padding: 10 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary, marginBottom: 3 }}>
                            📅 Date Suggestion
                          </Text>
                          <Text style={{ fontWeight: "700", fontSize: 14, color: theme.colors.onSurface }} numberOfLines={1}>
                            {item.suggestion.place}
                          </Text>
                          {item.suggestion.category ? (
                            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 1 }}>
                              {item.suggestion.category}
                            </Text>
                          ) : null}
                          {item.suggestion.address ? (
                            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={2}>
                              📌 {item.suggestion.address}
                            </Text>
                          ) : null}
                        </View>
                      </Surface>
                    )}

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
            keyExtractor={(item) => item._id}
            inverted
            contentContainerStyle={styles.messagesList}
          />

          <Surface
            style={{
              backgroundColor: theme.colors.background,
              borderTopColor: "transparent",
              borderColor: "transparent",
            }}
            elevation={0}
          >
            {/* Reply preview bar */}
            {replyingTo && (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 0,
                paddingVertical: 6,
                backgroundColor: theme.colors.surfaceVariant,
                borderLeftWidth: 3,
                borderLeftColor: theme.colors.primary,
              }}>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    Replying to {userProfiles[replyingTo.user._id]?.name || "Someone"}
                  </Text>
                  <Text variant="bodySmall" numberOfLines={1}>
                    {replyingTo.text || "📷 Image"}
                  </Text>
                </View>
                <IconButton icon="close" size={16} onPress={() => setReplyingTo(null)} />
              </View>
            )}

            {/* Input row */}
            {currentChat.status === "archived" ? (
              <View
                style={{
                  padding: 12,
                  backgroundColor: theme.colors.surfaceVariant,
                  alignItems: "center",
                }}
              >
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  🗄️ This chat is archived and read-only
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder=" Type a message..."
                  multiline
                  maxLength={1000}
                  style={[
                    styles.textInput,
                    {
                      borderRadius: 30,
                      borderTopLeftRadius: 30,
                      borderTopRightRadius: 30,
                      borderWidth: 0,
                      borderColor: "transparent",
                    },
                  ]}
                  dense
                  autoCorrect={true}
                  autoCapitalize="sentences"
                  spellCheck={true}
                  textContentType="none"
                  contentStyle={{ justifyContent: "center" }}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  cursorColor="#000000"
                />
                <IconButton
                  style={{
                    position: "absolute",
                    right: 35,
                    marginLeft: 0,
                    backgroundColor: "transparent",
                  }}
                  icon="image"
                  size={24}
                  onPress={handleSendImage}
                />
                <IconButton
                  style={{
                    position: "absolute",
                    right: 5,
                    marginLeft: 0,
                    backgroundColor: "transparent",
                  }}
                  icon="send"
                  mode="contained"
                  onPress={onSend}
                  disabled={!inputText.trim()}
                  size={20}
                />
              </View>
            )}
          </Surface>

          {/* Edit Group Info Modal */}
          <Portal>
            <Modal
              visible={showEditModal}
              onDismiss={() => setShowEditModal(false)}
              contentContainerStyle={{
                backgroundColor: theme.colors.background,
                padding: 20,
                margin: 20,
                borderRadius: 8,
              }}
            >
              {(!currentChat.isPrivate) && (
              <Card>
                <Card.Title title="Edit Group Info" />
                <Card.Content>
                  <TouchableOpacity
                    onPress={handleChangeGroupPicture}
                    disabled={uploadingChatImage}
                    style={{ alignItems: "center", marginBottom: 16 }}
                  >
                    {uploadingChatImage ? (
                      <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" />
                      </View>
                    ) : currentChat.groupPhoto ? (
                      <Avatar.Image
                        size={80}
                        source={{ uri: currentChat.groupPhoto }}
                      />
                    ) : (
                      <Avatar.Icon size={80} icon="account-group" />
                    )}
                    <Text
                      variant="labelLarge"
                      style={{
                        marginTop: 8,
                        color: uploadingChatImage ? "#999" : theme.colors.primary,
                      }}
                    >
                      {uploadingChatImage 
                        ? "Uploading..."
                        : "Tap to Change Picture"}
                    </Text>
                  </TouchableOpacity>

                  <TextInput
                    mode="outlined"
                    label="Group Name"
                    value={editingName}
                    onChangeText={setEditingName}
                    maxLength={50}
                    style={{ marginTop: 8 }}
                  />
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => setShowEditModal(false)}>Cancel</Button>
                  <Button onPress={handleSaveGroupName}>Save</Button>
                </Card.Actions>
              </Card>
              )}

              {(currentChat.isPrivate) && (
                
                <Card>
                <Card.Title title="DM Name" />
                <Card.Content>
                  <TextInput
                    mode="outlined"
                    label="Name"
                    value={editingName}
                    onChangeText={setEditingName}
                    maxLength={50}
                    style={{ marginTop: 8 }}
                  />
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => {
                    Keyboard.dismiss();
                    
                    // avoids a crazy message bar bug
                    setTimeout(() => {setShowEditModal(false)}, 150);
                  }}>Cancel</Button>
                  <Button onPress={handleSaveGroupName}>Save</Button>
                </Card.Actions>
              </Card>
            )}

            </Modal>
          </Portal>

          {/* Participants Modal */}
          <Portal>
            <Modal
              visible={showParticipants}
              onDismiss={() => setShowParticipants(false)}
              contentContainerStyle={{
                backgroundColor: theme.colors.background,
                padding: 20,
                margin: 20,
                borderRadius: 8,
              }}
            >
              <Card>
                <Card.Title title="Chat Participants" />
                <Card.Content>
                  <Text
                    variant="bodySmall"
                    style={{ marginBottom: 12, fontStyle: "italic", opacity: 0.7 }}
                  >
                    Tap on a participant to view their full profile
                  </Text>
                  {chat.participants && chat.participants.length > 0 ? (
                    chat.participants.map((participantId) => {
                      const profile = userProfiles[participantId];
                      if (!profile) return null;

                      return (
                        <List.Item
                          key={participantId}
                          title={profile.name || "Unknown"}
                          description={profile.city || "No location"}
                          left={() => (
                            <ProfilePhoto uri={profile.photos?.[0]} size={48} />
                          )}
                          style={{ paddingVertical: 8 }}
                          onPress={() => handleParticipantPress(profile)}
                        />
                      );
                    })
                  ) : (
                    <Text>No participants found</Text>
                  )}
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => setShowParticipants(false)}>Close</Button>
                </Card.Actions>
              </Card>
            </Modal>
          </Portal>

          {/* Profile Viewing Modal */}
          <Portal>
            <Modal
              visible={viewingProfile !== null}
              onDismiss={() => {
                setViewingProfile(null);
                setProfileImageIndex(0);
                setUserRating(0);
                setHasRated(false);
              }}
              contentContainerStyle={{
                backgroundColor: theme.colors.background,
                margin: 20,
                borderRadius: 8,
                maxHeight: "90%",
              }}
            >
              {viewingProfile && (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.outline,
                    }}
                  >
                    <Text variant="titleLarge">
                      {viewingProfile.name}'s Profile
                    </Text>
                    <IconButton
                      icon="close"
                      onPress={() => {
                        setViewingProfile(null);
                        setProfileImageIndex(0);
                        setUserRating(0);
                        setHasRated(false);
                      }}
                    />
                  </View>

                  <View style={{ maxHeight: 600 }}>
                    <FlatList
                      data={[{ key: "profile" }]}
                      renderItem={() => (

                        
                        <View style={{ padding: 16 }}>
                          {viewingProfile.photos &&
                          viewingProfile.photos.length > 0 ? (
                            <Card style={{ marginBottom: 16 }}>
                              <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={handleProfileImageTap}
                              >
                                <Card.Cover
                                  source={{
                                    uri: viewingProfile.photos[profileImageIndex],
                                  }}
                                  style={{ height: 300 }}
                                />
                                {viewingProfile.photos.length > 1 && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      bottom: 16,
                                      left: 0,
                                      right: 0,
                                      flexDirection: "row",
                                      justifyContent: "center",
                                      gap: 8,
                                    }}
                                  >
                                    {viewingProfile.photos.map((_, index) => (
                                      <View
                                        key={index}
                                        style={{
                                          width:
                                            index === profileImageIndex ? 10 : 8,
                                          height:
                                            index === profileImageIndex ? 10 : 8,
                                          borderRadius:
                                            index === profileImageIndex ? 5 : 4,
                                          backgroundColor:
                                            index === profileImageIndex
                                              ? "white"
                                              : "rgba(255, 255, 255, 0.5)",
                                        }}
                                      />
                                    ))}
                                  </View>
                                )}
                              </TouchableOpacity>
                            </Card>
                          ) : (
                            <Card
                              style={{
                                marginBottom: 16,
                                height: 300,
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <Avatar.Icon size={80} icon="account" />
                              <Text style={{ marginTop: 8 }}>No photos</Text>
                            </Card>
                          )}

                          <Card style={{ marginBottom: 16 }}>
                            <Card.Content>
                              <Text variant="headlineSmall">
                                {viewingProfile.name}, {viewingProfile.age || "?"}
                              </Text>

                              {/* ⭐ NEW: Average Rating Display */}
                              <View style={{ marginTop: 12, alignItems: "center" }}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 4,
                                  }}
                                >
                                  {renderStars(
                                    parseFloat(viewingProfileRating.average),
                                  )}
                                </View>
                                <Text
                                  variant="bodySmall"
                                  style={{ color: theme.colors.onSurfaceVariant }}
                                >
                                  {viewingProfileRating.average} (
                                  {viewingProfileRating.count} rating
                                  {viewingProfileRating.count !== 1 ? "s" : ""})
                                </Text>
                              </View>

                              {viewingProfile.city && (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginTop: 12,
                                  }}
                                >
                                  <Icon source="map-marker" size={16} />
                                  <Text
                                    variant="bodyMedium"
                                    style={{ marginLeft: 4 }}
                                  >
                                    {viewingProfile.city}
                                  </Text>
                                </View>
                              )}

                              {viewingProfile.gender && (
                                <View style={{ marginTop: 12 }}>
                                  <Text
                                    variant="titleSmall"
                                    style={{ marginBottom: 4 }}
                                  >
                                    Gender
                                  </Text>
                                  <View>
                                    <Chip
                                      style={{
                                        alignSelf: "flex-start",
                                        backgroundColor:
                                          viewingProfile.gender === "male"
                                            ? "#4A90E2"
                                            : viewingProfile.gender === "female"
                                              ? "#FF69B4"
                                              : "#9B59B6",
                                      }}
                                      textStyle={{ color: "#FFFFFF" }}
                                    >
                                      {viewingProfile.gender === "male"
                                        ? "Male"
                                        : viewingProfile.gender === "female"
                                          ? "Female"
                                          : "Non-Binary"}
                                    </Chip>
                                  </View>
                                </View>
                              )}

                              {viewingProfile.description && (
                                <View style={{ marginTop: 16 }}>
                                  <Text
                                    variant="titleSmall"
                                    style={{ marginBottom: 4 }}
                                  >
                                    About
                                  </Text>
                                  <Text
                                    variant="bodyMedium"
                                    style={{ lineHeight: 22 }}
                                  >
                                    {viewingProfile.description}
                                  </Text>
                                </View>
                              )}

                              {viewingProfile.tags &&
                                viewingProfile.tags.length > 0 && (
                                  <View style={{ marginTop: 16 }}>
                                    <Text
                                      variant="titleSmall"
                                      style={{ marginBottom: 8 }}
                                    >
                                      Interests
                                    </Text>
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        gap: 8,
                                      }}
                                    >
                                      {viewingProfile.tags.map((tag, index) => (
                                        <Chip key={index} compact>
                                          {tag}
                                        </Chip>
                                      ))}
                                    </View>
                                  </View>
                                )}
                            </Card.Content>
                          </Card>

                          {viewingProfile.id !== currentUserId && (
                            <Card
                              style={{
                                marginBottom: 16,
                                backgroundColor: theme.colors.primaryContainer,
                              }}
                            >
                              <Card.Content>
                                <Text
                                  variant="titleMedium"
                                  style={{ marginBottom: 12, textAlign: "center" }}
                                >
                                  {hasRated
                                    ? "Update Your Rating"
                                    : "Rate This Person"}
                                </Text>

                                <View
                                  style={{ alignItems: "center", marginBottom: 12 }}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {renderStars(userRating, setUserRating)}
                                  </View>
                                  {userRating > 0 && (
                                    <Text
                                      variant="bodySmall"
                                      style={{ marginTop: 8, fontStyle: "italic" }}
                                    >
                                      {userRating === 1 && "Poor"}
                                      {userRating === 2 && "Fair"}
                                      {userRating === 3 && "Good"}
                                      {userRating === 4 && "Very Good"}
                                      {userRating === 5 && "Excellent"}
                                    </Text>
                                  )}
                                </View>

                                <Button
                                  mode="contained"
                                  onPress={() =>
                                    handleSubmitRating(
                                      viewingProfile.id,
                                      userRating,
                                    )
                                  }
                                  disabled={userRating === 0 || submittingRating}
                                  loading={submittingRating}
                                  icon={hasRated ? "update" : "star"}
                                >
                                  {hasRated ? "Update Rating" : "Submit Rating"}
                                </Button>

                                {hasRated && (
                                  <Text
                                    variant="bodySmall"
                                    style={{
                                      marginTop: 8,
                                      textAlign: "center",
                                      fontStyle: "italic",
                                      opacity: 0.7,
                                    }}
                                  >
                                    You previously rated this person {userRating}{" "}
                                    star{userRating !== 1 ? "s" : ""}
                                  </Text>
                                )}

                                <Text
                                  variant="bodySmall"
                                  style={{
                                    marginTop: 8,
                                    textAlign: "center",
                                    fontStyle: "italic",
                                    opacity: 0.7,
                                  }}>
                                  
                                  { /* so you can't create private DMS in a private DM */}
                                  {currentChat.isPrivate !== true && (<Button
                                    mode="contained"
                                    onPress ={() => handleCreatePrivateChat(viewingProfile.id)}>
                                    Create Private DM
                                  </Button>
                                )}
                                  
                                </Text> 
                              </Card.Content>
                            </Card>
                            
                          )}
                          

                        </View>
                      )}
                      keyExtractor={(item) => item.key}
                    />
                  </View>
                </View>
              )}
            </Modal>
          </Portal>
        </KeyboardAvoidingView>
      
      </Animated.View>
    </GestureDetector>
  );
}

export default function ChatScreen() {
  const [selectedChat, setSelectedChat] = useState(null);

  if (selectedChat) {
    return (
      <IndividualChatScreen
        chat={selectedChat}
        onBack={() => setSelectedChat(null)}
        onChatSelect={setSelectedChat}
      />
    );
  }

  return <ChatListScreen onChatSelect={setSelectedChat} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  marginTop: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  chatItem: {
    paddingVertical: 8,
  },
  sectionHeader: {
    marginVertical: 8,
  },
  chatRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  badge: {
    marginTop: 4,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  headerSpacer: {
    width: 48,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  myMessageRow: {
    alignSelf: "flex-end",
  },
  avatarWrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 4,
    minWidth: 40,
  },
  avatarName: {
    fontSize: 10,
    marginBottom: 2,
    textAlign: "center",
  },
  messageAvatar: {
    marginHorizontal: 4,
  },
  messageBubble: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    maxWidth: 280,
    minWidth: 40,
  },
  senderName: {
    marginBottom: 4,
    fontWeight: "600",
  },
  messageTime: {
    marginTop: 4,
    opacity: 0.7,
    alignSelf: "flex-end",
  },
  composerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    gap: 8,
    maxHeight: 57, // Prevent container from growing too large
  },
  textInput: {
    flex: 1,
    maxHeight: 40, // Reduced from 120 to prevent avatar cutoff
  },
});