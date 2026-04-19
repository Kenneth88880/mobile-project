import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
  useColorScheme,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 12) / 2;

const light = {
  primary: "rgb(139, 74, 97)",
  onPrimary: "rgb(255, 255, 255)",
  primaryContainer: "rgb(255, 217, 226)",
  onPrimaryContainer: "rgb(111, 51, 73)",
  background: "rgb(255, 248, 248)",
  surface: "rgb(255, 248, 248)",
  onSurface: "rgb(34, 25, 28)",
  surfaceVariant: "rgb(242, 221, 226)",
  onSurfaceVariant: "rgb(81, 67, 71)",
  outline: "rgb(131, 115, 119)",
  outlineVariant: "rgb(213, 194, 198)",
};

const dark = {
  primary: "rgb(255, 176, 201)",
  onPrimary: "rgb(84, 29, 51)",
  primaryContainer: "rgb(111, 51, 73)",
  onPrimaryContainer: "rgb(255, 217, 226)",
  background: "rgb(25, 17, 19)",
  surface: "rgb(25, 17, 19)",
  onSurface: "rgb(239, 223, 225)",
  surfaceVariant: "rgb(81, 67, 71)",
  onSurfaceVariant: "rgb(213, 194, 198)",
  outline: "rgb(158, 140, 144)",
  outlineVariant: "rgb(81, 67, 71)",
};

const FEATURES = [
  "Diverse range of workout programs.",
  "Personalized plans based on user goals and fitness level.",
  "Advanced tracking and analytics for detailed progress monitoring.",
  "Access to exclusive live and on-demand classes.",
  "Priority customer support and coaching.",
];

const PLANS = {
  monthly: {
    label: "Monthly",
    price: "$9.99",
    sub: "Billed Monthly",
    badge: null,
    priceId: "price_1TNQySPXfOAXW8GLlLeFfhKz",
  },
  annual: {
    label: "Annual",
    price: "$79.99",
    sub: "Billed Annually",
    badge: "SAVE 33%",
    priceId: "price_1TNQyjPXfOAXW8GLFxeMxMVa",
  },
};

const API_URL = "https://us-central1-doubly-messenging.cloudfunctions.net/api";

