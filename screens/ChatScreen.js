import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
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
} from "react-native-paper";
import firestore from '@react-native-firebase/firestore';
import { getUserProfile } from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import { EmptyState, ProfilePhoto } from "../components/CommonComponents";

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
      msgDoc.ref.delete()
    );
    await Promise.all(deleteMessagesPromises);
    
    await firestore().collection("chats").doc(chatId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// Report a chat
const reportChat = async (chatId, reportingUserId) => {
  try {
    const chatRef = firestore().collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (chatDoc.exists) {
      const data = chatDoc.data();
      const reports = data.reports || [];
      reports.push({
        reportedBy: reportingUserId,
        reportedAt: firestore.FieldValue.serverTimestamp(),
        reason: "User reported inappropriate content",
      });

      const participants = data.participants || [];
      const updatedParticipants = participants.filter(
        (id) => id !== reportingUserId
      );

      await chatRef.update({
        reports: reports,
        participants: updatedParticipants,
        flaggedForModeration: true,
        lastReportedAt: firestore.FieldValue.serverTimestamp(),
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error reporting chat:", error);
    return false;
  }
};

// Chat List Component
function ChatListScreen({ onChatSelect }) {
  const theme = useTheme();
  const currentUserId = getUserID();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("chats")
      .onSnapshot(
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
        style={[
          styles.chatItem,
          unreadCount > 0 && { backgroundColor: `${theme.colors.primary}15` },
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
      .onSnapshot((snapshot) => {
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

  const onSend = useCallback(async () => {
    if (!chat?.id || !inputText.trim()) return;

    try {
      await firestore()
        .collection("chats")
        .doc(chat.id)
        .collection("messages")
        .add({
          text: inputText.trim(),
          createdAt: firestore.FieldValue.serverTimestamp(),
          user: {
            _id: currentUserId,
            name: "You",
          },
        });

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
  }, [chat, currentUserId, inputText]);

  if (!chat) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>No chat selected</Text>
      </View>
    );
  }

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
                  {
                    backgroundColor: isMyMessage
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderBottomRightRadius: isMyMessage ? 4 : 16,
                    borderBottomLeftRadius: isMyMessage ? 16 : 4,
                  },
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
                  style={{
                    color: isMyMessage
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                  }}
                >
                  {item.text}
                </Text>

                <Text
                  variant="labelSmall"
                  style={[
                    styles.messageTime,
                    {
                      color: isMyMessage
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
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

  if (selectedChat) {
    return (
      <IndividualChatScreen
        chat={selectedChat}
        onBack={() => setSelectedChat(null)}
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
  },
  textInput: {
    flex: 1,
  },
});