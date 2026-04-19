import { StyleSheet, View, KeyboardAvoidingView, Text } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";

const PhoneVerificationScreen = ({
  onVerify,
  onBack,
  onResend,
  phoneNumber,
}) => {
  const theme = useTheme();
  const [code, setCode] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(60);

  // Countdown timer for resend button
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      alert("Please enter the 6-digit verification code");
      return;
    }
    setIsVerifying(true);
    try {
      await onVerify(code);
    } catch (error) {
      // Parent handles error display; we just clear loading state
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !onResend) return;
    setIsResending(true);
    try {
      await onResend();
      setResendCooldown(60);
      setCode("");
    } catch (error) {
      // Parent handles error display
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
        Verify Phone Number
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.onBackground }]}>
        Enter the 6-digit code sent to {phoneNumber}
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          label="Verification Code"
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, ""))}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
          autoFocus
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleVerify}
          style={styles.button}
          loading={isVerifying}
          disabled={isVerifying || code.length < 6}
        >
          Verify
        </Button>

        {onResend && (
          <Button
            mode="text"
            onPress={handleResend}
            disabled={resendCooldown > 0 || isResending}
            loading={isResending}
            style={styles.button}
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
          </Button>
        )}

        {onBack && (
          <Button mode="outlined" onPress={onBack} style={styles.button}>
            Back
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default PhoneVerificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
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
});
