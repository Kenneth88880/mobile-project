import { useState, useEffect } from "react";
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
  const [selected, setSelected] = useState("monthly");
  const [user, setUser] = useState(null);

  const scheme = useColorScheme();
  const c = scheme === "dark" ? dark : light;

  // Wait for Firebase auth to be ready
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      console.log("Auth state changed, uid:", firebaseUser?.uid);
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  // Only initialize once user is confirmed
  useEffect(() => {
    if (user) {
      initializePaymentSheet(selected);
    }
  }, [selected, user]);

  const fetchPaymentSheetParams = async (plan) => {
    const uid = user?.uid;
    const priceId = PLANS[plan].priceId;
    console.log("Fetching with uid:", uid, "priceId:", priceId);

    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, uid }),
    });
    const data = await response.json();
    console.log("RAW backend response:", JSON.stringify(data));
    return {
      paymentIntent: data.paymentIntent,
      customerSessionClientSecret: data.customerSessionClientSecret,
      customer: data.customer,
    };
  };

  const initializePaymentSheet = async (plan) => {
    setLoading(false);
    setInitializing(true);
    try {
      const { paymentIntent, customerSessionClientSecret, customer } =
        await fetchPaymentSheetParams(plan);

      if (!paymentIntent || !customerSessionClientSecret || !customer) {
        console.error("Missing params:", { paymentIntent, customerSessionClientSecret, customer });
        Alert.alert("Error", "Failed to load payment info. Please try again.");
        return;
      }

      const { error } = await initPaymentSheet({
        merchantDisplayName: "Example, Inc.",
        customerId: customer,
        customerSessionClientSecret,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: { name: "Jane Doe" },
      });

      if (error) {
        console.error("initPaymentSheet error:", JSON.stringify(error));
        Alert.alert("Error", error.message);
      } else {
        console.log("initPaymentSheet SUCCESS");
        setLoading(true);
      }
    } catch (error) {
      console.error("Error initializing payment sheet:", error);
      Alert.alert("Error", "Failed to initialize payment. Please try again.");
    } finally {
      setInitializing(false);
    }
  };

  const openPaymentSheet = async () => {
    console.log("Opening payment sheet...");
    const { error } = await presentPaymentSheet();
    if (error) {
      console.error("presentPaymentSheet error:", JSON.stringify(error));
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      Alert.alert("Success", "Your subscription is confirmed!");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />

      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Text style={[styles.backArrow, { color: c.onPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.onPrimary }]}>Subscribe to Premium</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={[styles.featuresCard, { backgroundColor: c.surfaceVariant }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.featureCheck, { color: c.primary }]}>✓</Text>
              <Text style={[styles.featureText, { color: c.onSurfaceVariant }]}>{f}</Text>
            </View>
          ))}
        </View>

        {initializing ? (
          <ActivityIndicator size="large" color={c.primary} style={{ marginVertical: 16 }} />
        ) : (
          <TouchableOpacity
            style={[
              styles.ctaBtn,
              { backgroundColor: c.primary },
              !loading && styles.ctaBtnDisabled,
            ]}
            disabled={!loading}
            onPress={openPaymentSheet}
            activeOpacity={0.9}
          >
            <Text style={[styles.ctaText, { color: c.onPrimary }]}>
              Get {PLANS[selected].label} — {PLANS[selected].price}
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
  legal: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});