import React, { useState } from "react";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { UserProvider } from "./context/UserContext";
import { StatusBar } from "expo-status-bar";
import { StripeProvider } from '@stripe/stripe-react-native';

import DatingScreen from "./screens/DatingScreen";
import ExploreScreen from "./screens/ExploreScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ChatScreen from "./screens/ChatScreen";
import PremiumScreen from "./screens/PremiumScreen";
import RequestsScreen from "./screens/RequestsScreen";
import CheckoutScreen from "./screens/PaymentScreen";
import { STRIPE_PUBLISHABLE_KEY} from "./stripeConfig";

export default function App() {
  const [activeTab, setActiveTab] = useState("dating");

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <UserProvider>
        <SafeAreaView style={styles.container}>
          {/* IMPORTANT: Messages tab gets full flex, others get normal layout */}
                  {activeTab === "payment" ? (
                    <View style={styles.fullScreenContainer}>
                      <CheckoutScreen />
                    </View>
                  ) : (            <View style={styles.contentContainer}>
              {activeTab === "dating" && <DatingScreen />}
              {activeTab === "explore" && <ExploreScreen />}
              {activeTab === "requests" && <RequestsScreen />}
              {activeTab === "messages" && <ChatScreen />}
              {activeTab === "profile" && <ProfileScreen />}
              {activeTab === "premium" && <PremiumScreen />}
              {activeTab === "payment" && <CheckoutScreen />}
            </View>
          )}

          <View style={styles.navBar}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.navScrollContent}
            >
              {["dating", "explore", "requests", "messages", "premium", "payment", "profile"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.navButton, activeTab === tab && styles.activeButton]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={styles.navText}>
                    {tab === "dating" ? "💘 Dating" :
                     tab === "explore" ? "🧭 Explore" :
                     tab === "requests" ? "💌 Requests" :
                     tab === "messages" ? "💬 Messages" :
                     tab === "premium" ? "⭐ Premium" :
                     tab === "payment" ? "💳 Payment" :
                     "👤 Profile"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <StatusBar style="auto" />
        </SafeAreaView>
      </UserProvider>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#D1D1D1"
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#D1D1D1"
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#D1D1D1"
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
    backgroundColor: "#D1D1D1", 
    borderRadius: 10 
  },
  navText: { 
    fontSize: 16,
    textAlign: "center",
  },
});