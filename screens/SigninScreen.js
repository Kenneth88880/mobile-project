import { StyleSheet, View, KeyboardAvoidingView } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
import TOSPopup from "../components/TOSPopup";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
const auth = getAuth();

const SigninScreen = () => {
  const theme = useTheme();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isTOSVisible, setTOSVisible] = React.useState(false);

  const handleSignUpPress = () => {
    setTOSVisible(true);
  };

  const handleAcceptTOS = () => {
    handleSignUp();
    setTOSVisible(false);
  };

  const handleDeclineTOS = () => {
    setTOSVisible(false);
  };

  // handles sign up
  const handleSignUp = () => {
    auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Signed up
        const user = userCredential.user;
        console.log("Registered with:", user.email);
        alert("Please Click the gear icon to set up your profile!");
        // ...
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode + errorMessage);
        alert("Sign up failed: " + errorMessage);
        // ..
      });
  };

  // handles sign in
  const handleSignIn = () => {
    auth()
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Signed in
        console.log("Logged in with:", userCredential.user.email);
        // ...
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        alert("Login failed: " + errorMessage);
        console.log(errorCode + errorMessage);
        // ..')
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
        onDecline={handleDeclineTOS}/>
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

        <Button
          mode="outlined"
          onPress={handleSignUpPress}
          style={styles.button}
        >
          Register
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

// the login/signup screen
export default SigninScreen;

// ✅ FIXED: Removed UID export - this doesn't work the way it was written
// Use auth().currentUser or the onAuthStateChanged listener in App.js instead

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
