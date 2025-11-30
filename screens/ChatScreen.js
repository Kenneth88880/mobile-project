import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Alert,
  SafeAreaView,
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
  Menu,
  Portal,
} from "react-native-paper";
// ✅ FIXED: Using React Native Firebase instead of web SDK
import firestore from '@react-native-firebase/firestore';
import {
  getUserProfile,
  saveRating,
} from "../services/profileService";
import { CURRENT_USER_ID } from "../services/UserConfig";
import { EmptyState, ProfilePhoto } from "../components/CommonComponents";

const getUserID = () => CURRENT_USER_ID;

// Delete a specific chat
const deleteChat = async (chatId) => {
  try {
    // ✅ FIXED: React Native Firebase syntax
    const messagesSnapshot = await firestore()
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .get();
    
    const deleteMessagesPromises = messagesSnapshot.docs.map((msgDoc) =>
      msgDoc.ref.delete()
    );
    await Promise.all(deleteMessagesPromises);
    
    await firestore()
      .collection('chats')
      .doc(chatId)
      .delete();
    
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// Report a chat
const reportChat = async (chatId, reportingUserId) => {
  try {
    // ✅ FIXED: React Native Firebase syntax
    const chatRef = firestore().collection('chats').doc(chatId);
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
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChatName, setSelectedChatName] = useState("");
  const currentUserId = getUserID();

  const congratsMessages = [
    "Congrats on the successful double date!",
    "That's awesome! Glad you all hit it off!",
    "Woohoo! Nothing beats a great double date!",
  ];

  const formatTimeStamp = (timestamp) => {
    if (!timestamp) return "";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return "";
    }
  };

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

  const handleReportFromList = (chatId, chatName) => {
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
    setSelectedChatId(chatId);
    setSelectedChatName(chatName);
    setShowOptionsModal(true);
  };

  const handleOptionSelect = (option) => {
    setShowOptionsModal(false);
    
    // Small delay to let modal close smoothly
    setTimeout(() => {
      switch (option) {
        case 'everyoneMet':
          handleEveryoneMet(selectedChatId);
          break;
        case 'unmatch':
          handleUnmatchDuo(selectedChatId, selectedChatName);
          break;
        case 'report':
          handleReportFromList(selectedChatId, selectedChatName);
          break;
      }
    }, 100);
  };

  useEffect(() => {
    // ✅ FIXED: React Native Firebase syntax
    const unsubscribe = firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUserId)
      .onSnapshot(async (snapshot) => {
        const chatList = [];
        for (const docSnap of snapshot.docs) {
          const chatData = docSnap.data();
          chatList.push({
            id: docSnap.id,
            ...chatData,
          });
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
          unreadCount > 0 && { backgroundColor: `${theme.colors.primary}15` }
        ]}
      />
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
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

      {requestCount > 0 && (
        <Card style={{ margin: 8 }} onPress={onRequestsPress}>
          <Card.Content>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon source="email-heart" size={24} color={theme.colors.primary} />
                <Text variant="titleMedium">
                  {requestCount} New Request{requestCount !== 1 ? "s" : ""}
                </Text>
              </View>
              <Icon source="chevron-right" size={24} />
            </View>
          </Card.Content>
        </Card>
      )}

      {chats.length === 0 ? (
        <EmptyState
          icon="message-text"
          title="No Messages Yet"
          message="When you match with duos, your chats will appear here!"
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const unreadCount = item.unreadCount?.[currentUserId] || 0;
            const isGroup = item.isGroupChat || false;

            return (
              <List.Item
                title={item.groupName || "Chat"}
                description={item.lastMessageText || "No messages yet"}
                descriptionNumberOfLines={1}
                left={(props) => 
                  isGroup ? (
                    <Avatar.Icon {...props} icon="account-group" />
                  ) : (
                    <Avatar.Icon {...props} icon="account" />
                  )
                }
                right={(props) => (
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
                onPress={() => handleChatPress(item)}
                style={[
                  styles.chatItem,
                  unreadCount > 0 && styles.unreadChatItem,
                ]}
              />
            );
          }}
        />
      )}

      {/* Custom Chat Options Modal */}
      <Portal>
        <Modal
          visible={showOptionsModal}
          onDismiss={() => setShowOptionsModal(false)}
          contentContainerStyle={[
            styles.optionsModal,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              Chat Options
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowOptionsModal(false)}
            />
          </View>
          
          <Divider />

          <List.Item
            title="Everyone Met"
            description="Celebrate and close this chat"
            left={(props) => <List.Icon {...props} icon="party-popper" color="#4CAF50" />}
            onPress={() => handleOptionSelect('everyoneMet')}
            style={styles.optionItem}
          />
          
          <Divider />

          <List.Item
            title="Unmatch Duo"
            description="End this match"
            left={(props) => <List.Icon {...props} icon="account-remove" color="#FF9800" />}
            onPress={() => handleOptionSelect('unmatch')}
            style={styles.optionItem}
          />
          
          <Divider />

          <List.Item
            title="Report"
            description="Flag for moderation"
            left={(props) => <List.Icon {...props} icon="flag" color="#F44336" />}
            onPress={() => handleOptionSelect('report')}
            style={styles.optionItem}
          />
          
          <Divider />

          <Button
            mode="outlined"
            onPress={() => setShowOptionsModal(false)}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

// Individual Chat Screen Component
function IndividualChatScreen({ chat, onBack }) {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [userProfiles, setUserProfiles] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const currentUserId = getUserID();

  useEffect(() => {
    // ✅ FIXED: React Native Firebase syntax
    const unsubscribe = firestore()
      .collection('chats')
      .doc(chat.id)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const msgs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            _id: doc.id,
            text: data.text,
            createdAt: data.createdAt?.toDate() || new Date(),
            user: data.user,
          };
        });
        setMessages(msgs);
      });

    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    const loadProfiles = async () => {
      const profiles = {};
      for (const userId of chat.participants || []) {
        if (!profiles[userId]) {
          const profile = await getUserProfile(userId);
          if (profile) profiles[userId] = profile;
        }
      }
      setUserProfiles(profiles);
    };

    loadProfiles();
  }, [chat.participants]);

  const onSend = useCallback(async () => {
    if (!inputText.trim()) return;

    try {
      // ✅ FIXED: React Native Firebase syntax
      await firestore()
        .collection('chats')
        .doc(chat.id)
        .collection('messages')
        .add({
          text: inputText.trim(),
          createdAt: firestore.FieldValue.serverTimestamp(),
          user: {
            _id: currentUserId,
            name: "You",
          },
        });

      const unreadUpdate = {};

      chat.participants.forEach((participantId) => {
        if (participantId !== currentUserId) {
          unreadUpdate[`unreadCount.${participantId}`] =
            (chat.unreadCount?.[participantId] || 0) + 1;
        }
      });

      await firestore()
        .collection('chats')
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

  const handleDeleteChat = () => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteChat(chat.id);
            if (success) {
              Alert.alert("Success", "Chat deleted");
              onBack(); // Go back to chat list
            } else {
              Alert.alert("Error", "Failed to delete chat");
            }
          },
        },
      ]
    );
  };

  const handleReportChat = () => {
    Alert.alert(
      "Report Chat",
      "Are you sure you want to report this chat? This will remove you from the conversation and flag it for review.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            const success = await reportChat(chat.id, currentUserId);
            if (success) {
              Alert.alert(
                "Reported",
                "This chat has been reported and you've been removed."
              );
              onBack(); // Go back to chat list
            } else {
              Alert.alert("Error", "Failed to report chat");
            }
          },
        },
      ]
    );
  };

  const handleMenuOption = (option) => {
    setShowMenu(false);
    if (option === 'delete') {
      handleDeleteChat();
    } else if (option === 'report') {
      handleReportChat();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Surface style={styles.chatHeader} elevation={2}>
        <IconButton icon="arrow-left" onPress={onBack} />
        <Text variant="titleLarge">{chat.groupName || "Chat"}</Text>
        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setShowMenu(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => handleMenuOption('delete')}
            title="Delete Chat"
            leadingIcon="delete"
          />
          <Divider />
          <Menu.Item
            onPress={() => handleMenuOption('report')}
            title="Report Chat"
            leadingIcon="flag"
          />
        </Menu>
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
  optionsModal: {
    marginHorizontal: 20,
    marginVertical: 'auto',
    borderRadius: 12,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionItem: {
    paddingVertical: 8,
  },
  cancelButton: {
    margin: 16,
  },
});