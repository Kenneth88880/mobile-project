import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import ChatScreen from "./ChatScreen";
import ProfileScreen from "./ProfileScreen";
import DatingScreen from "./DatingScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState("dating"); // "dating" | "profile" | "messages"

  return (
    <SafeAreaView style={styles.container}>
      {/* --- MAIN CONTENT --- */}
      {activeTab === "dating" && <DatingScreen />}
      {activeTab === "profile" && <ProfileScreen />}
      {activeTab === "messages" && (
        <View style={styles.profileContainer}>
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
          style={[styles.navButton, activeTab === "profile" && styles.activeButton]}
          onPress={() => setActiveTab("profile")}
        >
          <Text style={styles.navText}>👤 Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === "messages" && styles.activeButton]}
          onPress={() => setActiveTab("messages")}
        >
          <Text style={styles.navText}>💬 Messages</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "dodgerblue",
    alignItems: "center",
    justifyContent: "center",
  },
  profileContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    color: "white",
    fontSize: 18,
    marginBottom: 10,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    width: "100%",
    paddingVertical: 10,
  },
  navButton: {
    padding: 10,
  },
  activeButton: {
    borderBottomWidth: 2,
    borderBottomColor: "dodgerblue",
  },
  navText: {
    fontSize: 16,
  },
});
