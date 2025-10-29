import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { GiftedChat, Bubble } from "react-native-gifted-chat";
import { db } from "../firebaseConfig.js";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { screensEnabled } from "react-native-screens";


export default function ChatScreen() {
  const [messages, setMessages] = useState([]);

  // handles messages receiving
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
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
  }, []);

  // sends messages
  const onSend = useCallback(async (messages = []) => {
    const { _id, createdAt, text, user } = messages[0];
    await addDoc(collection(db, "messages"), {
      _id,
      text,
      createdAt: serverTimestamp(),
      user,
    });
  }, []);

  // changes bubble colour 
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

  // renders chat
  return (
    <View style={{ 
      backgroundColor: 'fff', 
      width: 300, 
      height: 200, 
      flex: 1
    }}>
      <GiftedChat
        messages={messages}
        onSend={(msgs) => onSend(msgs)}
        user={{
          _id: 1,
          name: "Test User",
        }}
        renderBubble={renderBubble}
      />
    </View>
  );
}
