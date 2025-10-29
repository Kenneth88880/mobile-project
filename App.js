import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { UserProvider } from "./context/UserContext";

import DatingScreen from "./screens/DatingScreen";
import ExploreScreen from "./screens/ExploreScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ChatScreen from "./screens/ChatScreen";
import PremiumScreen from "./screens/PremiumScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState("dating");

  return (
    <UserProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          {activeTab === "dating" && <DatingScreen />}
          {activeTab === "explore" && <ExploreScreen />}
          {activeTab === "profile" && <ProfileScreen />}
          {activeTab === "messages" && <ChatScreen />}
          {activeTab === "premium" && <PremiumScreen />}
        </View>

        <View style={styles.navBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navScrollContent}
          >
            {["dating", "explore", "messages", "premium", "profile"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.navButton, activeTab === tab && styles.activeButton]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={styles.navText}>
                  {tab === "dating" ? "💘 Dating" :
                   tab === "explore" ? "🧭 Explore" :
                   tab === "messages" ? "💬 Messages" :
                   tab === "premium" ? "⭐ Premium" :
                   "👤 Profile"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <StatusBar style="auto" />
      </SafeAreaView>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#1E90FF"
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#1E90FF"
  },
  navBar: {
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  navScrollContent: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  navButton: { 
    padding: 10,
    marginHorizontal: 5,
    minWidth: 100,
    alignItems: "center",
  },
  activeButton: { 
    backgroundColor: "#1E90FF", 
    borderRadius: 10 
  },
  navText: { 
    fontSize: 16,
    textAlign: "center",
  },
});