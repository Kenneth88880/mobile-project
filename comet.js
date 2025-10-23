import React, { useEffect } from "react";
import {
  CometChatUIKit,
  UIKitSettings,
} from "@cometchat/chat-uikit-react-native";
import { CometChat } from "@cometchat/chat-sdk-react-native";

const CometChatInit = () => {
  useEffect(() => {
    const uikitSettings = new UIKitSettings({
      appId: "YOUR_APP_ID",        // Replace with your CometChat App ID
      authKey: "YOUR_AUTH_KEY",    // Replace with your CometChat Auth Key
      region: "YOUR_REGION",       // e.g., "us", "in"
      subscriptionType: CometChat.AppSettings.SUBSCRIPTION_TYPE_ALL_USERS,
    });

    CometChatUIKit.init(uikitSettings)
      .then(() => {
        console.log("CometChatUIKit successfully initialized");
      })
      .catch((error) => {
        console.log("Initialization failed with exception:", error);
      });
  }, []);

  return null;
};

export default CometChatInit;
