import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native";
import {
  CometChatConversations,
  CometChatUIKit,
  CometChatUiKitConstants,
  UIKitSettings,
  CometChatThemeProvider,
} from "@cometchat/chat-uikit-react-native";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import { APP_ID, REGION, AUTH_KEY } from "./const";
import Messages from "./messages";

/* -------------------------------------------------------------------------- */
/*  ⚙️  Replace the placeholders below with your own CometChat credentials.    */
/* -------------------------------------------------------------------------- */
const APP_ID = APP_ID; // e.g. "123456abc"
const AUTH_KEY = AUTH_KEY; // e.g. "0b1c2d3e4f5g6h7i8j9k"
const REGION =  REGION; // e.g. "us" | "eu" | "in"
const DEMO_UID = "user4"; // e.g. "john_doe"
/* -------------------------------------------------------------------------- */

/**
 * App
 * ---
 * The root component:
 *  1. Initializes the CometChat UI Kit.
 *  2. Logs a demo user in.
 *  3. Shows either the conversation list or an active chat screen.
 */
const App = () => {
  /* ------------------------------------------------------------------ */
  /* Local state                                                         */
  /* ------------------------------------------------------------------ */
  const [loggedIn, setLoggedIn] = useState(false);
  const [messageUser, setMessageUser] = useState(null);
  const [messageGroup, setMessageGroup] = useState(null);

  /* ------------------------------------------------------------------ */
  /* One-time initialization                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const init = async () => {
      // 1️⃣  Configure the UI Kit.
      const uiKitSettings = new UIKitSettings({
        appId: APP_ID,
        authKey: AUTH_KEY,
        region: REGION,
        subscriptionType: CometChat.AppSettings.SUBSCRIPTION_TYPE_ALL_USERS,
      });

      try {
        await CometChatUIKit.init(uiKitSettings);
        console.log("[CometChatUIKit] initialized");

        // 2️⃣  Login.
        await CometChatUIKit.login({ uid: DEMO_UID });
        setLoggedIn(true);
      } catch (err) {
        console.error("[CometChatUIKit] init/login error", err);
      }
    };

    init();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <CometChatThemeProvider>
        {/* Show conversations only after the user is logged in */}
        {loggedIn && (
          <>
            {/* Conversation list (hidden when a chat is open) */}
            <CometChatConversations
              style={{
                containerStyle: {
                  display: messageUser || messageGroup ? "none" : "flex",
                },
              }}
              onItemPress={(conversation) => {
                if (
                  conversation.getConversationType() ===
                  CometChatUiKitConstants.ConversationTypeConstants.user
                ) {
                  setMessageUser(conversation.getConversationWith());
                  return;
                }
                setMessageGroup(conversation.getConversationWith());
              }}
            />

            {/* Active chat screen */}
            {(messageUser || messageGroup) && (
              <Messages
                user={messageUser}
                group={messageGroup}
                onBack={() => {
                  setMessageUser(null);
                  setMessageGroup(null);
                }}
              />
            )}
          </>
        )}
      </CometChatThemeProvider>
    </SafeAreaView>
  );
};

export default App;
