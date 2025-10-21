import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from "react-native";

import styles from "./styles";
import ChatScreen from "./ChatScreen";
import ProfileScreen from "./ProfileScreen";
import DatingScreen from "./DatingScreen";
import ExploreScreen from "./ExploreScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState("dating"); // "dating" | "profile" | "messages"

  return (
    <SafeAreaView style={styles.container}>
      {/* --- MAIN CONTENT --- */}
      {activeTab === "dating" && <DatingScreen />}
      {activeTab === "explore" && <ExploreScreen />}
      {activeTab === "profile" && <ProfileScreen />}
      {activeTab === "messages" && (
        <View style={styles.container}>
          <Text style={styles.profileText}>💬 Messages Page</Text>
          <ChatScreen />
        </View>
      )}

      {/* --- BOTTOM NAVIGATION --- */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === "dating" && styles.activeButton]}
          onPress={() => setActiveTab("dating")}
        >
          <Text style={styles.navText}>💘 Dating</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === "explore" && styles.activeButton]}
          onPress={() => setActiveTab("explore")}
        >
          <Text style={styles.navText}>🧭 Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === "messages" && styles.activeButton]}
          onPress={() => setActiveTab("messages")}
        >
          <Text style={styles.navText}>💬 Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, activeTab === "profile" && styles.activeButton]}
          onPress={() => setActiveTab("profile")}
        >
          <Text style={styles.navText}>👤 Profile</Text>
        </TouchableOpacity>
        
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
