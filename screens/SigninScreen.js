import { StyleSheet, View, KeyboardAvoidingView } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
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

  // handles sign up
  const handleSignUp = () => {
    createUserWithEmailAndPassword(auth, email, password)
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
        console.log("nope dumbass");
        // ..
      });
  };

  // handles sign in
  const handleSignIn = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        console.log("trying");
        //isLoggedIn = true;
        //console.log(isLoggedIn);
        const user = userCredential.user;
        console.log("Logged in with:", user.email);
        // ...
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        alert(errorCode + errorMessage);
        console.log(errorCode + errorMessage);
        console.log("nope dumbass");
        // ..')
      });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior="padding"
    >
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

        <Button mode="outlined" onPress={handleSignUp} style={styles.button}>
          Register
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

// the login/signup screen
export default SigninScreen;

// exports the UID once the user is logged in
export const UID = onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    console.log("UID from SigninScreen: " + uid);
    return uid;
  } else {
    // const uid = user.uid;
    console.log("No user is signed in");
    return null;
  }
});

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
