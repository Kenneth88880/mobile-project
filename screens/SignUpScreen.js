import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
} from "react-native";
import React from "react";
import {
  TextInput,
  Button,
  useTheme,
  SegmentedButtons,
} from "react-native-paper";
import TOSPopup from "../components/TOSPopup";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import FirstNameScreen from "./SignUpProcess/FirstNameScreen";
import BirthdayScreen from "./SignUpProcess/BirthdayScreen";
import GenderScreen from "./SignUpProcess/GenderScreen";
import GenderPreferenceScreen from "./SignUpProcess/GenderPreferenceScreen";
import PhotoSelectionScreen from "./SignUpProcess/PhotoSelectionScreen";
import TagSelectionScreen from "./SignUpProcess/TagSelectionScreen";
import DuoSetupScreen from "./SignUpProcess/DuoSetupScreen";
import PhoneVerificationScreen from "./SignUpProcess/PhoneVerificationScreen";
import EmailVerificationScreen from "./SignUpProcess/EmailVerificationScreen";
import { CURRENT_USER_ID } from "../services/UserConfig";

const SignUpScreen = ({
  onNavigateToSignIn,
  isInSignupFlow = false,
  needsEmailVerification = false,
  userEmail = "",
}) => {
  const theme = useTheme();
  const [authMethod, setAuthMethod] = React.useState("phone"); // "email" or "phone"
  const [email, setEmail] = React.useState(userEmail);
  const [password, setPassword] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("+1");
  const [confirmation, setConfirmation] = React.useState(null);
  const [isTOSVisible, setTOSVisible] = React.useState(false);

  // Determine initial step based on signup flow state
  const getInitialStep = () => {
    if (needsEmailVerification) return "emailVerification";
    if (isInSignupFlow) return "firstName";
    return "credentials";
  };

  const [currentStep, setCurrentStep] = React.useState(getInitialStep());
  // credentials, emailVerification, phoneVerification, firstName, birthday, gender, genderPreference, photos, tags, duo
  const [signupData, setSignupData] = React.useState({
    firstName: "",
    birthday: {},
    gender: null,
    genderPreference: [],
    photos: [],
    tags: [],
    friendCode: "",
    setUp: false,
  });

  // If user needs email verification and we have their email, send email on mount
  React.useEffect(() => {
    if (
      needsEmailVerification &&
      userEmail &&
      currentStep === "emailVerification"
    ) {
      sendVerificationEmail();
    }
  }, []);

  const handleRegisterPress = () => {
    setTOSVisible(true);
  };

  const handleAcceptTOS = () => {
    if (authMethod === "email") {
      handleEmailRegister();
    } else {
      handlePhoneRegister();
    }
    setTOSVisible(false);
  };

  const handleDeclineTOS = () => {
    setTOSVisible(false);
  };

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

  // handles email sign up
  const handleEmailRegister = async () => {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;
      console.log("Registered with:", user.email);

      // Send verification email using Firebase's built-in method
      try {
        await sendVerificationEmail();
      } catch (emailError) {
        // Email sending failed, but user account was created
        // Error already shown in sendVerificationEmail, just proceed to verification screen
        console.log(
          "Continuing to verification screen despite email send error"
        );
      }

      // Move to email verification step even if email failed to send
      // User can try resending from the verification screen
      setCurrentStep("emailVerification");
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorCode + errorMessage);

      let userMessage = "Sign up failed: " + errorMessage;
      if (error.code === "auth/email-already-in-use") {
        userMessage =
          "This email is already registered. Please try signing in instead.";
      } else if (error.code === "auth/invalid-email") {
        userMessage = "Invalid email address. Please check and try again.";
      } else if (error.code === "auth/weak-password") {
        userMessage = "Password is too weak. Please use at least 6 characters.";
      }

      alert(userMessage);
    }
  };

  // Send email verification link
  const sendVerificationEmail = async () => {
    try {
      const user = auth().currentUser;
      if (user && !user.emailVerified) {
        // Configure action code settings for email verification
        const actionCodeSettings = {
          url: "https://doubly-messenging.firebaseapp.com", // Your Firebase hosting domain
          handleCodeInApp: false, // Opens in browser, not app
          iOS: {
            bundleId: "com.doublyconnections.doubly",
          },
        };

        await user.sendEmailVerification(actionCodeSettings);
        console.log("Verification email sent to", user.email);
      }
    } catch (error) {
      console.log("Error sending verification email:", error);

      let errorMessage = "Error sending verification email: " + error.message;

      if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Too many requests. Please wait a few minutes before trying again, or check your email - a verification link may have already been sent.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      }

      alert(errorMessage);
      throw error;
    }
  };

  // handles phone sign up (sends verification code)
  const handlePhoneRegister = async () => {
    try {
      // Disable app verification for development to avoid SMS limits and blocking
      if (__DEV__) {
        auth().settings.appVerificationDisabledForTesting = true;
      }

      const confirmationResult = await auth().signInWithPhoneNumber(
        phoneNumber
      );
      setConfirmation(confirmationResult);
      setCurrentStep("phoneVerification");
    } catch (error) {
      console.log("Phone sign up error:", error);
      alert("Failed to send verification code: " + error.message);
    }
  };

  const handlePhoneVerification = async (code) => {
    try {
      await confirmation.confirm(code);
      console.log("Phone verified successfully");
      // Move to first name step
      setCurrentStep("firstName");
    } catch (error) {
      console.log("Invalid verification code:", error);
      alert("Invalid verification code. Please try again.");
    }
  };

  const handlePhoneVerificationBack = () => {
    setCurrentStep("credentials");
    setConfirmation(null);
  };

  const handleEmailVerified = () => {
    console.log("Email verified, proceeding to profile setup");
    // Move to first name step
    setCurrentStep("firstName");
  };

  const handleEmailVerificationBack = async () => {
    // Sign out the user since they already created an account
    try {
      await auth().signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    // Go back to credentials screen
    setCurrentStep("credentials");
  };

  const handleFirstNameNext = (firstName) => {
    setSignupData({ ...signupData, firstName });
    setCurrentStep("birthday");
  };

  const handleFirstNameBack = async () => {
    // Sign out the user since they already created an account
    try {
      await auth().signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    // Reset verification state
    setConfirmation(null);
    // Always go back to credentials screen
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
      if (!signupData.firstName && signupData.setUp === false) {
        alert("Please enter your first name");
        setCurrentStep("firstName");
        return;
      }

      if ((!signupData.birthday || !signupData.birthday.age) && signupData.setUp === false) {
        alert("Please enter your birthday");
        setCurrentStep("birthday");
        return;
      }

      if ((!signupData.tags || signupData.tags.length < 3) && signupData.setUp === false) {
        alert("Please select at least 3 tags");
        setCurrentStep("tags");
        return;
      }

      if (!signupData.gender && signupData.setUp === false) {
        alert("Please select your gender");
        setCurrentStep("gender");
        return;
      }

      if (
        (!signupData.genderPreference ||
        signupData.genderPreference.length === 0) && signupData.setUp === false
      ) {
        alert("Please select at least one gender preference");
        setCurrentStep("genderPreference");
        return;
      }

      if ((!signupData.photos || signupData.photos.length === 0) && signupData.setUp === false) {
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
        setUp: true,
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
  if (currentStep === "phoneVerification") {
    return (
      <PhoneVerificationScreen
        onVerify={handlePhoneVerification}
        onBack={handlePhoneVerificationBack}
        phoneNumber={phoneNumber}
      />
    );
  }

  if (currentStep === "emailVerification") {
    return (
      <EmailVerificationScreen
        onVerified={handleEmailVerified}
        onBack={handleEmailVerificationBack}
        email={email}
        onResendEmail={sendVerificationEmail}
      />
    );
  }

  if (currentStep === "firstName" && signupData.setUp === false) {
    return (
      <FirstNameScreen
        onNext={handleFirstNameNext}
        onBack={handleFirstNameBack}
        initialName={signupData.firstName}
      />
    );
  }

  if (currentStep === "birthday" && signupData.setUp === false) {
    return (
      <BirthdayScreen
        onNext={handleBirthdayNext}
        onBack={handleBirthdayBack}
        initialBirthday={signupData.birthday}
      />
    );
  }

  if (currentStep === "gender" && signupData.setUp === false) {
    return (
      <GenderScreen
        onNext={handleGenderNext}
        onBack={handleGenderBack}
        initialGender={signupData.gender}
      />
    );
  }

  if (currentStep === "genderPreference" && signupData.setUp === false) {
    return (
      <GenderPreferenceScreen
        onNext={handleGenderPreferenceNext}
        onBack={handleGenderPreferenceBack}
        initialPreferences={signupData.genderPreference}
      />
    );
  }

  if (currentStep === "photos" && signupData.setUp === false) {
    return (
      <PhotoSelectionScreen
        onNext={handlePhotosNext}
        onBack={handlePhotosBack}
        initialPhotos={signupData.photos}
      />
    );
  }

  if (currentStep === "tags" && signupData.setUp === false) {
    return (
      <TagSelectionScreen
        onNext={handleTagsNext}
        onBack={handleTagsBack}
        initialTags={signupData.tags}
      />
    );
  }

  if (currentStep === "duo" && signupData.setUp === false) {
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
        <Button
          mode="contained"
          onPress={handleRegisterPress}
          style={styles.button}
        >
          Register
        </Button>
      </View>

      {!isInSignupFlow && (
        <TouchableOpacity
          onPress={onNavigateToSignIn}
          style={styles.linkContainer}
        >
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
