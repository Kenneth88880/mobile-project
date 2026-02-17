import { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { URL } from "../services/stripeConfig";
import { useStripe } from "@stripe/stripe-react-native";

const API_URL = "https://us-central1-doubly-messenging.cloudfunctions.net/api";

export default function CheckoutScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Server response:", JSON.stringify(data));

    return {
      paymentIntent: data.paymentIntent,
      customerSessionClientSecret: data.customerSessionClientSecret,
      customer: data.customer,
    };
  };

  const initializePaymentSheet = async () => {
    try {
      const { paymentIntent, customerSessionClientSecret, customer } =
        await fetchPaymentSheetParams();
      console.log("Params:", JSON.stringify({ paymentIntent, customerSessionClientSecret, customer }));

      const { error } = await initPaymentSheet({
        merchantDisplayName: "Example, Inc.",
        customerId: customer,
        customerSessionClientSecret: customerSessionClientSecret,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: "Jane Doe",
        },
      });

      console.log("initPaymentSheet error:", error);

      if (!error) {
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
    const { error } = await presentPaymentSheet();
    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      Alert.alert("Success", "Your order is confirmed!");
    }
  };

  useEffect(() => {
    initializePaymentSheet();
  }, []);

  return (
    <View style={styles.container}>
      {initializing ? (
        <ActivityIndicator size="large" color="#8B4A61" />
      ) : (
        <TouchableOpacity
          style={[styles.button, !loading && styles.buttonDisabled]}
          disabled={!loading}
          onPress={openPaymentSheet}
        >
          <Text style={styles.buttonText}>Checkout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#8B4A61",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
