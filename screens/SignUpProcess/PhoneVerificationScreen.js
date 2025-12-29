import { StyleSheet, View, KeyboardAvoidingView, Text } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";

const PhoneVerificationScreen = ({ onVerify, onBack, phoneNumber }) => {
  const theme = useTheme();
  const [code, setCode] = React.useState("");

  const handleVerify = () => {
    if (!code || code.length < 6) {
      alert("Please enter the 6-digit verification code");
      return;
    }
    onVerify(code);
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
          onChangeText={(text) => setCode(text)}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleVerify} style={styles.button}>
          Verify
        </Button>
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
