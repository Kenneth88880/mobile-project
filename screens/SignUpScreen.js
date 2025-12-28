import { StyleSheet, View, KeyboardAvoidingView, Text, TouchableOpacity } from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
import TOSPopup from "../components/TOSPopup";
// ✅ FIXED: Use React Native Firebase
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import FirstNameScreen from "./SignUpProcess/FirstNameScreen";
import BirthdayScreen from "./SignUpProcess/BirthdayScreen";
import GenderScreen from "./SignUpProcess/GenderScreen";
import GenderPreferenceScreen from "./SignUpProcess/GenderPreferenceScreen";
import PhotoSelectionScreen from "./SignUpProcess/PhotoSelectionScreen";
import TagSelectionScreen from "./SignUpProcess/TagSelectionScreen";
import DuoSetupScreen from "./SignUpProcess/DuoSetupScreen";
import { CURRENT_USER_ID } from "../services/UserConfig";

const SignUpScreen = ({ onNavigateToSignIn, isInSignupFlow = false }) => {
  const theme = useTheme();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isTOSVisible, setTOSVisible] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(
    isInSignupFlow ? "firstName" : "credentials"
  ); // credentials, firstName, birthday, gender, genderPreference, photos, tags, duo
  const [signupData, setSignupData] = React.useState({
    firstName: "",
    birthday: {},
    gender: null,
    genderPreference: [],
    photos: [],
    tags: [],
    friendCode: "",
  });

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
        // Move to first name step
        setCurrentStep("firstName");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode + errorMessage);
        alert("Sign up failed: " + errorMessage);
      });
  };

  const handleFirstNameNext = (firstName) => {
    setSignupData({ ...signupData, firstName });
    setCurrentStep("birthday");
  };

  const handleFirstNameBack = () => {
    setCurrentStep("credentials");
  };

  const handleBirthdayNext = (birthday) => {
    setSignupData({ ...signupData, birthday });
    setCurrentStep("gender");
  };

  const handleBirthdayBack = () => {
    setCurrentStep("firstName");
  };

  const handleGenderNext = (gender) => {
    setSignupData({ ...signupData, gender });
    setCurrentStep("genderPreference");
  };

  const handleGenderBack = () => {
    setCurrentStep("birthday");
  };

  const handleGenderPreferenceNext = (genderPreference) => {
    setSignupData({ ...signupData, genderPreference });
    setCurrentStep("photos");
  };

  const handleGenderPreferenceBack = () => {
    setCurrentStep("gender");
  };

  const handlePhotosNext = (photos) => {
    setSignupData({ ...signupData, photos });
    setCurrentStep("tags");
  };

  const handlePhotosBack = () => {
    setCurrentStep("genderPreference");
  };

  const handleTagsNext = (tags) => {
    setSignupData({ ...signupData, tags });
    setCurrentStep("duo");
  };

  const handleTagsBack = () => {
    setCurrentStep("photos");
  };

  const handleDuoBack = () => {
    setCurrentStep("tags");
  };

  const handleDuoNext = async (friendCode) => {
    // Save profile with all collected data
    await saveProfile(friendCode);
  };

  const handleDuoSkip = async () => {
    // Save profile without friend code
    await saveProfile("");
  };

  const saveProfile = async (friendCode) => {
    try {
      // Validate that all required data is present
      if (!signupData.firstName) {
        alert("Please enter your first name");
        setCurrentStep("firstName");
        return;
      }

      if (!signupData.birthday || !signupData.birthday.age) {
        alert("Please enter your birthday");
        setCurrentStep("birthday");
        return;
      }

      if (!signupData.tags || signupData.tags.length < 3) {
        alert("Please select at least 3 tags");
        setCurrentStep("tags");
        return;
      }

      if (!signupData.gender) {
        alert("Please select your gender");
        setCurrentStep("gender");
        return;
      }

      if (!signupData.genderPreference || signupData.genderPreference.length === 0) {
        alert("Please select at least one gender preference");
        setCurrentStep("genderPreference");
        return;
      }

      if (!signupData.photos || signupData.photos.length === 0) {
        alert("Please add at least one photo");
        setCurrentStep("photos");
        return;
      }

      const userId = CURRENT_USER_ID;

      if (!userId) {
        alert("User ID not found. Please try signing in again.");
        return;
      }

      const profileData = {
        name: signupData.firstName,
        age: signupData.birthday.age.toString(),
        tags: signupData.tags,
        gender: signupData.gender,
        genderPreference: signupData.genderPreference,
        photos: signupData.photos,
        description: "",
        city: "",
        latitude: null,
        longitude: null,
        showOnlineStatus: true,
        createdAt: new Date().toISOString(),
      };

      // Save profile to Firestore
      await firestore().collection("profiles").doc(userId).set(profileData);

      // If friend code provided, send duo request
      if (friendCode && friendCode.trim()) {
        try {
          await firestore().collection("duoRequests").add({
            fromUserId: userId,
            toUserId: friendCode.trim(),
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error sending duo request:", error);
          // Don't fail the whole signup if duo request fails
        }
      }

      console.log("Profile created successfully!");
      // The app will automatically navigate to main screen since user is now authenticated
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    }
  };

  // Render appropriate screen based on current step
  if (currentStep === "firstName") {
    return (
      <FirstNameScreen
        onNext={handleFirstNameNext}
        onBack={isInSignupFlow ? null : handleFirstNameBack}
        initialName={signupData.firstName}
      />
    );
  }

  if (currentStep === "birthday") {
    return (
      <BirthdayScreen
        onNext={handleBirthdayNext}
        onBack={handleBirthdayBack}
        initialBirthday={signupData.birthday}
      />
    );
  }

  if (currentStep === "gender") {
    return (
      <GenderScreen
        onNext={handleGenderNext}
        onBack={handleGenderBack}
        initialGender={signupData.gender}
      />
    );
  }

  if (currentStep === "genderPreference") {
    return (
      <GenderPreferenceScreen
        onNext={handleGenderPreferenceNext}
        onBack={handleGenderPreferenceBack}
        initialPreferences={signupData.genderPreference}
      />
    );
  }

  if (currentStep === "photos") {
    return (
      <PhotoSelectionScreen
        onNext={handlePhotosNext}
        onBack={handlePhotosBack}
        initialPhotos={signupData.photos}
      />
    );
  }

  if (currentStep === "tags") {
    return (
      <TagSelectionScreen
        onNext={handleTagsNext}
        onBack={handleTagsBack}
        initialTags={signupData.tags}
      />
    );
  }

  if (currentStep === "duo") {
    return (
      <DuoSetupScreen
        onNext={handleDuoNext}
        onSkip={handleDuoSkip}
        onBack={handleDuoBack}
      />
    );
  }

  // Default: credentials screen
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

      {!isInSignupFlow && (
        <TouchableOpacity onPress={onNavigateToSignIn} style={styles.linkContainer}>
          <Text style={[styles.linkText, { color: theme.colors.primary }]}>
            Already have an account? Back to login
          </Text>
        </TouchableOpacity>
      )}
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
