import { StyleSheet, View, KeyboardAvoidingView, Text } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
import auth from "@react-native-firebase/auth";
import PhoneVerificationScreen from "./SignUpProcess/PhoneVerificationScreen";

/**
 * Phone authentication entry point. Just handles phone -> SMS -> verify.
 * TOS acceptance is handled in SignUpScreen as the first step of profile setup,
 * so new users see TOS before completing their profile. Returning users skip
 * SignUpScreen entirely (App.js routes them directly to the main app).
 */
const SignInScreen = ({ onNavigateToRegister }) => {
  const theme = useTheme();
  const [phoneNumber, setPhoneNumber] = React.useState("+1");
  const [confirmation, setConfirmation] = React.useState(null);
  const [showPhoneVerification, setShowPhoneVerification] =
    React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const handlePhoneNumberChange = (text) => {
    if (!text.startsWith("+1")) {
      setPhoneNumber("+1");
      return;
    }
    const digitsOnly = text.slice(2).replace(/\D/g, "");
    const limitedDigits = digitsOnly.slice(0, 10);
    setPhoneNumber("+1" + limitedDigits);
  };

  const getAuthErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/invalid-phone-number":
        return "That's not a valid phone number. Please check and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a few minutes and try again.";
      case "auth/quota-exceeded":
        return "Our SMS service is temporarily unavailable. Please try again later.";
      case "auth/network-request-failed":
        return "No internet connection. Please check your network.";
      case "auth/missing-client-identifier":
        return "App verification failed. Please update the app and try again.";
      default:
        return "Failed to send verification code. Please try again.";
    }
  };

  const handleSendCode = async () => {
    if (phoneNumber.length < 12) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSending(true);
    try {
      if (__DEV__) {
        auth().settings.appVerificationDisabledForTesting = true;
      }
      const confirmationResult =
        await auth().signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirmationResult);
      setShowPhoneVerification(true);
    } catch (error) {
      console.log("Phone send code error:", error.code, error.message);
      alert(getAuthErrorMessage(error.code));
    } finally {
      setIsSending(false);
    }
  };

  const handlePhoneVerification = async (code) => {
    try {
      const userCredential = await confirmation.confirm(code);
      console.log("Phone verified, user signed in:", userCredential.user.uid);
      // App-level auth listener handles routing from here:
      //   - New user (no profile) -> SignUpScreen (which shows TOS first)
      //   - Returning user with complete profile -> main app
      //   - Returning user with incomplete profile -> SignUpScreen at next step
      setShowPhoneVerification(false);
    } catch (error) {
      console.log("Verification error:", error.code);
      let message = "Invalid verification code. Please try again.";
      if (error.code === "auth/code-expired") {
        message = "Code expired. Please request a new one.";
      } else if (error.code === "auth/invalid-verification-code") {
        message = "Incorrect code. Please check and try again.";
      }
      alert(message);
      throw error;
    }
  };

  const handleResendCode = async () => {
    try {
      if (__DEV__) {
        auth().settings.appVerificationDisabledForTesting = true;
      }
      const confirmationResult =
        await auth().signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirmationResult);
    } catch (error) {
      console.log("Resend code error:", error.code);
      alert(getAuthErrorMessage(error.code));
      throw error;
    }
  };

  const handlePhoneVerificationBack = () => {
    setShowPhoneVerification(false);
    setConfirmation(null);
  };

  if (showPhoneVerification) {
    return (
      <PhoneVerificationScreen
        onVerify={handlePhoneVerification}
        onBack={handlePhoneVerificationBack}
        onResend={handleResendCode}
        phoneNumber={phoneNumber}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior="padding"
    >
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        Welcome to Doubly
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Enter your phone number to continue
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          label="Phone Number"
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          mode="outlined"
          keyboardType="phone-pad"
          placeholder="+1 (123) 456-7890"
          style={styles.input}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleSendCode}
          style={styles.button}
          loading={isSending}
          disabled={isSending || phoneNumber.length < 12}
        >
          Continue
        </Button>
      </View>

      <Text
        style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}
      >
        New users will be asked to accept our Terms of Service after
        verification.
      </Text>
    </KeyboardAvoidingView>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  inputContainer: {
    width: "80%",
  },
  input: {
    marginBottom: 10,
  },
  buttonContainer: {
    width: "80%",
    marginTop: 20,
  },
  button: {
    marginVertical: 5,
  },
  footerText: {
    marginTop: 30,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
