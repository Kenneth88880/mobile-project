import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, TextInput, Button, View, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, Alert, Modal, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { GiftedChat, Bubble } from "react-native-gifted-chat";
import { db } from "../firebaseConfig";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, getDocs } from "firebase/firestore";
import { getUserProfile, saveRating } from "../profileService";
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

// Chat List Component - shows all chats the user is part of
function ChatListScreen({ onChatSelect }) {
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

      console.log(`Found ${chatsList.length} chats for user ${currentUserId}`);
      
      // Sort by last message time
      chatsList.sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate() || new Date(0);
        const timeB = b.lastMessageTime?.toDate() || new Date(0);
        return timeB - timeA;
      });

      setChats(chatsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const formatTimeStamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageDate = timestamp.toDate();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return messageDate.toLocaleDateString();
  };

  const congratsMessages = [
  "Amazing! So happy you four met! 🎉💕",
  "Double the love, double the fun! Congratulations to both couples! 🥳❤️",
  "This is what it's all about! So excited for all four of you! 🎊💫",
  "Two couples, one perfect match! Congrats! 💝✨",
  "Your double date story begins! Congratulations! 🌟💖",
  "Match made in heaven times two! Best wishes to both couples! 🎈💕",
  "So thrilled you all connected! Wishing all four of you the best! 🎉💗",
  "The beginning of something beautiful for both duos! Congrats! 🌸💫",
  "Four hearts, endless possibilities! So happy for you all! 💕🎊",
  "What a fantastic match! Hope you all had an amazing time together! 🌟❤️",
  "Two couples, one unforgettable connection! Congrats! 🎉💝",
  "Love it when duos connect! Best wishes to all of you! 🥳💖",
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
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Three Dot Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => showChatOptions(item.id, item.groupName || 'Chat')}
        >
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0095f6" />
        <Text style={{ marginTop: 10 }}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      
      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              When you match with other duos, a group chat will automatically appear here! 💬
            </Text>
          </View>
        }
      />
    </View>
  );
}

