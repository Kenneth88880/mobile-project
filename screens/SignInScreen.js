import { StyleSheet, View, KeyboardAvoidingView, Text } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
import auth from "@react-native-firebase/auth";
import PhoneVerificationScreen from "./SignUpProcess/PhoneVerificationScreen";
import TOSPopup from "../components/TOSPopup";

/**
 * Unified phone-auth screen. Replaces the old two-button "sign in / sign up" split.
 *
 * Flow:
 *   1. User enters phone -> SMS sent
 *   2. User enters code -> confirm()
 *   3. If new user: show TOS. Accept = continue. Decline = delete account + reset.
 *   4. If returning user: nothing extra, app-level auth listener routes them.
 *
 * The `onNavigateToRegister` prop is kept for compatibility but is a no-op here
 * since signup and signin are now the same flow.
 */
const SignInScreen = ({ onNavigateToRegister }) => {
  const theme = useTheme();
  const [phoneNumber, setPhoneNumber] = React.useState("+1");
  const [confirmation, setConfirmation] = React.useState(null);
  const [showPhoneVerification, setShowPhoneVerification] =
    React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  // TOS state: only shown to new users after SMS confirm succeeds
  const [isTOSVisible, setTOSVisible] = React.useState(false);

  // Maintain +1 prefix and limit to 10 digits
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
      const isNewUser = userCredential.additionalUserInfo?.isNewUser ?? false;

      if (isNewUser) {
        // Hide the verification screen and show TOS
        setShowPhoneVerification(false);
        setTOSVisible(true);
      } else {
        // Returning user - app-level auth listener takes over
        console.log("Returning user signed in:", userCredential.user.uid);
        setShowPhoneVerification(false);
      }
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

  const handleAcceptTOS = () => {
    // User accepted - let the app-level auth listener route them to profile setup
    setTOSVisible(false);
    console.log("New user accepted TOS, proceeding to profile setup");
  };

  const handleDeclineTOS = async () => {
    // User declined - delete their just-created account and return to phone entry
    setTOSVisible(false);
    try {
      const user = auth().currentUser;
      if (user) {
        await user.delete();
      }
    } catch (error) {
      console.error("Error deleting declined account:", error);
      // Fallback: sign them out so they're not left in a weird state
      try {
        await auth().signOut();
      } catch (signOutError) {
        console.error("Error signing out:", signOutError);
      }
    }
    setConfirmation(null);
    setPhoneNumber("+1");
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
      <TOSPopup
        visible={isTOSVisible}
        onAccept={handleAcceptTOS}
        onDecline={handleDeclineTOS}
      />

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
