import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';

// TODO: Replace with your actual server URL
// For local development on physical device, use your computer's IP address (not localhost)
// Example: 'http://192.168.1.100:3000'
const API_URL = 'http://YOUR_SERVER_IP:3000';

export default function CheckoutScreen({ isActive }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      console.log('Creating checkout session...');
      
      // Call your server to create a Checkout Session
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const { url } = await response.json();
      
      console.log('Checkout session created, opening URL:', url);

      // Open the Stripe Checkout page in the browser
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open payment page');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert(
        'Connection Error',
        'Could not connect to payment server. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Premium Membership</Text>
        <Text style={styles.description}>
          Unlock exclusive features and get the best experience
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>$9.99</Text>
          <Text style={styles.priceSubtext}>per month</Text>
        </View>

        <View style={styles.featuresContainer}>
          <FeatureItem text="Unlimited matches" />
          <FeatureItem text="Advanced filters" />
          <FeatureItem text="See who likes you" />
          <FeatureItem text="Ad-free experience" />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#635BFF" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleCheckout}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Subscribe Now</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.secureText}>
          🔒 Secure payment powered by Stripe
        </Text>
      </View>
    </View>
  );
}

function FeatureItem({ text }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#635BFF',
  },
  priceSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    fontSize: 20,
    color: '#635BFF',
    marginRight: 10,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#635BFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  secureText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});