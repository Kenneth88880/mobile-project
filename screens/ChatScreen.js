import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Image,
  Alert,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  Avatar,
  List,
  Badge,
  IconButton,
  Chip,
  Surface,
  ActivityIndicator,
  useTheme,
  Divider,
  Icon,
} from "react-native-paper";
import { db } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import {
  getUserProfile,
  saveRating,
  getCurrentDuoPartner,
  acceptDuoLike,
  deleteDuoLike,
  saveDuoSwipe,
} from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import { EmptyState, ProfilePhoto } from "../components/CommonComponents";

const getUserID = () => CURRENT_USER_ID;

// Delete a specific chat
const deleteChat = async (chatId) => {
  try {
    const messagesSnapshot = await getDocs(
      collection(db, "chats", chatId, "messages")
    );
    const deleteMessagesPromises = messagesSnapshot.docs.map((msgDoc) =>
      deleteDoc(msgDoc.ref)
    );
    await Promise.all(deleteMessagesPromises);
    await deleteDoc(doc(db, "chats", chatId));
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// Report a chat
const reportChat = async (chatId, reportingUserId) => {
  try {
    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);

    if (chatDoc.exists()) {
      const data = chatDoc.data();
      const reports = data.reports || [];
      reports.push({
        reportedBy: reportingUserId,
        reportedAt: serverTimestamp(),
        reason: "User reported inappropriate content",
      });

      const participants = data.participants || [];
      const updatedParticipants = participants.filter(
        (id) => id !== reportingUserId
      );

      await updateDoc(chatRef, {
        reports: reports,
        participants: updatedParticipants,
        flaggedForModeration: true,
        lastReportedAt: serverTimestamp(),
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error reporting chat:", error);
    return false;
  }
};

// Requests Modal Component
function RequestsModal({ visible, onClose }) {
  const theme = useTheme();
  const [duoLikes, setDuoLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDuo, setCurrentDuo] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const currentUserId = CURRENT_USER_ID;

  useEffect(() => {
    if (visible) {
      loadDuoPartner();
    }
  }, [visible]);

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
    if (!currentDuo || !visible) return;

    const likesQuery = query(
      collection(db, "duoLikes"),
      where("toDuoId", "==", currentDuo.duoId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(likesQuery, async (snapshot) => {
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
    });

    return () => unsubscribe();
  }, [currentDuo, visible]);

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

  const handleNextPhoto = () => {
    if (
      selectedProfile?.photos &&
      currentImageIndex < selectedProfile.photos.length - 1
    ) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePreviousPhoto = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Surface style={styles.modalHeader} elevation={2}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon source="email-heart" size={28} color={theme.colors.primary} />
            <Text variant="headlineMedium">Requests</Text>
          </View>
          <IconButton icon="close" onPress={onClose} />
        </Surface>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" />
            <Text variant="bodyLarge" style={styles.marginTop}>
              Loading requests...
            </Text>
          </View>
        ) : !currentDuo ? (
          <EmptyState
            icon="account-multiple"
            title="No Duo Partner"
            message="You need to set up a duo partner in your profile to receive duo requests."
          />
        ) : duoLikes.length === 0 ? (
          <EmptyState
            icon="email-heart"
            title="No Requests"
            message="When duos like you, they'll appear here!"
          />
        ) : (
          <ScrollView style={styles.requestsList}>
            {duoLikes.map((like) => {
              const youAccepted = like.acceptedBy.includes(currentUserId);
              const partnerAccepted = currentDuo
                ? like.acceptedBy.includes(currentDuo.partnerId)
                : false;
              const bothAccepted = youAccepted && partnerAccepted;

              return (
                <Card key={like.id} style={styles.requestCard}>
                  <Card.Content>
                    <View style={styles.duoContainer}>
                      <Button
                        mode="text"
                        onPress={() => handleProfileClick(like.user1)}
                      >
                        <View style={styles.userCard}>
                          <ProfilePhoto
                            uri={like.user1.photos?.[0]}
                            size={80}
                          />
                          <Text variant="titleMedium">
                            {like.user1.name}, {like.user1.age}
                          </Text>
                        </View>
                      </Button>

                      <Text variant="displaySmall">+</Text>

                      <Button
                        mode="text"
                        onPress={() => handleProfileClick(like.user2)}
                      >
                        <View style={styles.userCard}>
                          <ProfilePhoto
                            uri={like.user2.photos?.[0]}
                            size={80}
                          />
                          <Text variant="titleMedium">
                            {like.user2.name}, {like.user2.age}
                          </Text>
                        </View>
                      </Button>
                    </View>

                    {bothAccepted ? (
                      <Chip icon="check-circle" style={styles.matchedChip}>
                        It's a Match! Check your messages
                      </Chip>
                    ) : youAccepted ? (
                      <Chip icon="clock" style={styles.waitingChip}>
                        Waiting for your partner to accept...
                      </Chip>
                    ) : (
                      <View style={styles.actionButtons}>
                        <Button
                          mode="outlined"
                          icon="close"
                          onPress={() => handleDecline(like.id, like.fromDuoId)}
                          style={styles.actionButton}
                        >
                          Pass
                        </Button>
                        <Button
                          mode="contained"
                          icon="heart"
                          onPress={() => handleAccept(like.id, like.fromDuoId)}
                          style={styles.actionButton}
                        >
                          Accept
                        </Button>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Chat List Component
function ChatListScreen({ onChatSelect, onRequestsPress, requestCount }) {
  const theme = useTheme();
  const currentUserId = getUserID();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chatsRef = collection(db, "chats");
    const unsubscribe = onSnapshot(
      chatsRef,
      (snapshot) => {
        const chatsList = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.participants && data.participants.includes(currentUserId)) {
            chatsList.push({
              id: docSnap.id,
              ...data,
            });
          }
        });

        chatsList.sort((a, b) => {
          const aTime = a.lastMessageTime?.seconds || 0;
          const bTime = b.lastMessageTime?.seconds || 0;
          return bTime - aTime;
        });

        setChats(chatsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading chats:", error);
        setLoading(false);
      }
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
      ]
    );
  };

  const handleReport = (chatId, chatName) => {
    Alert.alert(
      "Report Chat",
      `Report "${chatName}"? This will flag it for moderation.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            const success = await reportChat(chatId, currentUserId);
            if (success) {
              Alert.alert(
                "Reported",
                "Thank you. Our team will review this chat."
              );
            } else {
              Alert.alert("Error", "Failed to report chat");
            }
          },
        },
      ]
    );
  };

  const showChatOptions = (chatId, chatName) => {
    Alert.alert("Chat Options", null, [
      { text: "Everyone Met", onPress: () => handleEveryoneMet(chatId) },
      {
        text: "Unmatch Duo",
        onPress: () => handleUnmatchDuo(chatId, chatName),
        style: "destructive",
      },
      {
        text: "Report",
        onPress: () => handleReport(chatId, chatName),
        style: "destructive",
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderItem = ({ item }) => {
    const unreadCount = item.unreadCount?.[currentUserId] || 0;
    const isGroup = item.isGroupChat || false;

    return (
      <List.Item
        title={item.groupName || "Chat"}
        description={item.lastMessageText || "No messages yet"}
        descriptionNumberOfLines={1}
        left={() =>
          isGroup ? (
            <Avatar.Icon size={48} icon="account-group" />
          ) : (
            <Avatar.Image
              size={48}
              source={{ uri: "https://i.pravatar.cc/150" }}
            />
          )
        }
        right={() => (
          <View style={styles.chatRight}>
            <Text variant="bodySmall">
              {formatTimeStamp(item.lastMessageTime)}
            </Text>
            {unreadCount > 0 && (
              <Badge style={styles.badge}>{unreadCount}</Badge>
            )}
            <IconButton
              icon="dots-vertical"
              size={20}
              onPress={() => showChatOptions(item.id, item.groupName || "Chat")}
            />
          </View>
        )}
        onPress={() => onChatSelect(item)}
        style={[styles.chatItem, unreadCount > 0 && styles.unreadChatItem]}
      />
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Surface style={styles.header} elevation={2}>
          <Text variant="headlineMedium">💬 Messages</Text>
          <Button mode="contained" onPress={onRequestsPress} icon="mail">
            Requests {requestCount > 0 && `(${requestCount})`}
          </Button>
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
        <Button mode="contained" onPress={onRequestsPress} icon="mail">
          Requests {requestCount > 0 && `(${requestCount})`}
        </Button>
      </Surface>

      {chats.length === 0 ? (
        <EmptyState
          icon="message"
          title="No Messages Yet"
          message="When you match with duos, you'll be able to message them here!"
        />
      ) : (
        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Divider />}
        />
      )}
    </View>
  );
}

// Individual Chat Screen Component
function IndividualChatScreen({ chat, onBack }) {
  const theme = useTheme();
  const currentUserId = getUserID();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    if (!chat?.id) return;

    const markAsRead = async () => {
      try {
        const chatRef = doc(db, "chats", chat.id);
        await updateDoc(chatRef, {
          [`unreadCount.${currentUserId}`]: 0,
        });
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    };

    markAsRead();

    const messagesRef = collection(db, "chats", chat.id, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          _id: doc.id,
          text: data.text,
          createdAt: data.createdAt?.toDate() || new Date(),
          user: {
            _id: data.user._id,
            name: data.user.name,
          },
        };
      });

      setMessages(messagesList);
    });

    return () => unsubscribe();
  }, [chat]);

  useEffect(() => {
    const loadOtherUsers = async () => {
      if (!chat.participants) return;

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

  const onSend = useCallback(async () => {
    if (!chat?.id || !inputText.trim()) return;

    try {
      const messagesRef = collection(db, "chats", chat.id, "messages");
      await addDoc(messagesRef, {
        text: inputText.trim(),
        createdAt: serverTimestamp(),
        user: {
          _id: currentUserId,
          name: "You",
        },
      });

      const chatRef = doc(db, "chats", chat.id);
      const unreadUpdate = {};

      chat.participants.forEach((participantId) => {
        if (participantId !== currentUserId) {
          unreadUpdate[`unreadCount.${participantId}`] =
            (chat.unreadCount?.[participantId] || 0) + 1;
        }
      });

      await updateDoc(chatRef, {
        lastMessageText: inputText.trim(),
        lastMessageTime: serverTimestamp(),
        ...unreadUpdate,
      });

      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }, [chat, currentUserId, inputText]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Surface style={styles.chatHeader} elevation={2}>
        <IconButton icon="arrow-left" onPress={onBack} />
        <Text variant="titleLarge">{chat.groupName || "Chat"}</Text>
        <View style={styles.headerSpacer} />
      </Surface>

      <FlatList
        data={messages}
        renderItem={({ item }) => {
          const isMyMessage = item.user._id === currentUserId;
          const senderProfile = userProfiles[item.user._id];

          return (
            <View
              style={[styles.messageRow, isMyMessage && styles.myMessageRow]}
            >
              {!isMyMessage && (
                <ProfilePhoto
                  uri={senderProfile?.photos?.[0]}
                  size={32}
                  style={styles.messageAvatar}
                />
              )}

              <Surface
                style={[
                  styles.messageBubble,
                  isMyMessage ? styles.myMessage : styles.theirMessage,
                ]}
                elevation={1}
              >
                {!isMyMessage && chat.isGroupChat && senderProfile && (
                  <Text variant="labelSmall" style={styles.senderName}>
                    {senderProfile.name}
                  </Text>
                )}

                <Text
                  variant="bodyMedium"
                  style={isMyMessage && styles.myMessageText}
                >
                  {item.text}
                </Text>

                <Text variant="labelSmall" style={styles.messageTime}>
                  {item.createdAt?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Surface>

              {isMyMessage && userProfiles[currentUserId] && (
                <ProfilePhoto
                  uri={userProfiles[currentUserId].photos?.[0]}
                  size={32}
                  style={styles.messageAvatar}
                />
              )}
            </View>
          );
        }}
        keyExtractor={(item) => item._id}
        inverted
        contentContainerStyle={styles.messagesList}
      />

      <Surface style={styles.composerContainer} elevation={4}>
        <TextInput
          mode="outlined"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
          style={styles.textInput}
          dense
        />
        <IconButton
          icon="send"
          mode="contained"
          onPress={onSend}
          disabled={!inputText.trim()}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}

export default function ChatScreen() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const loadRequestCount = async () => {
      try {
        const currentUserId = CURRENT_USER_ID;
        const duo = await getCurrentDuoPartner(currentUserId);

        if (!duo) {
          setRequestCount(0);
          return;
        }

        const likesQuery = query(
          collection(db, "duoLikes"),
          where("toDuoId", "==", duo.duoId),
          where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(likesQuery, (snapshot) => {
          setRequestCount(snapshot.docs.length);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error loading request count:", error);
      }
    };

    loadRequestCount();
  }, []);

  if (selectedChat) {
    return (
      <IndividualChatScreen
        chat={selectedChat}
        onBack={() => setSelectedChat(null)}
      />
    );
  }

  return (
    <>
      <ChatListScreen
        onChatSelect={setSelectedChat}
        onRequestsPress={() => setShowRequests(true)}
        requestCount={requestCount}
      />
      <RequestsModal
        visible={showRequests}
        onClose={() => setShowRequests(false)}
      />
    </>
  );
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
  unreadChatItem: {
    backgroundColor: "rgba(33, 150, 243, 0.1)",
  },
  chatRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  badge: {
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  requestsList: {
    flex: 1,
    padding: 8,
  },
  requestCard: {
    marginBottom: 12,
  },
  duoContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  userCard: {
    alignItems: "center",
  },
  matchedChip: {
    backgroundColor: "#4CAF50",
    color: "white",
  },
  waitingChip: {
    backgroundColor: "#FF9800",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
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
    padding: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 8,
    maxWidth: "80%",
  },
  myMessageRow: {
    alignSelf: "flex-end",
  },
  messageAvatar: {
    marginHorizontal: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: "100%",
  },
  myMessage: {
    backgroundColor: "#2196F3",
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: "#E0E0E0",
    borderBottomLeftRadius: 4,
  },
  senderName: {
    marginBottom: 4,
    fontWeight: "600",
  },
  myMessageText: {
    color: "white",
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
  },
  textInput: {
    flex: 1,
  },
});
