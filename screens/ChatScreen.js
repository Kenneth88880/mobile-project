import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Image,
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
  Portal,
  Modal,
  Card,
  Button,
  Chip,
} from "react-native-paper";
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

// Update chat name
const updateChatName = async (chatId, newName) => {
  try {
    await firestore().collection("chats").doc(chatId).update({
      groupName: newName,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating chat name:", error);
    return false;
  }
};

// Upload image to Firebase Storage and return URL
const uploadImageToStorage = async (imageUri, chatId) => {
  try {
    const filename = `chat_pictures/${chatId}_${Date.now()}.jpg`;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("chats")
      .onSnapshot(
        (snapshot) => {
          const chatsList = [];

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              data.participants &&
              data.participants.includes(currentUserId)
            ) {
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
            item.groupPhoto ? (
              <Avatar.Image size={48} source={{ uri: item.groupPhoto }} />
            ) : (
              <Avatar.Icon size={48} icon="account-group" />
            )
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
  const [showParticipants, setShowParticipants] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [profileImageIndex, setProfileImageIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // New states for editing group info
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [currentChat, setCurrentChat] = useState(chat);

  // to see and leave average rating
  const [viewingProfileRating, setViewingProfileRating] = useState({ average: "0.0", count: 0 });
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

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

  // Listen for chat updates
  useEffect(() => {
    if (!chat?.id) return;

    const unsubscribe = firestore()
      .collection("chats")
      .doc(chat.id)
      .onSnapshot((doc) => {
        if (doc.exists) {
          setCurrentChat({ id: doc.id, ...doc.data() });
        }
      });

    return () => unsubscribe();
  }, [chat?.id]);

  const handleEditGroupInfo = () => {
    setEditingName(currentChat.groupName || "");
    setShowEditModal(true);
  };

  const handleSaveGroupName = async () => {
    if (!editingName.trim()) {
      Alert.alert("Error", "Group name cannot be empty");
      return;
    }

    const success = await updateChatName(chat.id, editingName.trim());
    if (success) {
      setShowEditModal(false);
      Alert.alert("Success", "Group name updated!");
    } else {
      Alert.alert("Error", "Failed to update group name");
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
            
            setUploadingImage(true);
            
            const success = await updateChatPicture(chat.id, imageUri);
            
            setUploadingImage(false);
            
            if (success) {
              Alert.alert("Success", "Group picture updated!");
            } else {
              Alert.alert("Error", "Failed to update group picture");
            }
          }
        }
      );
    } catch (error) {
      console.error("Error in handleChangeGroupPicture:", error);
      setUploadingImage(false);
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
        await firestore()
          .collection("ratings")
          .doc(ratingDoc.id)
          .update({
            rating: rating,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        
        Alert.alert("Success", "Your rating has been updated!");
      } else {
        // Create new rating
        await firestore()
          .collection("ratings")
          .add({
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
        </TouchableOpacity>
      );
    }
    return stars;
  };


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
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
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
        
        {/* Group photo - tappable to change */}
        {currentChat.isGroupChat && (
          <TouchableOpacity
            onPress={handleChangeGroupPicture}
            disabled={uploadingImage}
            style={{ marginRight: 8 }}
          >
            {uploadingImage ? (
              <View style={styles.avatarContainer}>
                <ActivityIndicator size={36} />
              </View>
            ) : currentChat.groupPhoto ? (
              <Avatar.Image size={36} source={{ uri: currentChat.groupPhoto }} />
            ) : (
              <Avatar.Icon size={36} icon="account-group" />
            )}
          </TouchableOpacity>
        )}
        
        {/* Group name - tappable to edit */}
        <TouchableOpacity
          onPress={currentChat.isGroupChat ? handleEditGroupInfo : undefined}
          style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
          disabled={!currentChat.isGroupChat}
        >
          <Text variant="titleLarge" style={{ flex: 1 }}>
            {currentChat.groupName || "Chat"}
          </Text>
          {currentChat.isGroupChat && (
            <Icon source="pencil" size={16} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
        
        <IconButton
          icon="account-multiple"
          onPress={() => setShowParticipants(true)}
          tooltip="View Participants"
        />
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
                <View style={styles.avatarWrapper}>
                  <Text variant="labelSmall" style={styles.avatarName}>
                    {senderProfile?.name || "Unknown"}
                  </Text>
                  <TouchableOpacity onPress={() => handleProfilePicturePress(item.user._id)}>
                    <ProfilePhoto
                      uri={senderProfile?.photos?.[0]}
                      size={32}
                      style={styles.messageAvatar}
                    />
                  </TouchableOpacity>
                </View>
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
                <View style={styles.avatarWrapper}>
                  <Text variant="labelSmall" style={styles.avatarName}>
                    {userProfiles[currentUserId].name || "You"}
                  </Text>
                  <TouchableOpacity onPress={() => handleProfilePicturePress(currentUserId)}>
                    <ProfilePhoto
                      uri={userProfiles[currentUserId].photos?.[0]}
                      size={32}
                      style={styles.messageAvatar}
                    />
                  </TouchableOpacity>
                </View>
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
          <Card>
            <Card.Title title="Edit Group Info" />
            <Card.Content>
              <TouchableOpacity
                onPress={handleChangeGroupPicture}
                disabled={uploadingImage}
                style={{ alignItems: "center", marginBottom: 16 }}
              >
                {uploadingImage ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="large" />
                  </View>
                ) : currentChat.groupPhoto ? (
                  <Avatar.Image size={80} source={{ uri: currentChat.groupPhoto }} />
                ) : (
                  <Avatar.Icon size={80} icon="account-group" />
                )}
                <Text 
                  variant="labelLarge"
                  style={{ marginTop: 8, color: uploadingImage ? '#999' : theme.colors.primary }}
                >
                  {uploadingImage ? "Uploading..." : "Tap to Change Picture"}
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
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingHorizontal: 8,
                              }}
                            >
                              <IconButton
                                icon="chevron-left"
                                iconColor="white"
                                onPress={() =>
                                  setProfileImageIndex((prev) =>
                                    prev === 0
                                      ? viewingProfile.photos.length - 1
                                      : prev - 1
                                  )
                                }
                                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                              />
                              <View style={{ flexDirection: "row", gap: 8 }}>
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
                              <IconButton
                                icon="chevron-right"
                                iconColor="white"
                                onPress={() =>
                                  setProfileImageIndex((prev) =>
                                    prev === viewingProfile.photos.length - 1
                                      ? 0
                                      : prev + 1
                                  )
                                }
                                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                              />
                            </View>
                          )}
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
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                              {renderStars(parseFloat(viewingProfileRating.average))}
                            </View>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {viewingProfileRating.average} ({viewingProfileRating.count} rating{viewingProfileRating.count !== 1 ? "s" : ""})
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

                      {/* ⭐ NEW: Rate This Person Section */}
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
                              onPress={() => handleSubmitRating(viewingProfile.id, userRating)}
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
                                  opacity: 0.7
                                }}
                              >
                                You previously rated this person {userRating} star{userRating !== 1 ? "s" : ""}
                              </Text>
                            )}
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
    minHeight: 56, // Minimum height for single line
  },
  textInput: {
    flex: 1,
    maxHeight: 120, // ✅ FIX BUG #3: Limit height to prevent avatar cutoff
  },
});