export default function CheckoutScreen({ navigation }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sheetReady, setSheetReady] = useState(false);
  const [selected, setSelected] = useState("monthly");
  const [user, setUser] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;

  const isPremium = subStatus === "active";
  const isCanceledButActive = isPremium && !autoRenew;
  const showCancelBtn = isPremium && autoRenew;
  const showSubscribeBtn = !isPremium || !autoRenew;

  const fetchSubscriptionStatus = useCallback(async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const doc = await firestore().collection("profiles").doc(uid).get();
    const data = doc.data();
    const status = data?.subscriptionStatus ?? null;
    const renew = data?.autoRenew ?? true;

    console.log("Fetched — status:", status, "autoRenew:", renew);
    setSubStatus(status);
    setAutoRenew(renew);

    if (status !== "active") {
      setSheetReady(false);
      setLoading(false);
    }
  }, []);

  // Get auth user once
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) fetchSubscriptionStatus();
    });
    return unsubscribe;
  }, []);

  // Re-fetch every time screen comes into focus
  useEffect(() => {
    const unsubscribeFocus = navigation?.addListener("focus", () => {
      fetchSubscriptionStatus();
    });
    return unsubscribeFocus;
  }, [navigation, fetchSubscriptionStatus]);

  // Re-init payment sheet when plan or user changes
  useEffect(() => {
    if (user && !isCanceledButActive) {
      setSheetReady(false);
      initializePaymentSheet(selected);
    }
  }, [selected, user, isCanceledButActive]);

  const fetchPaymentSheetParams = async (plan) => {
    const uid = user?.uid;
    const priceId = PLANS[plan].priceId;

    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, uid }),
    });
    const data = await response.json();
    console.log("RAW backend response:", JSON.stringify(data));
    return {
      setupIntent: data.setupIntent,
      customerSessionClientSecret: data.customerSessionClientSecret,
      customer: data.customer,
    };
  };

  const initializePaymentSheet = async (plan) => {
    if (sheetReady) return;
    setLoading(false);
    setInitializing(true);
    try {
      const { setupIntent, customerSessionClientSecret, customer } =
        await fetchPaymentSheetParams(plan);

      if (!setupIntent || !customerSessionClientSecret || !customer) {
        console.error("Missing params:", { setupIntent, customerSessionClientSecret, customer });
        Alert.alert("Error", "Failed to load payment info. Please try again.");
        return;
      }

      const { error } = await initPaymentSheet({
        merchantDisplayName: "Doubly Connections Inc.",
        customerId: customer,
        customerSessionClientSecret,
        setupIntentClientSecret: setupIntent,
        allowsDelayedPaymentMethods: true,
      });

      if (error) {
        console.error("initPaymentSheet error:", JSON.stringify(error));
        Alert.alert("Error", error.message);
      } else {
        console.log("initPaymentSheet SUCCESS");
        setSheetReady(true);
        setLoading(true);
      }
    } catch (error) {
      console.error("Error initializing payment sheet:", error);
      Alert.alert("Error", "Failed to initialize payment. Please try again.");
    } finally {
      setInitializing(false);
    }
  };

  const reactivateSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/reactivate-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await firestore().collection("profiles").doc(user.uid).set({
        subscriptionStatus: "active",
        autoRenew: true,
        updatedAt: Date.now(),
      }, { merge: true });

      setAutoRenew(true);
      setSubStatus("active");
      Alert.alert("Welcome back!", "Your subscription has been reactivated. You'll continue to be billed at the end of your current period.");
    } catch (err) {
      console.error("Failed to reactivate subscription:", err);
      Alert.alert("Error", "Failed to reactivate. Please try again.");
    }
  };

  const subscribeWithPaymentSheet = async () => {
    if (!sheetReady) {
      Alert.alert("Please wait", "Payment is still loading.");
      return;
    }

    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code !== "Canceled") {
        Alert.alert(`Error code: ${error.code}`, error.message);
      }
      return;
    }

    // Show loading spinner while creating subscription
    setSubscribing(true);
    try {
      const response = await fetch(`${API_URL}/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, priceId: PLANS[selected].priceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await firestore().collection("profiles").doc(user.uid).set({
        subscriptionStatus: "active",
        autoRenew: true,
        updatedAt: Date.now(),
      }, { merge: true });

      setSubStatus("active");
      setAutoRenew(true);
      Alert.alert("Success", "Your subscription is confirmed!");
    } catch (err) {
      console.error("Failed to create subscription:", err);
      Alert.alert("Error", "Payment saved but subscription failed. Please contact support.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubscribePress = () => {
    if (isCanceledButActive) {
      reactivateSubscription();
    } else {
      subscribeWithPaymentSheet();
    }
  };

  const cancelSubscription = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? You'll keep access until the end of your current billing period.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/cancel-subscription`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid }),
              });
              const data = await response.json();
              if (!response.ok) {
                Alert.alert("Error", data.error || "Failed to cancel subscription.");
                return;
              }

              await firestore().collection("profiles").doc(user.uid).set({
                autoRenew: false,
                updatedAt: Date.now(),
              }, { merge: true });

              setAutoRenew(false);
              Alert.alert(
                "Subscription Canceled",
                "Your subscription has been canceled. You'll retain access until the end of your current billing period."
              );
            } catch (err) {
              console.error("Error canceling subscription:", err);
              Alert.alert("Error", "Something went wrong. Please try again.");
            }
          },
        },
      ]
    );
  };

  const ctaLabel = () => {
    if (isCanceledButActive) return "Reactivate Subscription";
    return `Get ${PLANS[selected].label} — ${PLANS[selected].price}`;
  };

  const ctaDisabled = !isCanceledButActive && !loading;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />

      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Text style={[styles.backArrow, { color: c.onPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.onPrimary }]}>
          {isPremium && autoRenew ? "Welcome to Premium" : "Subscribe to Premium"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {isCanceledButActive && (
          <View style={[styles.infoBanner, { backgroundColor: c.primaryContainer }]}>
            <Text style={[styles.infoBannerText, { color: c.onPrimaryContainer }]}>
              Your subscription is canceled but you still have access until the end of your billing period. Tap below to reactivate — you won't be charged again until your next renewal date.
            </Text>
          </View>
        )}

        {!autoRenew && (
          <View style={styles.plansRow}>
            {Object.entries(PLANS).map(([key, plan]) => {
              const isSelected = selected === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.planCard,
                    { backgroundColor: c.surface, borderColor: c.outlineVariant },
                    isSelected && { borderColor: c.primary, borderWidth: 2.5 },
                  ]}
                  onPress={() => setSelected(key)}
                  activeOpacity={0.85}
                >
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: c.primary }]}>
                      <Text style={[styles.checkMark, { color: c.onPrimary }]}>✓</Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, { color: c.onSurfaceVariant }]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.planPrice, { color: isSelected ? c.primary : c.onSurface }]}>
                    {plan.price}
                  </Text>
                  {plan.badge && (
                    <View style={[styles.badge, { backgroundColor: c.primaryContainer }]}>
                      <Text style={[styles.badgeText, { color: c.onPrimaryContainer }]}>
                        {plan.badge}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.planSub, { color: c.outline }]}>{plan.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}


        <View style={[styles.featuresCard, { backgroundColor: c.surfaceVariant }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.featureCheck, { color: c.primary }]}>✓</Text>
              <Text style={[styles.featureText, { color: c.onSurfaceVariant }]}>{f}</Text>
            </View>
          ))}
        </View>

        {showSubscribeBtn && (
          initializing && !isCanceledButActive ? (
            <ActivityIndicator size="large" color={c.primary} style={{ marginVertical: 16 }} />
          ) : subscribing ? (
            <View style={{ marginVertical: 16, alignItems: "center", gap: 12 }}>
              <ActivityIndicator size="large" color={c.primary} />
              <Text style={{ color: c.outline, fontSize: 14 }}>Setting up your subscription...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.ctaBtn,
                { backgroundColor: c.primary },
                ctaDisabled && styles.ctaBtnDisabled,
              ]}
              disabled={ctaDisabled}
              onPress={handleSubscribePress}
              activeOpacity={0.9}
            >
              <Text style={[styles.ctaText, { color: c.onPrimary }]}>
                {ctaLabel()}
              </Text>
            </TouchableOpacity>
          )
        )}

        {showCancelBtn && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: c.outline }]}
            onPress={cancelSubscription}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: c.outline }]}>
              Cancel Subscription
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.legal, { color: c.outline }]}>
          Cancel anytime. Billed automatically. By subscribing you agree to our Terms of Service.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  backArrow: {
    fontSize: 32,
    fontWeight: "300",
    lineHeight: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  scroll: {
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  infoBanner: {
    width: "100%",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    textAlign: "center",
  },
  plansRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    width: "100%",
  },
  planCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 130,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    position: "relative",
  },
  checkCircle: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 12, fontWeight: "700" },
  planLabel: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  planPrice: { fontSize: 28, fontWeight: "800", marginBottom: 6 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  planSub: { fontSize: 12, fontWeight: "500" },
  featuresCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    gap: 14,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  featureCheck: { fontSize: 15, fontWeight: "700", marginTop: 1 },
  featureText: { fontSize: 14, fontWeight: "500", flex: 1, lineHeight: 20 },
  ctaBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    marginBottom: 16,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  cancelText: { fontSize: 14, fontWeight: "600" },
  legal: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});