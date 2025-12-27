import { StyleSheet, View, KeyboardAvoidingView, Text, TouchableOpacity } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
import TOSPopup from "../components/TOSPopup";
// ✅ FIXED: Use React Native Firebase
import auth from "@react-native-firebase/auth";

const SignUpScreen = ({ onNavigateToSignIn }) => {
  const theme = useTheme();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isTOSVisible, setTOSVisible] = React.useState(false);

  const handleRegisterPress = () => {
    setTOSVisible(true);
  };

  const handleAcceptTOS = () => {
    handleRegister();
    setTOSVisible(false);
  };

  const handleDeclineTOS = () => {
    setTOSVisible(false);
  };

  // handles sign up
  const handleRegister = () => {
    auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log("Registered with:", user.email);
        alert("Please Click the Edit Button to set up your profile!");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode + errorMessage);
        alert("Sign up failed: " + errorMessage);
      });
  };

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
        Sign Up
      </Text>

      <View style={styles.inputContainer}>
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
      </View>

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleRegisterPress} style={styles.button}>
          Register
        </Button>
      </View>

      <TouchableOpacity onPress={onNavigateToSignIn} style={styles.linkContainer}>
        <Text style={[styles.linkText, { color: theme.colors.primary }]}>
          Already have an account? Back to login
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;

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
