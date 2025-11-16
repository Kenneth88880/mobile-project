import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, TextInput, Button, View, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, Alert, Modal, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { GiftedChat, Bubble } from "react-native-gifted-chat";
import { db } from "../firebaseConfig";
import { collection, addDoc, onSnapshot, orderBy, query, where, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, getDocs } from "firebase/firestore";
import { getUserProfile, saveRating, getCurrentDuoPartner, acceptDuoLike, deleteDuoLike, saveDuoSwipe } from "../profileService";
import { CURRENT_USER_ID } from "../UserConfig";

const getUserID = () => {
  return CURRENT_USER_ID;
};

// Delete a specific chat
const deleteChat = async (chatId) => {
  try {
    // Delete all messages in the chat first
    const messagesSnapshot = await getDocs(collection(db, "chats", chatId, "messages"));
    const deleteMessagesPromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref));
    await Promise.all(deleteMessagesPromises);
    
    // Then delete the chat document itself
    await deleteDoc(doc(db, "chats", chatId));
    
    console.log(`Deleted chat ${chatId} and ${messagesSnapshot.size} messages`);
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// Report a chat - removes from user's view but keeps logs for moderation
const reportChat = async (chatId, reportingUserId) => {
  try {
    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const data = chatDoc.data();
      
      // Add report to the chat document
      const reports = data.reports || [];
      reports.push({
        reportedBy: reportingUserId,
        reportedAt: serverTimestamp(),
        reason: "User reported inappropriate content"
      });
      
      // Remove the reporting user from participants
      const participants = data.participants || [];
      const updatedParticipants = participants.filter(id => id !== reportingUserId);
      
      // Mark chat as flagged for moderation
      await updateDoc(chatRef, {
        reports: reports,
        participants: updatedParticipants,
        flaggedForModeration: true,
        lastReportedAt: serverTimestamp()
      });
      
      console.log(`Chat ${chatId} reported by user ${reportingUserId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error reporting chat:", error);
    return false;
  }
};

// Requests Modal Component - shows duo likes
function RequestsModal({ visible, onClose }) {
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
      
      if (!duo) {
        setLoading(false);
      }
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

    const success = await acceptDuoLike(likeId, currentUserId, currentDuo.duoId, fromDuoId);
    
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
    if (selectedProfile && selectedProfile.photos && currentImageIndex < selectedProfile.photos.length - 1) {
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
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>💌 Requests</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : !currentDuo ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Duo Partner</Text>
            <Text style={styles.emptyText}>You need to set up a duo partner in your profile to receive duo requests.</Text>
          </View>
        ) : duoLikes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💌</Text>
            <Text style={styles.emptyTitle}>No Requests</Text>
            <Text style={styles.emptyText}>When duos like you, they'll appear here!</Text>
          </View>
        ) : (
          <ScrollView style={styles.requestsList}>
            {duoLikes.map((like) => {
              const youAccepted = like.acceptedBy.includes(currentUserId);
              const partnerAccepted = currentDuo ? like.acceptedBy.includes(currentDuo.partnerId) : false;
              const bothAccepted = youAccepted && partnerAccepted;
              
              return (
                <View key={like.id} style={styles.requestCard}>
                  <View style={styles.duoContainer}>
                    {/* User 1 */}
                    <TouchableOpacity 
                      style={styles.userCard}
                      onPress={() => handleProfileClick(like.user1)}
                    >
                      {like.user1.photos && like.user1.photos.length > 0 ? (
                        <Image source={{ uri: like.user1.photos[0] }} style={styles.userPhoto} />
                      ) : (
                        <View style={styles.noPhotoPlaceholder}>
                          <Text style={styles.noPhotoText}>😊</Text>
                        </View>
                      )}
                      <Text style={styles.userName}>{like.user1.name}, {like.user1.age}</Text>
                    </TouchableOpacity>

                    <Text style={styles.plusSign}>+</Text>

                    {/* User 2 */}
                    <TouchableOpacity 
                      style={styles.userCard}
                      onPress={() => handleProfileClick(like.user2)}
                    >
                      {like.user2.photos && like.user2.photos.length > 0 ? (
                        <Image source={{ uri: like.user2.photos[0] }} style={styles.userPhoto} />
                      ) : (
                        <View style={styles.noPhotoPlaceholder}>
                          <Text style={styles.noPhotoText}>😊</Text>
                        </View>
                      )}
                      <Text style={styles.userName}>{like.user2.name}, {like.user2.age}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status */}
                  {bothAccepted ? (
                    <View style={styles.matchedBanner}>
                      <Text style={styles.matchedText}>🎉 It's a Match! Check your messages</Text>
                    </View>
                  ) : youAccepted ? (
                    <View style={styles.waitingBanner}>
                      <Text style={styles.waitingText}>⏳ Waiting for your partner to accept...</Text>
                    </View>
                  ) : (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.declineButton}
                        onPress={() => handleDecline(like.id, like.fromDuoId)}
                      >
                        <Text style={styles.declineButtonText}>✗ Pass</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAccept(like.id, like.fromDuoId)}
                      >
                        <Text style={styles.acceptButtonText}>❤️ Accept</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Profile Detail Modal */}
        {selectedProfile && (
          <Modal visible={true} animationType="fade" transparent={true}>
            <View style={styles.profileModalOverlay}>
              <View style={styles.profileModalContent}>
                <TouchableOpacity 
                  style={styles.profileModalClose}
                  onPress={() => setSelectedProfile(null)}
                >
                  <Text style={styles.profileModalCloseText}>✕</Text>
                </TouchableOpacity>

                {selectedProfile.photos && selectedProfile.photos.length > 0 ? (
                  <View style={styles.photoViewerContainer}>
                    <TouchableOpacity 
                      style={styles.photoTouchLeft}
                      onPress={handlePreviousPhoto}
                      activeOpacity={0.9}
                    />
                    <TouchableOpacity 
                      style={styles.photoTouchRight}
                      onPress={handleNextPhoto}
                      activeOpacity={0.9}
                    />
                    
                    <Image 
                      source={{ uri: selectedProfile.photos[currentImageIndex] }} 
                      style={styles.profilePhoto}
                      resizeMode="cover"
                    />
                    
                    {selectedProfile.photos.length > 1 && (
                      <View style={styles.dotsContainer}>
                        {selectedProfile.photos.map((_, index) => (
                          <View 
                            key={index} 
                            style={[
                              styles.photoDot,
                              index === currentImageIndex && styles.activePhotoDot
                            ]} 
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.noPhotoContainer}>
                    <Text style={styles.noPhotoIcon}>😊</Text>
                    <Text style={styles.noPhotoSubtext}>No photo available</Text>
                  </View>
                )}

                <ScrollView style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {selectedProfile.name}, {selectedProfile.age}
                  </Text>
                  <Text style={styles.profileDescription}>
                    {selectedProfile.description || "No description"}
                  </Text>
                  {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                    <Text style={styles.profileTags}>
                      {selectedProfile.tags.join(" • ")}
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Chat List Component - shows all chats the user is part of
function ChatListScreen({ onChatSelect, onRequestsPress, requestCount }) {
  const currentUserId = getUserID();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log('📱 Current User ID:', currentUserId);

  useEffect(() => {
    console.log('🔍 Setting up Firestore listener for chats...');
    
    // Listen to all chats
    const chatsRef = collection(db, "chats");
    const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
      console.log('✅ Firestore response received');
      console.log('📊 Total chats in database:', snapshot.docs.length);
      
      const chatsList = [];
      
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('💬 Checking chat:', docSnap.id, 'Participants:', data.participants);
        
        // Only include chats where current user is a participant
        if (data.participants && data.participants.includes(currentUserId)) {
          console.log('✔ User is in this chat!');
          chatsList.push({
            id: docSnap.id,
            ...data,
          });
        }
      });
      
      console.log('📋 Total chats for this user:', chatsList.length);
      
      // Sort by last message time (most recent first)
      chatsList.sort((a, b) => {
        const aTime = a.lastMessageTime?.seconds || 0;
        const bTime = b.lastMessageTime?.seconds || 0;
        return bTime - aTime;
      });
      
      setChats(chatsList);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading chats:', error);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up chats listener');
      unsubscribe();
    };
  }, [currentUserId]);

  const formatTimeStamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const congratsMessages = [
    "Congrats on the successful double date! 🎉 Hope you all had an amazing time!",
    "That's awesome! 🌟 Glad the four of you hit it off!",
    "Woohoo! 🎊 Nothing beats a great double date with good vibes!",
    "Amazing! 💫 Here's to more memorable moments together!",
    "Fantastic news! 🥳 Double dates are the best when everyone clicks!"
  ];

  const handleEveryoneMet = (chatId, chatName) => {
    const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
    
    Alert.alert(
      "Everyone Met! 🎉",
      randomMessage,
      [
        {
          text: "Thanks!",
          onPress: async () => {
            const success = await deleteChat(chatId);
            if (!success) {
              Alert.alert("Error", "Failed to close chat");
            }
          }
        }
      ]
    );
  };

  const handleUnmatchDuo = (chatId, chatName) => {
    Alert.alert(
      "Unmatch Duo",
      `Are you sure you want to unmatch with "${chatName}"? This will permanently delete the chat and all messages.`,
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: async () => {
            const success = await deleteChat(chatId);
            if (success) {
              Alert.alert("Unmatched", "You have been unmatched from this duo");
            } else {
              Alert.alert("Error", "Failed to unmatch");
            }
          }
        }
      ]
    );
  };

  const handleReport = (chatId, chatName) => {
    Alert.alert(
      "Report Chat",
      `Are you sure you want to report "${chatName}"? This chat will be removed from your messages and flagged for moderation.`,
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            const success = await reportChat(chatId, currentUserId);
            if (success) {
              Alert.alert(
                "Reported", 
                "Thank you for reporting. Our moderation team will review this chat. The conversation has been removed from your messages."
              );
            } else {
              Alert.alert("Error", "Failed to report chat");
            }
          }
        }
      ]
    );
  };

  const showChatOptions = (chatId, chatName) => {
    Alert.alert(
      "Chat Options",
      null,
      [
        {
          text: "Everyone Met 🎉",
          onPress: () => handleEveryoneMet(chatId, chatName)
        },
        {
          text: "Unmatch Duo",
          onPress: () => handleUnmatchDuo(chatId, chatName),
          style: "destructive"
        },
        {
          text: "Report",
          onPress: () => handleReport(chatId, chatName),
          style: "destructive"
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const unreadCount = item.unreadCount?.[currentUserId] || 0;
    const isUnread = unreadCount > 0;
    const isGroup = item.isGroupChat || false;

    return (
      <View style={styles.chatItemContainer}>
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => onChatSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {isGroup ? (
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>👥</Text>
              </View>
            ) : (
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150' }} 
                style={styles.avatar} 
              />
            )}
          </View>
          
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName}>
                {item.groupName || 'Chat'}
                {isGroup && ' (Group)'}
              </Text>
              <Text style={styles.timestamp}>
                {formatTimeStamp(item.lastMessageTime)}
              </Text>
            </View>
            
            <View style={styles.messageRow}>
              <Text
                style={[
                  styles.lastMessage,
                  isUnread && styles.unreadMessage,
                ]}
                numberOfLines={1}
              >
                {item.lastMessageText || 'No messages yet'}
              </Text>
              
              {isUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => showChatOptions(item.id, item.groupName || 'Chat')}
        >
          <Text style={styles.optionsButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>💬 Messages</Text>
            <TouchableOpacity onPress={onRequestsPress} style={styles.requestsButton}>
              <Text style={styles.requestsButtonText}>💌 Requests</Text>
              {requestCount > 0 && (
                <View style={styles.requestsBadge}>
                  <Text style={styles.requestsBadgeText}>{requestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>💬 Messages</Text>
          <TouchableOpacity onPress={onRequestsPress} style={styles.requestsButton}>
            <Text style={styles.requestsButtonText}>💌 Requests</Text>
            {requestCount > 0 && (
              <View style={styles.requestsBadge}>
                <Text style={styles.requestsBadgeText}>{requestCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {chats.length === 0 ? (
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.emptyStateIcon}>💬</Text>
          <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
          <Text style={styles.emptyStateText}>
            When you match with duos, you'll be able to message them here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

// Individual Chat Screen Component
function IndividualChatScreen({ chat, onBack }) {
  const currentUserId = getUserID();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [otherUsers, setOtherUsers] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedUserForRating, setSelectedUserForRating] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!chat || !chat.id) return;

    // Mark messages as read when opening chat
    const markAsRead = async () => {
      try {
        const chatRef = doc(db, "chats", chat.id);
        await updateDoc(chatRef, {
          [`unreadCount.${currentUserId}`]: 0
        });
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    };

    markAsRead();

    // Listen to messages in real-time
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

  // Load other users' profiles
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
      
      const otherUserIds = chat.participants.filter(id => id !== currentUserId);
      const profiles = otherUserIds.map(id => allProfiles[id]).filter(Boolean);
      setOtherUsers(profiles);
    };

    loadOtherUsers();
  }, [chat]);

  const onSend = useCallback(async (newMessages = []) => {
    if (!chat || !chat.id) return;

    const message = newMessages[0];
    
    try {
      // Add message to Firestore
      const messagesRef = collection(db, "chats", chat.id, "messages");
      await addDoc(messagesRef, {
        text: message.text,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUserId,
          name: "You",
        },
      });

      // Update chat's last message and increment unread count for others
      const chatRef = doc(db, "chats", chat.id);
      const unreadUpdate = {};
      
      // Increment unread count for all other participants
      chat.participants.forEach(participantId => {
        if (participantId !== currentUserId) {
          unreadUpdate[`unreadCount.${participantId}`] = (chat.unreadCount?.[participantId] || 0) + 1;
        }
      });

      await updateDoc(chatRef, {
        lastMessageText: message.text,
        lastMessageTime: serverTimestamp(),
        ...unreadUpdate
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }, [chat, currentUserId]);

  const handleRateUser = (user) => {
    setSelectedUserForRating(user);
    setShowRatingModal(true);
  };

  const handleViewProfile = (user) => {
    setSelectedProfile(user);
    setCurrentImageIndex(0);
    setShowProfileModal(true);
  };

  const handleNextPhoto = () => {
    if (selectedProfile?.photos && currentImageIndex < selectedProfile.photos.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePreviousPhoto = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const submitRating = async (rating) => {
    if (!selectedUserForRating) return;

    const success = await saveRating(
      currentUserId,
      selectedUserForRating.id,
      rating
    );

    if (success) {
      Alert.alert("Success", "Rating submitted!");
    } else {
      Alert.alert("Error", "Failed to submit rating");
    }

    setShowRatingModal(false);
    setSelectedUserForRating(null);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.chatScreenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>{chat.groupName || "Chat"}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Other Users Info */}
      {otherUsers.length > 0 && (
        <View style={styles.otherUsersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {otherUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.otherUserChip}
                onPress={() => handleViewProfile(user)}
              >
                <Text style={styles.otherUserName}>{user.name}</Text>
                <Text style={styles.viewProfileText}>👤 View</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={({ item }) => {
          const isMyMessage = item.user._id === currentUserId;
          const senderProfile = userProfiles[item.user._id];
          const senderPhoto = senderProfile?.photos?.[0];
          
          return (
            <View
              style={[
                styles.messageRow,
                isMyMessage ? styles.myMessageRow : styles.theirMessageRow,
              ]}
            >
              {/* Avatar for other users (left side) */}
              {!isMyMessage && (
                <View style={styles.avatarContainer}>
                  {senderPhoto ? (
                    <Image source={{ uri: senderPhoto }} style={styles.messageAvatar} />
                  ) : (
                    <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                      <Text style={styles.avatarPlaceholderText}>👤</Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Message Bubble */}
              <View
                style={[
                  styles.messageBubble,
                  isMyMessage ? styles.myMessage : styles.theirMessage,
                ]}
              >
                {!isMyMessage && chat.isGroupChat && senderProfile && (
                  <Text style={styles.senderName}>{senderProfile.name}</Text>
                )}
                
                <Text 
                  style={[
                    styles.messageText,
                    isMyMessage && styles.myMessageText
                  ]}
                >
                  {item.text}
                </Text>
                <Text style={styles.messageTime}>
                  {item.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              
              {/* Avatar for current user (right side) */}
              {isMyMessage && userProfiles[currentUserId] && (
                <View style={styles.avatarContainer}>
                  {userProfiles[currentUserId].photos?.[0] ? (
                    <Image 
                      source={{ uri: userProfiles[currentUserId].photos[0] }} 
                      style={styles.messageAvatar}
                    />
                  ) : (
                    <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                      <Text style={styles.avatarPlaceholderText}>👤</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
        keyExtractor={(item) => item._id}
        inverted
        style={styles.messagesList}
        contentContainerStyle={styles.messagesListContent}
      />
      
      {/* Custom Input Composer */}
      <View style={styles.composerContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled
          ]}
          onPress={() => {
            if (inputText.trim()) {
              onSend([{
                _id: Math.random().toString(),
                text: inputText.trim(),
                createdAt: new Date(),
                user: { _id: currentUserId }
              }]);
              setInputText('');
            }
          }}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Modal */}
      {showProfileModal && selectedProfile && (
        <Modal
          visible={showProfileModal}
          animationType="slide"
          onRequestClose={() => setShowProfileModal(false)}
        >
          <SafeAreaView style={styles.profileModalContainer}>
            <View style={styles.profileModalHeader}>
              <TouchableOpacity 
                onPress={() => setShowProfileModal(false)}
                style={styles.profileModalBackButton}
              >
                <Text style={styles.profileModalBackText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.profileModalHeaderTitle}>Profile</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedUserForRating(selectedProfile);
                  setShowRatingModal(true);
                }}
                style={styles.profileModalRateButton}
              >
                <Text style={styles.profileModalRateText}>⭐ Rate</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.profileModalContent}>
              {/* Photos */}
              {selectedProfile.photos && selectedProfile.photos.length > 0 ? (
                <View style={styles.photoViewerContainer}>
                  <TouchableOpacity 
                    style={styles.photoTouchLeft}
                    onPress={handlePreviousPhoto}
                    activeOpacity={0.9}
                  />
                  <TouchableOpacity 
                    style={styles.photoTouchRight}
                    onPress={handleNextPhoto}
                    activeOpacity={0.9}
                  />
                  
                  <Image 
                    source={{ uri: selectedProfile.photos[currentImageIndex] }} 
                    style={styles.profilePhoto}
                    resizeMode="cover"
                  />
                  
                  {selectedProfile.photos.length > 1 && (
                    <View style={styles.dotsContainer}>
                      {selectedProfile.photos.map((_, index) => (
                        <View 
                          key={index} 
                          style={[
                            styles.photoDot,
                            index === currentImageIndex && styles.activePhotoDot
                          ]} 
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noPhotoContainer}>
                  <Text style={styles.noPhotoIcon}>😊</Text>
                  <Text style={styles.noPhotoSubtext}>No photos available</Text>
                </View>
              )}

              {/* Profile Info */}
              <View style={styles.profileInfoSection}>
                <Text style={styles.profileName}>
                  {selectedProfile.name}, {selectedProfile.age}
                </Text>
                
                {selectedProfile.description && (
                  <Text style={styles.profileDescription}>
                    {selectedProfile.description}
                  </Text>
                )}

                {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    <Text style={styles.tagsLabel}>Interests:</Text>
                    <View style={styles.tagsDisplay}>
                      {selectedProfile.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedUserForRating && (
        <Modal
          visible={showRatingModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRatingModal(false)}
        >
          <View style={styles.ratingModalOverlay}>
            <View style={styles.ratingModalContent}>
              <Text style={styles.ratingModalTitle}>
                Rate {selectedUserForRating.name}
              </Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => submitRating(star)}
                    style={styles.starButton}
                  >
                    <Text style={styles.starText}>⭐</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={styles.cancelRatingButton}
              >
                <Text style={styles.cancelRatingText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

export default function ChatScreen() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  // Listen for pending requests count
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
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  requestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    position: 'relative',
  },
  requestsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  requestsBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  requestsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    flexGrow: 1,
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  chatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 28,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#8e8e8e',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8e8e8e',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionsButton: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsButtonText: {
    fontSize: 20,
    color: '#8e8e8e',
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  chatScreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  otherUsersBar: {
    backgroundColor: '#f9f9f9',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  otherUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  otherUserName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  viewProfileText: {
    fontSize: 12,
    color: '#007AFF',
  },
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  ratingModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  starButton: {
    padding: 10,
  },
  starText: {
    fontSize: 40,
  },
  cancelRatingButton: {
    padding: 10,
  },
  cancelRatingText: {
    color: '#007AFF',
    fontSize: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  requestsList: {
    flex: 1,
    padding: 15,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  duoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  userCard: {
    alignItems: 'center',
    flex: 1,
  },
  userPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  noPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noPhotoText: {
    fontSize: 40,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  plusSign: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
    marginHorizontal: 10,
  },
  matchedBanner: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  matchedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  waitingBanner: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  waitingText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Profile modal styles
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileModalClose: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  photoViewerContainer: {
    height: '60%',
    position: 'relative',
  },
  photoTouchLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  photoTouchRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activePhotoDot: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noPhotoContainer: {
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noPhotoIcon: {
    fontSize: 80,
  },
  noPhotoSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  profileInfo: {
    padding: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  profileDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 10,
  },
  profileTags: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  // Custom chat message styles
  messagesList: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesListContent: {
    paddingVertical: 10,
  },
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: 5,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 15,
  },
  myMessage: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 5,
  },
  theirMessage: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 5,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Profile Modal Styles
  profileModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  profileModalBackButton: {
    padding: 5,
  },
  profileModalBackText: {
    fontSize: 16,
    color: '#007AFF',
  },
  profileModalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  profileModalRateButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  profileModalRateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  profileModalContent: {
    flex: 1,
  },
  photoViewerContainer: {
    height: 400,
    position: 'relative',
    backgroundColor: '#000',
  },
  photoTouchLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  photoTouchRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activePhotoDot: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noPhotoContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noPhotoIcon: {
    fontSize: 80,
  },
  noPhotoSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  profileInfoSection: {
    padding: 20,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  profileDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  tagsContainer: {
    marginTop: 10,
  },
  tagsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  tagsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tagText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});