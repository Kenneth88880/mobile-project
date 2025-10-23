import React from "react";
import { View, StyleSheet } from "react-native";
import {
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageComposer,
} from "@cometchat/chat-uikit-react-native";
import { CometChat } from "@cometchat/chat-sdk-react-native";

/**
 * Messages
 * --------
 * A self-contained chat screen that combines the **CometChatMessageHeader**, **CometChatMessageList**,
 * and **CometChatMessageComposer** provided by the CometChat React-Native UI Kit.
 *
 * Props
 * -----
 * • `user`  – (CometChat.User, optional) Target user for a 1-to-1 conversation.
 * • `group` – (CometChat.Group, optional) Target group for a group conversation.
 * • `onBack`— () ⇒ void Callback fired when the back button in the header is pressed.
 *
 */
const Messages = ({ user, group, onBack }) => {
    
  return (
    <View style={styles.root}>
      {/* Top bar: avatar, name & back button */}
      <CometChatMessageHeader
        user={user}
        group={group}
        onBack={onBack}
        showBackButton
      />

      {/* Scrollable list of chat messages */}
      <CometChatMessageList user={user} group={group} />

      {/* Input field + action buttons (emoji, attach, send, etc.) */}
      <CometChatMessageComposer user={user} group={group} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default Messages;