// Individual Chat Screen Component
function IndividualChatScreen({ chat, onBack }) {
  const currentUserId = getUserID();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false); // Separate visibility control
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userProfiles, setUserProfiles] = useState({}); // Store user profiles by userId

  useEffect(() => {
    if (!chat?.id) return;
    
    console.log('💬 Opening chat:', chat.id);
    
    // Load group members if it's a group chat
    if (chat.isGroupChat && chat.participants) {
      loadGroupMembers(chat.participants);
      loadAllUserProfiles(chat.participants);
    }
    
    // Listen to messages in this chat
    const messagesRef = collection(db, "chats", chat.id, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        _id: doc.id,
        text: doc.data().text,
        createdAt: doc.data().createdAt?.toDate(),
        user: doc.data().user,
      }));
      setMessages(msgs);
      
      // Mark messages as read
      markAsRead();
    });

    return unsubscribe;
  }, [chat?.id]);

  const loadAllUserProfiles = async (participantIds) => {
    try {
      const profiles = {};
      for (const userId of participantIds) {
        const profile = await getUserProfile(userId);
        if (profile) {
          profiles[userId] = profile;
        }
      }
      setUserProfiles(profiles);
    } catch (error) {
      console.error("Error loading user profiles:", error);
    }
  };

  const loadGroupMembers = async (participantIds) => {
    try {
      const members = [];
      for (const userId of participantIds) {
        if (userId !== currentUserId) { // Don't include yourself
          const profile = await getUserProfile(userId);
          if (profile) {
            members.push(profile);
          }
        }
      }
      setGroupMembers(members);
    } catch (error) {
      console.error("Error loading group members:", error);
    }
  };

  const markAsRead = async () => {
    try {
      const chatRef = doc(db, "chats", chat.id);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const unreadCount = data.unreadCount || {};
        unreadCount[currentUserId] = 0;
        
        await updateDoc(chatRef, {
          unreadCount: unreadCount,
        });
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const onSend = useCallback(async (messages = []) => {
    const { _id, createdAt, text, user } = messages[0];
    
    try {
      // Add message to subcollection
      await addDoc(collection(db, "chats", chat.id, "messages"), {
        _id,
        text,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUserId,
          name: "You",
        },
      });

      // Update chat document with last message info
      const chatRef = doc(db, "chats", chat.id);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const participants = data.participants || [];
        
        // Create unread counts for all participants except sender
        const unreadCount = {};
        participants.forEach(participantId => {
          if (participantId !== currentUserId) {
            const currentCount = data.unreadCount?.[participantId] || 0;
            unreadCount[participantId] = currentCount + 1;
          } else {
            unreadCount[participantId] = 0;
          }
        });

        await updateDoc(chatRef, {
          lastMessageText: text,
          lastMessageTime: serverTimestamp(),
          unreadCount: unreadCount,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [chat.id, currentUserId]);

  const handleViewProfile = (profile) => {
    console.log('👤 Opening profile for:', profile.name);
    setSelectedProfile(profile);
    setCurrentImageIndex(0);
    setShowProfileModal(true);
  };

  // Force re-render when selectedProfile changes
  useEffect(() => {
    if (selectedProfile) {
      console.log('✅ Selected profile updated:', selectedProfile.name);
      console.log('📸 Current photo index:', currentImageIndex);
      console.log('🖼️ Photos array:', selectedProfile.photos);
    }
  }, [selectedProfile, currentImageIndex]);

  const handleNextImage = () => {
    if (selectedProfile?.photos && currentImageIndex < selectedProfile.photos.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleCloseProfile = () => {
    console.log('🚪 Closing profile');
    setShowProfileModal(false);
  };

  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#007AFF',
          },
          left: {
            backgroundColor: '#E5E5EA',
          },
        }}
        textStyle={{
          right: {
            color: '#fff',
          },
          left: {
            color: '#000',
          },
        }}
      />
    );
  };

  // Show profile full screen instead of Modal
  if (showProfileModal && selectedProfile) {
    const hasPhotos = selectedProfile?.photos && Array.isArray(selectedProfile.photos) && selectedProfile.photos.length > 0;
    const currentPhoto = hasPhotos ? selectedProfile.photos[currentImageIndex] : null;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
        <View style={styles.profileModalHeader}>
          <TouchableOpacity onPress={handleCloseProfile}>
            <Text style={styles.backButtonText}>← Back to Chat</Text>
          </TouchableOpacity>
          <Text style={styles.groupInfoTitle}>{selectedProfile.name}'s Profile</Text>
        </View>
        
        <ScrollView style={styles.profileViewContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageCard}>
            {currentPhoto ? (
              <View style={{ width: '100%', height: '100%' }}>
                <Image 
                  source={{ uri: currentPhoto }} 
                  style={styles.fullProfileImage}
                  resizeMode="cover"
                />
                
                {hasPhotos && selectedProfile.photos.length > 1 && (
                  <>
                    <TouchableOpacity 
                      style={styles.leftTapZone}
                      onPress={handlePreviousImage}
                      activeOpacity={1}
                    />
                    <TouchableOpacity 
                      style={styles.rightTapZone}
                      onPress={handleNextImage}
                      activeOpacity={1}
                    />
                    
                    <View style={styles.dotsContainer}>
                      {selectedProfile.photos.map((_, index) => (
                        <View
                          key={`dot-${index}`}
                          style={[
                            styles.photoDot,
                            index === currentImageIndex && styles.activePhotoDot
                          ]}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.noPhotoContainer}>
                <Text style={styles.noPhotoText}>👤</Text>
                <Text style={styles.noPhotoSubtext}>No photo available</Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfoCard}>
            <Text style={styles.profileName}>
              {selectedProfile.name || 'Unknown'}, {selectedProfile.age || '?'}
            </Text>
            <Text style={styles.profileDescription}>
              {selectedProfile.description || 'No description'}
            </Text>
            {selectedProfile.tags && Array.isArray(selectedProfile.tags) && selectedProfile.tags.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.profileTags}>
                  {selectedProfile.tags.join(', ')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showGroupInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.groupInfoHeader}>
          <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.groupInfoTitle}>Group Members</Text>
        </View>
        
        <ScrollView style={styles.groupMembersList}>
          <Text style={styles.groupNameDisplay}>{chat.groupName || 'Group Chat'}</Text>
          <Text style={styles.memberCount}>{groupMembers.length} members</Text>
          
          {groupMembers.map((member, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.memberCard}
              onPress={() => handleViewProfile(member)}
            >
              <View style={styles.memberAvatar}>
                {member.photos && member.photos.length > 0 ? (
                  <Image source={{ uri: member.photos[0] }} style={styles.memberAvatarImage} />
                ) : (
                  <Text style={styles.memberAvatarText}>👤</Text>
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}, {member.age}</Text>
                <Text style={styles.memberLabel}>Duo Member</Text>
                <Text style={styles.tapToViewProfile}>Tap to view profile</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main chat return
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.chatHeaderContent}
          onPress={() => setShowGroupInfo(true)}
        >
          <Text style={styles.chatHeaderText}>{chat.groupName || 'Chat'}</Text>
          {chat.isGroupChat && (
            <Text style={styles.chatHeaderSubtext}>Tap to view members</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Custom Messages List */}
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
                <TouchableOpacity 
                  onPress={() => senderProfile && handleViewProfile(senderProfile)}
                  style={styles.avatarContainer}
                >
                  {senderPhoto ? (
                    <Image source={{ uri: senderPhoto }} style={styles.messageAvatar} />
                  ) : (
                    <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                      <Text style={styles.avatarPlaceholderText}>👤</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              
              {/* Message Bubble */}
              <View
                style={[
                  styles.messageBubble,
                  isMyMessage ? styles.myMessage : styles.theirMessage,
                ]}
              >
                {/* Show sender name for group chats (not your messages) */}
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
    </KeyboardAvoidingView>
  );
}

// Main Export Component
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
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
    color: '#000',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#0095f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 28,
    color: '#666',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#8e8e8e',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatHeader: {
    backgroundColor: '#1E90FF',
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#000000ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatHeaderContent: {
    flex: 1,
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  chatHeaderSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesListContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  groupInfoHeader: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  groupMembersList: {
    flex: 1,
    padding: 15,
  },
  groupNameDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#333',
  },
  memberCount: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  memberAvatarText: {
    fontSize: 24,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tapToViewProfile: {
    fontSize: 12,
    color: '#1E90FF',
    marginTop: 2,
  },
  profileModalHeader: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  profileViewContainer: {
    padding: 15,
  },
  profileImageCard: {
    width: '100%',
    height: 500,
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 15,
  },
  fullProfileImage: {
    width: '100%',
    height: '100%',
  },
  leftTapZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  rightTapZone: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '50%',
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: 100,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noPhotoText: {
    fontSize: 80,
  },
  noPhotoSubtext: {
    fontSize: 16,
    color: '#666',
  },
  profileInfoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
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
});