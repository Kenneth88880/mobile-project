import { StyleSheet } from "react-native";
import React from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import FirstNameScreen from "./SignUpProcess/FirstNameScreen";
import BirthdayScreen from "./SignUpProcess/BirthdayScreen";
import GenderScreen from "./SignUpProcess/GenderScreen";
import GenderPreferenceScreen from "./SignUpProcess/GenderPreferenceScreen";
import PhotoSelectionScreen from "./SignUpProcess/PhotoSelectionScreen";
import TagSelectionScreen from "./SignUpProcess/TagSelectionScreen";
import DuoSetupScreen from "./SignUpProcess/DuoSetupScreen";
import ContactEmailScreen from "./SignUpProcess/ContactEmailScreen";

/**
 * Profile setup flow. Runs only for users who have already:
 *   - Completed phone verification (via SignInScreen)
 *   - Accepted the TOS (via SignInScreen)
 *
 * This is entered exclusively from App.js when `user && !profileComplete`.
 * The old `phone`, `phoneVerification`, and `credentials` entry points have been
 * removed - phone + TOS are now handled entirely in SignInScreen.
 */
const SignUpScreen = () => {
  const [currentStep, setCurrentStep] = React.useState("firstName");
  // Steps: firstName -> birthday -> gender -> genderPreference ->
  //        photos -> tags -> duo -> contactEmail
  const [signupData, setSignupData] = React.useState({
    firstName: "",
    birthday: {},
    gender: null,
    genderPreference: [],
    photos: [],
    tags: [],
    friendCode: "",
    contactEmail: "",
  });

  // Pre-fill from existing partial profile on mount (if user previously started
  // signup but didn't finish)
  React.useEffect(() => {
    const loadPartialProfile = async () => {
      try {
        const user = auth().currentUser;
        if (!user) return;
        const profileDoc = await firestore()
          .collection("profiles")
          .doc(user.uid)
          .get();
        if (profileDoc.exists) {
          const data = profileDoc.data();
          setSignupData((prev) => ({
            ...prev,
            firstName: data.name || prev.firstName,
            birthday: data.birthday || prev.birthday,
            gender: data.gender || prev.gender,
            genderPreference: data.genderPreference || prev.genderPreference,
            photos: data.photos || prev.photos,
            tags: data.tags || prev.tags,
            contactEmail: data.contactEmail || prev.contactEmail,
          }));
        }
      } catch (error) {
        console.log("No existing partial profile to resume:", error.message);
      }
    };
    loadPartialProfile();
  }, []);

  const handleFirstNameNext = (firstName) => {
    setSignupData({ ...signupData, firstName });
    setCurrentStep("birthday");
  };

  const handleFirstNameBack = async () => {
    // User is backing out of profile setup entirely. Sign them out so they
    // start fresh if they come back later.
    try {
      await auth().signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleBirthdayNext = (birthday) => {
    setSignupData({ ...signupData, birthday });
    setCurrentStep("gender");
  };

  const handleBirthdayBack = () => setCurrentStep("firstName");

  const handleGenderNext = (gender) => {
    setSignupData({ ...signupData, gender });
    setCurrentStep("genderPreference");
  };

  const handleGenderBack = () => setCurrentStep("birthday");

  const handleGenderPreferenceNext = (genderPreference) => {
    setSignupData({ ...signupData, genderPreference });
    setCurrentStep("photos");
  };

  const handleGenderPreferenceBack = () => setCurrentStep("gender");

  const handlePhotosNext = (photos) => {
    setSignupData({ ...signupData, photos });
    setCurrentStep("tags");
  };

  const handlePhotosBack = () => setCurrentStep("genderPreference");

  const handleTagsNext = (tags) => {
    setSignupData({ ...signupData, tags });
    setCurrentStep("duo");
  };

  const handleTagsBack = () => setCurrentStep("photos");

  const handleDuoBack = () => setCurrentStep("tags");

  const handleDuoNext = (friendCode) => {
    setSignupData({ ...signupData, friendCode });
    setCurrentStep("contactEmail");
  };

  const handleDuoSkip = () => {
    setSignupData({ ...signupData, friendCode: "" });
    setCurrentStep("contactEmail");
  };

  const handleContactEmailBack = () => setCurrentStep("duo");

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

      const currentUser = auth().currentUser;
      if (!currentUser) {
        alert("Session expired. Please sign in again.");
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
        phoneNumber: currentUser.phoneNumber || "",
        contactEmail: contactEmail || "",
        showOnlineStatus: true,
        createdAt: new Date().toISOString(),
        setUp: true,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("profiles").doc(userId).set(profileData);

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
        }
      }

      console.log("Profile created successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(
        "Failed to save profile: " +
          (error?.message || error?.code || "Unknown error") +
          ". Please try again.",
      );
    }
  };

  // Render current step
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

  return null;
};

export default SignUpScreen;
