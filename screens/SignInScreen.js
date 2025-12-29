import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
} from "react-native";
import React from "react";
import { TextInput, Button, useTheme, SegmentedButtons } from "react-native-paper";
// ✅ FIXED: Use React Native Firebase
import auth from "@react-native-firebase/auth";
import PhoneVerificationScreen from "./SignUpProcess/PhoneVerificationScreen";

const SignInScreen = ({ onNavigateToRegister }) => {
  const theme = useTheme();
  const [authMethod, setAuthMethod] = React.useState("phone"); // "email" or "phone"
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("+1");
  const [confirmation, setConfirmation] = React.useState(null);
  const [showPhoneVerification, setShowPhoneVerification] = React.useState(false);

  // handles phone number input to maintain +1 prefix and limit to 10 digits
  const handlePhoneNumberChange = (text) => {
    // Always ensure the number starts with +1
    if (!text.startsWith("+1")) {
      setPhoneNumber("+1");
      return;
    }

    // Extract only the digits after +1
    const digitsOnly = text.slice(2).replace(/\D/g, "");

    // Limit to 10 digits
    const limitedDigits = digitsOnly.slice(0, 10);

    setPhoneNumber("+1" + limitedDigits);
  };

  // handles email sign in
  const handleEmailSignIn = () => {
    auth()
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        console.log("Logged in with:", userCredential.user.email);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        alert("Login failed: " + errorMessage);
        console.log(errorCode + errorMessage);
      });
  };

  // handles phone sign in (sends verification code)
  const handlePhoneSignIn = async () => {
    try {
      const confirmationResult = await auth().signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirmationResult);
      setShowPhoneVerification(true);
    } catch (error) {
      console.log("Phone sign in error:", error);
      alert("Failed to send verification code: " + error.message);
    }
  };

  // handles sign in based on auth method
  const handleSignIn = () => {
    if (authMethod === "email") {
      handleEmailSignIn();
    } else {
      handlePhoneSignIn();
    }
  };

  const handlePhoneVerification = async (code) => {
    try {
      await confirmation.confirm(code);
      console.log("Phone verified and signed in successfully");
      setShowPhoneVerification(false);
    } catch (error) {
      console.log("Invalid verification code:", error);
      alert("Invalid verification code. Please try again.");
    }
  };

  const handlePhoneVerificationBack = () => {
    setShowPhoneVerification(false);
    setConfirmation(null);
  };

  // Show phone verification screen if needed
  if (showPhoneVerification) {
    return (
      <PhoneVerificationScreen
        onVerify={handlePhoneVerification}
        onBack={handlePhoneVerificationBack}
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
        Sign In
      </Text>

      <View style={styles.inputContainer}>
        <SegmentedButtons
          value={authMethod}
          onValueChange={setAuthMethod}
          buttons={[
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
          ]}
          style={styles.segmentedButtons}
        />

        {authMethod === "email" ? (
          <>
            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => setEmail(text)}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => setPassword(text)}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
          </>
        ) : (
          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            mode="outlined"
            keyboardType="phone-pad"
            placeholder="+1 (123) 456-7890"
            style={styles.input}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleSignIn} style={styles.button}>
          Login
        </Button>
      </View>

      <TouchableOpacity
        onPress={onNavigateToRegister}
        style={styles.linkContainer}
      >
        <Text style={[styles.linkText, { color: theme.colors.primary }]}>
          New to Doubly? Create an account
        </Text>
      </TouchableOpacity>
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
    marginBottom: 30,
  },
  inputContainer: {
    width: "80%",
  },
  segmentedButtons: {
    marginBottom: 20,
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
  linkContainer: {
    marginTop: 20,
    padding: 10,
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
