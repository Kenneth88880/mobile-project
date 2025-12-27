import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
} from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
// ✅ FIXED: Use React Native Firebase
import auth from "@react-native-firebase/auth";

const SignInScreen = ({ onNavigateToRegister }) => {
  const theme = useTheme();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  // handles sign in
  const handleSignIn = () => {
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior="padding"
    >
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        Sign In
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
