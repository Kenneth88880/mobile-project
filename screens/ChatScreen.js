import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, TextInput, Button, View, TouchableOpacity, ScrollView } from "react-native";
import { GiftedChat, Bubble } from "react-native-gifted-chat";
import { db } from "../firebaseConfig";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { CURRENT_USER_ID } from "../UserConfig";

// Get user ID from config
const getUserID = () => {
  return CURRENT_USER_ID;
};

// Global variables used to track if a new chat has been created and its name 
var chatCreated = false;
var chatOpened = false;
var inputtedChatName = "";
var openChatName = "";

// Resets variables when they leave the screen
export function ResetCreation() {
  chatCreated = false;
  inputtedChatName = "";
}

export function ResetOpening() {
  chatOpened = false;
  openChatName = "";
}

// Creates a new chat with a name 
export function CreateChat() {
  const [chatName, setChatName] = useState("");
  const [messages, setMessages] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [activeChatName, setActiveChatName] = useState("");

  const createNewChat = async () => {
    if (chatName.trim() === "") {
      alert("Please enter a chat name");
      return;
    }

    try {
      await addDoc(collection(db, getUserID(), chatName, "messages"), {
        text: 'Welcome to the new chat!',
        createdAt: new Date(),
        user: { _id: 'system', name: 'System' }
      });
      alert(`Chat "${chatName}" created successfully!`);
      setActiveChatName(chatName);
      setChatName("");
      setIsActive(true);
    } catch (error) {
      console.error("Error creating chat: ", error);
      alert("Failed to create chat.");
    }
  };

  useEffect(() => {
    if (!activeChatName) return;
    
    const q = query(collection(db, getUserID(), activeChatName, "messages"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          _id: doc.id,
          text: doc.data().text,
          createdAt: doc.data().createdAt?.toDate(),
          user: doc.data().user,
        }))
      );
    });
    return unsubscribe;
  }, [activeChatName]);

  const onSend = useCallback(async (messages = []) => {
    const { _id, createdAt, text, user } = messages[0];
    await addDoc(collection(db, getUserID(), activeChatName, "messages"), {
      _id,
      text,
      createdAt: serverTimestamp(),
      user,
    });
  }, [activeChatName]);

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

  if (isActive) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatHeaderText}>{"Chatting with " + activeChatName}</Text>
        </View>
        <GiftedChat
          messages={messages}
          onSend={(msgs) => onSend(msgs)}
          user={{
            _id: 1,
            name: "Test User",
          }}
          renderBubble={renderBubble}
          alwaysShowSend
          scrollToBottom
          keyboardShouldPersistTaps='handled'
        />
      </View>
    );
  } else {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create a New Chat</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a name for the new chat"
          value={chatName}
          onChangeText={setChatName}
        />
        <Button title="Create Chat" onPress={createNewChat} />
      </View>
    );
  }
}

// Opens existing chat
export function OpenChat() {
  const [chatName, setChatName] = useState("");
  const [messages, setMessages] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [activeChatName, setActiveChatName] = useState("");

  const openChat = async () => {
    if (chatName.trim() === "") {
      alert("Please enter a chat name");
      return;
    }

    try {
      setActiveChatName(chatName);
      setChatName("");
      setIsActive(true);
    } catch (error) {
      console.error("Error opening chat: ", error);
      alert("Failed to open chat.");
    }
  };

  useEffect(() => {
    if (!activeChatName) return;
    
    const q = query(collection(db, getUserID(), activeChatName, "messages"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          _id: doc.id,
          text: doc.data().text,
          createdAt: doc.data().createdAt?.toDate(),
          user: doc.data().user,
        }))
      );
    });
    return unsubscribe;
  }, [activeChatName]);

  const onSend = useCallback(async (messages = []) => {
    const { _id, createdAt, text, user } = messages[0];
    await addDoc(collection(db, getUserID(), activeChatName, "messages"), {
      _id,
      text,
      createdAt: serverTimestamp(),
      user,
    });
  }, [activeChatName]);

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

  if (isActive) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatHeaderText}>{"Chatting with " + activeChatName}</Text>
        </View>
        <GiftedChat
          messages={messages}
          onSend={(msgs) => onSend(msgs)}
          user={{
            _id: 1,
            name: "Test User",
          }}
          renderBubble={renderBubble}
          alwaysShowSend
          scrollToBottom
          keyboardShouldPersistTaps='handled'
        />
      </View>
    );
  } else {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.title}>Open Text Chat</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a name for the existing chat"
          value={chatName}
          onChangeText={setChatName}
        />
        <Button title="Open Chat" onPress={openChat} />
      </View>
    );
  }
}

// Main ChatScreen component - shows list of options
export default function ChatScreen() {
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showOpenChat, setShowOpenChat] = useState(false);

  // Reset when going back
  useEffect(() => {
    if (!showCreateChat) {
      ResetCreation();
    }
    if (!showOpenChat) {
      ResetOpening();
    }
  }, [showCreateChat, showOpenChat]);

  if (showCreateChat) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.backButtonContainer}>
          <Button title="← Back" onPress={() => setShowCreateChat(false)} />
        </View>
        <CreateChat />
      </View>
    );
  }

  if (showOpenChat) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.backButtonContainer}>
          <Button title="← Back" onPress={() => setShowOpenChat(false)} />
        </View>
        <OpenChat />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.profileText}>💬 Messages</Text>
      
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setShowOpenChat(true)}
      >
        <Text style={styles.menuButtonText}>📱 Open Existing Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setShowCreateChat(true)}
      >
        <Text style={styles.menuButtonText}>➕ Create New Chat</Text>
      </TouchableOpacity>

      <Text style={styles.instructionText}>
        Create a chat or open an existing one to start messaging!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  chatHeader: {
    backgroundColor: '#1E90FF',
    padding: 15,
    alignItems: 'center',
  },
  chatHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  chatContainer: {
    backgroundColor: '#fff',
    width: '100%',
    flex: 1,
  },
  formContainer: {
    width: '100%',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileText: {
    fontSize: 24,
    color: "white",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  menuButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '90%',
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },
});