import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
} from "react-native";
import React from "react";
import { TextInput, Button, useTheme } from "react-native-paper";
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
import ContactEmailScreen from "./SignUpProcess/ContactEmailScreen";

const SignUpScreen = ({ onNavigateToSignIn, isInSignupFlow = false }) => {
  const theme = useTheme();
  const [phoneNumber, setPhoneNumber] = React.useState("+1");
  const [confirmation, setConfirmation] = React.useState(null);
  const [isTOSVisible, setTOSVisible] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  // If already in signup flow (resuming), start at firstName
  const getInitialStep = () => {
    if (isInSignupFlow) return "firstName";
    return "phone";
  };

  const [currentStep, setCurrentStep] = React.useState(getInitialStep());
  // Steps: phone, phoneVerification, firstName, birthday, gender,
  //        genderPreference, photos, tags, duo, contactEmail
  const [signupData, setSignupData] = React.useState({
    firstName: "",
    birthday: {},
    gender: null,
    genderPreference: [],
    photos: [],
    tags: [],
    friendCode: "",
    contactEmail: "",
    setUp: false,
  });

  // Maintain +1 prefix and limit to 10 digits
  const handlePhoneNumberChange = (text) => {
    if (!text.startsWith("+1")) {
      setPhoneNumber("+1");
      return;
    }
    const digitsOnly = text.slice(2).replace(/\D/g, "");
    const limitedDigits = digitsOnly.slice(0, 10);
    setPhoneNumber("+1" + limitedDigits);
  };

  const getAuthErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/invalid-phone-number":
        return "That's not a valid phone number. Please check and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a few minutes and try again.";
      case "auth/quota-exceeded":
        return "Our SMS service is temporarily unavailable. Please try again later.";
      case "auth/network-request-failed":
        return "No internet connection. Please check your network.";
      case "auth/missing-client-identifier":
        return "App verification failed. Please update the app and try again.";
      default:
        return "Failed to send verification code. Please try again.";
    }
  };

  const handleRegisterPress = () => {
    if (phoneNumber.length < 12) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    setTOSVisible(true);
  };

  const handleAcceptTOS = () => {
    setTOSVisible(false);
    handlePhoneRegister();
  };

  const handleDeclineTOS = () => {
    setTOSVisible(false);
  };

  // Send SMS verification code
  const handlePhoneRegister = async () => {
    setIsSending(true);
    try {
      if (__DEV__) {
        auth().settings.appVerificationDisabledForTesting = true;
      }
      const confirmationResult =
        await auth().signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirmationResult);
      setCurrentStep("phoneVerification");
    } catch (error) {
      console.log("Phone sign up error:", error.code, error.message, phoneNumber);
      alert(getAuthErrorMessage(error.code));
    } finally {
      setIsSending(false);
    }
  };

  // Handles code verification. If phone already has an account,
  // either welcome them back (complete profile) or resume setup (incomplete profile).
  const handlePhoneVerification = async (code) => {
    try {
      const userCredential = await confirmation.confirm(code);
      const isNewUser = userCredential.additionalUserInfo?.isNewUser ?? true;
      const uid = userCredential.user.uid;

      if (isNewUser) {
        // Fresh account - proceed to profile setup
        setCurrentStep("firstName");
        return;
      }

      // Existing phone number - check if profile is complete
      const profileDoc = await firestore()
        .collection("profiles")
        .doc(uid)
        .get();

      if (profileDoc.exists && profileDoc.data()?.setUp === true) {
        // Complete profile - they're already a user. App-level auth listener
        // will navigate to main screen since they're signed in.
        alert(
          "Welcome back! You already have an account with this phone number.",
        );
        return;
      }

      // Profile is incomplete - resume signup with existing data pre-filled
      if (profileDoc.exists) {
        const data = profileDoc.data();
        setSignupData({
          firstName: data.name || "",
          birthday: data.birthday || {},
          gender: data.gender || null,
          genderPreference: data.genderPreference || [],
          photos: data.photos || [],
          tags: data.tags || [],
          friendCode: "",
          contactEmail: data.contactEmail || "",
          setUp: false,
        });
      }
      setCurrentStep("firstName");
    } catch (error) {
      console.log("Verification error:", error.code);
      let message = "Invalid verification code. Please try again.";
      if (error.code === "auth/code-expired") {
        message = "Code expired. Please request a new one.";
      } else if (error.code === "auth/invalid-verification-code") {
        message = "Incorrect code. Please check and try again.";
      }
      alert(message);
      throw error;
    }
  };

  const handleResendCode = async () => {
    try {
      if (__DEV__) {
        auth().settings.appVerificationDisabledForTesting = true;
      }
      const confirmationResult =
        await auth().signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirmationResult);
    } catch (error) {
      console.log("Resend code error:", error.code);
      alert(getAuthErrorMessage(error.code));
      throw error;
    }
  };

  const handlePhoneVerificationBack = () => {
    setCurrentStep("phone");
    setConfirmation(null);
  };

  const handleFirstNameNext = (firstName) => {
    setSignupData({ ...signupData, firstName });
    setCurrentStep("birthday");
  };

  const handleFirstNameBack = async () => {
    // User is signed in via phone but hasn't completed profile.
    // Sign them out so they start fresh if they come back.
    try {
      await auth().signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    setConfirmation(null);
    setCurrentStep("phone");
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

  const handleDuoNext = (friendCode) => {
    // Store friend code in state and proceed to email step
    setSignupData({ ...signupData, friendCode });
    setCurrentStep("contactEmail");
  };

  const handleDuoSkip = () => {
    setSignupData({ ...signupData, friendCode: "" });
    setCurrentStep("contactEmail");
  };

  const handleContactEmailBack = () => {
    setCurrentStep("duo");
  };

  const handleContactEmailNext = async (contactEmail) => {
    await saveProfile(signupData.friendCode, contactEmail);
  };

  const handleContactEmailSkip = async () => {
    await saveProfile(signupData.friendCode, "");
  };

  const saveProfile = async (friendCode, contactEmail) => {
    try {
      // Validate required data
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
      if (!signupData.gender) {
        alert("Please select your gender");
        setCurrentStep("gender");
        return;
      }
      if (
        !signupData.genderPreference ||
        signupData.genderPreference.length === 0
      ) {
        alert("Please select at least one gender preference");
        setCurrentStep("genderPreference");
        return;
      }
      if (!signupData.photos || signupData.photos.length === 0) {
        alert("Please add at least one photo");
        setCurrentStep("photos");
        return;
      }
      if (!signupData.tags || signupData.tags.length < 3) {
        alert("Please select at least 3 tags");
        setCurrentStep("tags");
        return;
      }

      // Use live auth state - this is set by signInWithPhoneNumber/confirm
      const currentUser = auth().currentUser;
      if (!currentUser) {
        alert("Session expired. Please sign up again.");
        setCurrentStep("phone");
        return;
      }
      const userId = currentUser.uid;

      const profileData = {
        name: signupData.firstName,
        age: signupData.birthday.age.toString(),
        autoRenew: false,
        birthday: signupData.birthday,
        tags: signupData.tags,
        gender: signupData.gender,
        genderPreference: signupData.genderPreference,
        photos: signupData.photos,
        priceId: "",
        stripeCustomerId: "",
        subscriptionId: "",
        subscriptionStatus: "inactive",
        description: "",
        city: "",
        latitude: null,
        longitude: null,
        phoneNumber: currentUser.phoneNumber || phoneNumber,
        contactEmail: contactEmail || "",
        showOnlineStatus: true,
        createdAt: new Date().toISOString(),
        setUp: true,
        updatedAt: new Date().now(),
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
      // App-level auth listener will navigate to main screen
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
        onResend={handleResendCode}
        phoneNumber={phoneNumber}
      />
    );
  }

  if (currentStep === "firstName") {
    return (
      <FirstNameScreen
        onNext={handleFirstNameNext}
        onBack={handleFirstNameBack}
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

  if (currentStep === "contactEmail") {
    return (
      <ContactEmailScreen
        onNext={handleContactEmailNext}
        onSkip={handleContactEmailSkip}
        onBack={handleContactEmailBack}
        initialEmail={signupData.contactEmail}
      />
    );
  }

  // Default: phone entry screen
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

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Enter your phone number to get started
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          label="Phone Number"
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          mode="outlined"
          keyboardType="phone-pad"
          placeholder="+1 (123) 456-7890"
          style={styles.input}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleRegisterPress}
          style={styles.button}
          loading={isSending}
          disabled={isSending || phoneNumber.length < 12}
        >
          Continue
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
    marginBottom: 10,
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
  linkContainer: {
    marginTop: 20,
    padding: 10,
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
