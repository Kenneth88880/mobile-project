import { StyleSheet, View, KeyboardAvoidingView, Text } from "react-native";
import React from "react";
import { Button, useTheme } from "react-native-paper";
import auth from "@react-native-firebase/auth";

const EmailVerificationScreen = ({
  onVerified,
  onBack,
  email,
  onResendEmail,
}) => {
  const theme = useTheme();
  const [isChecking, setIsChecking] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        alert("No user found. Please sign up again.");
        if (onBack) onBack();
        return;
      }

      // Reload user data to get the latest emailVerified status
      await user.reload();
      const refreshedUser = auth().currentUser;

      if (refreshedUser.emailVerified) {
        console.log("Email verified successfully");
        onVerified();
      } else {
        alert(
          "Email not verified yet. Please check your inbox or spam folder to find the verification link."
        );
      }
    } catch (error) {
      console.log("Error checking verification:", error);
      alert("Error checking verification status. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      if (onResendEmail) {
        await onResendEmail();
        alert("Verification email resent! Please check your inbox.");
      }
    } catch (error) {
      console.log("Error resending email:", error);
      alert("Failed to resend verification email: " + error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior="padding"
    >
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        Verify Email
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.onBackground }]}>
        We've sent a verification email to {email}
      </Text>

      <Text style={[styles.instructions, { color: theme.colors.onBackground }]}>
        Please check your inbox (including spam folder) and click the
        verification link. Then tap "I've Verified" below.
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleCheckVerification}
          style={styles.button}
          loading={isChecking}
          disabled={isChecking || isResending}
        >
          I've Verified
        </Button>

        <Button
          mode="outlined"
          onPress={handleResendEmail}
          style={styles.button}
          loading={isResending}
          disabled={isChecking || isResending}
        >
          Resend Email
        </Button>

        {onBack && (
          <Button
            mode="text"
            onPress={onBack}
            style={styles.button}
            disabled={isChecking || isResending}
          >
            Back
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default EmailVerificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  instructions: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: "80%",
    marginTop: 20,
  },
  button: {
    marginVertical: 5,
  },
});
