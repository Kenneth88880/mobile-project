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
  Menu,
  Portal,
} from "react-native-paper";
// ✅ FIXED: Using React Native Firebase instead of web SDK
import firestore from '@react-native-firebase/firestore';
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

    // ✅ FIXED: React Native Firebase syntax
    const unsubscribe = firestore()
      .collection('duoLikes')
      .where('toDuoId', '==', currentDuo.duoId)
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
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
                      <Chip style={styles.matchedChip} textStyle={{ color: 'white' }}>
                        ✨ Matched! Start chatting
                      </Chip>
                    ) : youAccepted ? (
                      <Chip style={styles.waitingChip}>
                        ⏳ Waiting for your partner's approval
                      </Chip>
                    ) : partnerAccepted ? (
                      <Chip style={styles.waitingChip}>
                        ⏳ Your partner approved! Your turn
                      </Chip>
                    ) : null}

                    <View style={styles.actionButtons}>
                      <Button
                        mode="outlined"
                        onPress={() => handleDecline(like.id, like.fromDuoId)}
                        style={styles.actionButton}
                        disabled={bothAccepted}
                      >
                        Decline
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => handleAccept(like.id, like.fromDuoId)}
                        style={styles.actionButton}
                        disabled={youAccepted || bothAccepted}
                      >
                        {youAccepted ? "Accepted" : "Accept"}
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </ScrollView>
        )}

        {selectedProfile && (
          <Modal
            visible={!!selectedProfile}
            animationType="fade"
            onRequestClose={() => setSelectedProfile(null)}
          >
            <SafeAreaView
              style={[
                styles.profileModalContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <IconButton
                icon="close"
                size={30}
                onPress={() => setSelectedProfile(null)}
                style={styles.closeButton}
              />

              <ScrollView>
                {selectedProfile.photos &&
                  selectedProfile.photos.length > 0 && (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: selectedProfile.photos[currentImageIndex] }}
                        style={styles.fullImage}
                        resizeMode="cover"
                      />
                      {selectedProfile.photos.length > 1 && (
                        <View style={styles.imageNavButtons}>
                          <IconButton
                            icon="chevron-left"
                            size={30}
                            onPress={handlePreviousPhoto}
                            disabled={currentImageIndex === 0}
                          />
                          <Text>
                            {currentImageIndex + 1} / {selectedProfile.photos.length}
                          </Text>
                          <IconButton
                            icon="chevron-right"
                            size={30}
                            onPress={handleNextPhoto}
                            disabled={
                              currentImageIndex === selectedProfile.photos.length - 1
                            }
                          />
                        </View>
                      )}
                    </View>
                  )}

                <Card style={styles.profileInfoCard}>
                  <Card.Content>
                    <Text variant="headlineMedium">
                      {selectedProfile.name}, {selectedProfile.age}
                    </Text>
                    {selectedProfile.description && (
                      <Text variant="bodyLarge" style={styles.profileDescription}>
                        {selectedProfile.description}
                      </Text>
                    )}
                    {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                      <View style={styles.tagsContainer}>
                        <Text variant="titleSmall">Interests:</Text>
                        <View style={styles.tags}>
                          {selectedProfile.tags.map((tag, idx) => (
                            <Chip key={idx} compact>
                              {tag}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Chat List Screen Component
function ChatListScreen({ onChatSelect, onRequestsPress, requestCount }) {
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

        chatList.sort((a, b) => {
          const aTime = a.lastMessageTime?.toMillis() || 0;
          const bTime = b.lastMessageTime?.toMillis() || 0;
          return bTime - aTime;
        });

        setChats(chatList);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [currentUserId]);

  const markAsRead = async (chatId) => {
    try {
      // ✅ FIXED: React Native Firebase syntax
      await firestore()
        .collection('chats')
        .doc(chatId)
        .update({
          [`unreadCount.${currentUserId}`]: 0,
        });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleChatPress = (chat) => {
    markAsRead(chat.id);
    onChatSelect(chat);
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
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.marginTop}>
          Loading chats...
        </Text>
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
        <IconButton
          icon="email-heart"
          size={28}
          onPress={onRequestsPress}
        />
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

        // ✅ FIXED: React Native Firebase syntax
        const unsubscribe = firestore()
          .collection('duoLikes')
          .where('toDuoId', '==', duo.duoId)
          .where('status', '==', 'pending')
          .onSnapshot((snapshot) => {
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
    alignSelf: "center",
    marginBottom: 12,
  },
  waitingChip: {
    backgroundColor: "#FF9800",
    alignSelf: "center",
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  profileModalContainer: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 16,
    zIndex: 10,
  },
  imageContainer: {
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: 500,
  },
  imageNavButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  profileInfoCard: {
    margin: 16,
  },
  profileDescription: {
    marginTop: 12,
    lineHeight: 24,
  },
  tagsContainer: {
    marginTop: 16,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
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