import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, TextInput, Button, View, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, Alert } from "react-native";
import { GiftedChat, Bubble } from "react-native-gifted-chat";
import { db } from "../firebaseConfig";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, getDocs } from "firebase/firestore";
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

  const handleDeleteChat = (chatId, chatName) => {
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete "${chatName}"? This will permanently delete all messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteChat(chatId);
            if (success) {
              Alert.alert("Deleted", "Chat has been removed");
            } else {
              Alert.alert("Error", "Failed to delete chat");
            }
          }
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
        
        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(item.id, item.groupName || 'Chat')}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
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

  useEffect(() => {
    if (!chat?.id) return;
    
    console.log('💬 Opening chat:', chat.id);
    
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
        const unreadCount = data.unreadCount || {};
        
        // Increment unread count for all participants except sender
        participants.forEach(participantId => {
          if (participantId !== currentUserId) {
            unreadCount[participantId] = (unreadCount[participantId] || 0) + 1;
          }
        });

        await updateDoc(chatRef, {
          lastMessageText: text,
          lastMessageTime: serverTimestamp(),
          unreadCount: unreadCount,
        });
      }

      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [chat.id, currentUserId]);

  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#000000',
          },
          left: {
            backgroundColor: '#E5E5EA',
          },
        }}
      />
    );
  };

  const renderComposer = (props) => {
    return (
      <View style={styles.composerContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          returnKeyType="default"
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage = {
        _id: Math.random().toString(),
        text: inputText.trim(),
        createdAt: new Date(),
        user: { _id: currentUserId, name: "You" }
      };
      onSend([newMessage]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderContent}>
          <Text style={styles.chatHeaderText}>{chat.groupName || "Chat"}</Text>
          {chat.isGroupChat && (
            <Text style={styles.chatHeaderSubtext}>
              {chat.participants?.length || 0} participants
            </Text>
          )}
        </View>
      </View>
      <GiftedChat
        messages={messages}
        onSend={(msgs) => onSend(msgs)}
        user={{
          _id: currentUserId,
          name: "You",
        }}
        renderBubble={renderBubble}
        renderComposer={renderComposer}
        text={inputText}
        onInputTextChanged={setInputText}
        scrollToBottom
      />
    </View>
  );
}

// Main ChatScreen - now primarily shows the chat list
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
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
  deleteButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
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
    color: 'white',
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
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});