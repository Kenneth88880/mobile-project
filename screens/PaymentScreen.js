import { useStripe } from '@stripe/stripe-react-native';
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function CheckoutScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const initializePaymentSheet = async () => {
    try {
      // Replace with your computer's IP address
     const response = await fetch('https://avis-nonexpanded-ashton.ngrok-free.dev/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1099 }),
    });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment intent');
      }
      
      const { clientSecret } = await response.json();

      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Doubly',
      });

      if (error) {
        console.error('Init error:', error);
        Alert.alert('Error', error.message);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Payment initialization error:', error);
      Alert.alert('Error', error.message);
      return false;
    }
  };

  const openPaymentSheet = async () => {
    setLoading(true);
    
    try {
      const initialized = await initializePaymentSheet();
      
      if (!initialized) {
        setLoading(false);
        return;
      }
      
      const { error } = await presentPaymentSheet();

      if (error) {
        Alert.alert('Payment Failed', error.message);
      } else {
        Alert.alert('Success', 'Your payment was successful!');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={openPaymentSheet}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Processing...' : 'Checkout'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});